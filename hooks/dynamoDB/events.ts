/**
 * Calendar events and RSVPs. Event reminder/cancellation notifications live here.
 */

import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { getUserFamilyGroup, normalizeFamilyGroup } from '@/utils/demoConfig';
import { dynamoDB, TABLES } from './client';
import { getAllFamilyMembers } from './family';
import { getUserNameById } from './family';
import { createNotification, getNotificationsByUser } from './notifications';
import type { CalendarEventData } from './types';

function getDaysUntilEvent(eventStartDate: string): number | null {
  try {
    const eventDate = new Date(eventStartDate);
    const today = new Date();
    const eventMidnight = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate()
    );
    const todayMidnight = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const diffTime = eventMidnight.getTime() - todayMidnight.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error('❌ Error calculating days until event:', error);
    return null;
  }
}

export const saveRSVPToDynamoDB = async (
  eventId: string,
  userId: string,
  status: 'yes' | 'no' | 'maybe',
  eventCreatorId?: string
): Promise<void> => {
  try {
    await dynamoDB.send(
      new PutItemCommand({
        TableName: TABLES.EVENT_RSVP,
        Item: {
          rsvp_id: { S: eventId },
          user_id: { S: userId },
          status: { S: status },
        },
      })
    );

    if (eventCreatorId && eventCreatorId !== userId) {
      try {
        const rsvpPersonName = await getUserNameById(userId);
        const rsvpPersonDisplayName = rsvpPersonName
          ? `${rsvpPersonName.firstName} ${rsvpPersonName.lastName}`
          : 'Someone';
        const statusText =
          status === 'yes'
            ? 'is attending'
            : status === 'maybe'
              ? 'might attend'
              : 'cannot attend';
        await createNotification(
          eventCreatorId,
          'event_rsvp',
          'New RSVP for your event',
          `${rsvpPersonDisplayName} ${statusText} your event`,
          eventId,
          { rsvp_user_id: userId, rsvp_status: status }
        );
      } catch (notificationError) {
        console.error('❌ Error creating event RSVP notification:', notificationError);
      }
    }
  } catch (error) {
    console.error('❌ Error saving RSVP to DynamoDB:', error);
    throw error;
  }
};

export async function getRSVPStatus(
  eventId: string,
  userId: string
): Promise<'yes' | 'no' | 'maybe' | null> {
  try {
    const data = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.EVENT_RSVP,
        Key: { rsvp_id: { S: eventId }, user_id: { S: userId } },
      })
    );
    if (data.Item?.status?.S) {
      const status = data.Item.status.S;
      if (status === 'yes' || status === 'no' || status === 'maybe') return status;
    }
    return null;
  } catch (error) {
    console.error('❌ Error fetching RSVP status:', error);
    return null;
  }
}

export async function getEventRSVPs(
  eventId: string
): Promise<Array<{ userId: string; status: 'yes' | 'no' | 'maybe' }>> {
  try {
    const response = await dynamoDB.send(
      new ScanCommand({
        TableName: TABLES.EVENT_RSVP,
        FilterExpression: 'rsvp_id = :eventId',
        ExpressionAttributeValues: { ':eventId': { S: eventId } },
      })
    );
    if (!response.Items) return [];
    return response.Items.map((item) => {
      const userId = item.user_id?.S;
      const status = item.status?.S;
      if (
        typeof userId === 'string' &&
        (status === 'yes' || status === 'no' || status === 'maybe')
      ) {
        return { userId, status };
      }
      return null;
    }).filter(
      (item): item is { userId: string; status: 'yes' | 'no' | 'maybe' } =>
        item !== null
    );
  } catch (error) {
    console.error('❌ Error fetching event RSVPs:', error);
    return [];
  }
}

export async function getUserRSVPs(
  userId: string
): Promise<Array<{ eventId: string; status: 'yes' | 'no' | 'maybe' }>> {
  try {
    const response = await dynamoDB.send(
      new ScanCommand({
        TableName: TABLES.EVENT_RSVP,
        FilterExpression: 'user_id = :userId',
        ExpressionAttributeValues: { ':userId': { S: userId } },
      })
    );
    if (!response.Items) return [];
    return response.Items.map((item) => {
      const eventId = item.rsvp_id?.S;
      const status = item.status?.S;
      if (
        typeof eventId === 'string' &&
        (status === 'yes' || status === 'no' || status === 'maybe')
      ) {
        return { eventId, status };
      }
      return null;
    }).filter(
      (item): item is { eventId: string; status: 'yes' | 'no' | 'maybe' } =>
        item !== null
    );
  } catch (error) {
    console.error('❌ Error fetching user RSVPs:', error);
    return [];
  }
}

export async function deleteRSVPFromDynamoDB(
  eventId: string,
  userId: string
): Promise<void> {
  try {
    await dynamoDB.send(
      new DeleteItemCommand({
        TableName: TABLES.EVENT_RSVP,
        Key: { rsvp_id: { S: eventId }, user_id: { S: userId } },
      })
    );
  } catch (error) {
    console.error('❌ Error deleting RSVP from DynamoDB:', error);
    throw error;
  }
}

export const saveEventToDynamoDB = async (
  event: CalendarEventData,
  userId?: string
): Promise<void> => {
  try {
    const eventUserId = event.userId || userId || '';
    const familyGroup = userId ? getUserFamilyGroup(userId) : '';

    const item: Record<string, import('@aws-sdk/client-dynamodb').AttributeValue> = {
      event_id: { S: event.id },
      title: { S: event.title },
      start: { S: event.start },
      user_id: { S: eventUserId },
      family_group: { S: familyGroup },
      created_at: { S: new Date().toISOString() },
    };
    if (event.end) item.end = { S: event.end };
    if (event.allDay !== undefined) item.all_day = { BOOL: event.allDay };
    if (event.backgroundColor) item.background_color = { S: event.backgroundColor };
    if (event.borderColor) item.border_color = { S: event.borderColor };
    if (event.textColor) item.text_color = { S: event.textColor };
    if (event.location) item.location = { S: event.location };
    if (event.description) item.description = { S: event.description };
    if (event.createdBy) item.created_by = { S: event.createdBy };
    if (event.category) item.category = { S: event.category };
    if (event.rrule) {
      const r: Record<string, import('@aws-sdk/client-dynamodb').AttributeValue> = {
        freq: { S: event.rrule.freq },
      };
      if (event.rrule.interval !== undefined) r.interval = { N: String(event.rrule.interval) };
      if (event.rrule.byweekday?.length)
        r.byweekday = { L: event.rrule.byweekday.map((d) => ({ N: String(d) })) };
      if (event.rrule.until) r.until = { S: event.rrule.until };
      item.rrule = { M: r };
    }

    await dynamoDB.send(new PutItemCommand({ TableName: TABLES.EVENTS, Item: item }));
  } catch (error) {
    console.error('❌ Error saving event to DynamoDB:', error);
    throw error;
  }
};

export const getEventsFromDynamoDB = async (
  userId?: string
): Promise<CalendarEventData[]> => {
  try {
    const userFamilyGroup = userId ? getUserFamilyGroup(userId) : '';
    const response = await dynamoDB.send(new ScanCommand({ TableName: TABLES.EVENTS }));

    if (!response.Items) return [];

    return response.Items.map((item) => {
      try {
        const event: CalendarEventData = {
          id: item.event_id?.S || '',
          title: item.title?.S || '',
          start: item.start?.S || '',
          userId: item.user_id?.S,
          createdBy: item.created_by?.S,
          category: item.category?.S as CalendarEventData['category'],
        };
        if (item.end?.S) event.end = item.end.S;
        if (item.all_day?.BOOL !== undefined) event.allDay = item.all_day.BOOL;
        if (item.background_color?.S) event.backgroundColor = item.background_color.S;
        if (item.border_color?.S) event.borderColor = item.border_color.S;
        if (item.text_color?.S) event.textColor = item.text_color.S;
        if (item.location?.S) event.location = item.location.S;
        if (item.description?.S) event.description = item.description.S;
        if (item.rrule?.M) {
          const rrule = item.rrule.M;
          event.rrule = {
            freq: (rrule.freq?.S || 'yearly') as 'daily' | 'weekly' | 'monthly' | 'yearly',
            interval: rrule.interval?.N ? parseInt(rrule.interval.N) : undefined,
            byweekday: rrule.byweekday?.L
              ? rrule.byweekday.L.map((d: { N?: string }) => parseInt(d.N || '0'))
              : undefined,
            until: rrule.until?.S,
          };
        }
        const eventFamilyGroup = normalizeFamilyGroup(item.family_group?.S);
        if (userFamilyGroup === 'demo') {
          return eventFamilyGroup === 'demo' ? event : null;
        }
        return eventFamilyGroup !== 'demo' ? event : null;
      } catch (error) {
        console.error('Error parsing event:', error);
        return null;
      }
    }).filter((event): event is CalendarEventData => event !== null);
  } catch (error) {
    console.error('❌ Error fetching events from DynamoDB:', error);
    return [];
  }
};

export const deleteEventFromDynamoDB = async (eventId: string): Promise<void> => {
  try {
    await dynamoDB.send(
      new DeleteItemCommand({
        TableName: TABLES.EVENTS,
        Key: { event_id: { S: eventId } },
      })
    );
  } catch (error) {
    console.error('❌ Error deleting event from DynamoDB:', error);
    throw error;
  }
};

export const generateEventReminderNotifications = async (
  events: Array<{ id?: string; title: string; start: string }>
): Promise<void> => {
  try {
    const familyMembers = await getAllFamilyMembers();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const member of familyMembers) {
      const userRSVPs = await getUserRSVPs(member.family_member_id);
      const relevantRSVPs = userRSVPs.filter(
        (rsvp) => rsvp.status === 'yes' || rsvp.status === 'maybe'
      );

      for (const rsvp of relevantRSVPs) {
        const event = events.find((e) => e.id === rsvp.eventId);
        if (!event?.start) continue;

        const daysUntilEvent = getDaysUntilEvent(event.start);
        if (daysUntilEvent === null || daysUntilEvent < 0) continue;

        const reminderDays = [30, 7, 1, 0];
        if (!reminderDays.includes(daysUntilEvent)) continue;

        const existingNotifications = await getNotificationsByUser(member.family_member_id);
        const todayStart = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        ).toISOString();
        const alreadyNotified = existingNotifications.some(
          (n) =>
            n.type === 'event_reminder' &&
            n.related_id === rsvp.eventId &&
            (n.metadata as { days_until?: number })?.days_until === daysUntilEvent &&
            n.created_at >= todayStart
        );

        if (!alreadyNotified) {
          const message =
            daysUntilEvent === 0
              ? `${event.title} is today!`
              : daysUntilEvent === 1
                ? `${event.title} is tomorrow!`
                : `${event.title} is in ${daysUntilEvent} days`;
          await createNotification(
            member.family_member_id,
            'event_reminder',
            `Upcoming Event: ${event.title}`,
            message,
            rsvp.eventId,
            { days_until: daysUntilEvent }
          );
        }
      }
    }
  } catch (error) {
    console.error('❌ Error generating event reminder notifications:', error);
    throw error;
  }
};

export const sendEventCancellationNotifications = async (
  eventId: string,
  eventTitle: string
): Promise<void> => {
  try {
    const eventRSVPs = await getEventRSVPs(eventId);
    const relevantRSVPs = eventRSVPs.filter(
      (rsvp) => rsvp.status === 'yes' || rsvp.status === 'maybe'
    );

    for (const rsvp of relevantRSVPs) {
      try {
        await createNotification(
          rsvp.userId,
          'event_cancelled',
          'Event Cancelled',
          `"${eventTitle}" has been cancelled`,
          eventId,
          { event_title: eventTitle }
        );
      } catch (notificationError) {
        console.error(
          `❌ Error creating cancellation notification for user ${rsvp.userId}:`,
          notificationError
        );
      }
    }
  } catch (error) {
    console.error('❌ Error sending event cancellation notifications:', error);
    throw error;
  }
};
