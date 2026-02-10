/**
 * Notifications table and birthday notification generation.
 * Event reminder/cancellation notifications live in events.ts (they use RSVP/event APIs).
 */

import {
  DeleteItemCommand,
  PutItemCommand,
  ScanCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDB, TABLES } from './client';
import { getAllFamilyMembers } from './family';
import type { Notification, NotificationType } from './types';

function getDaysUntilBirthday(birthday: string): number | null {
  if (!birthday) return null;
  try {
    const dateStr = birthday.split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!month || !day) return null;
    const today = new Date();
    const currentYear = today.getFullYear();
    const thisYearBirthday = new Date(currentYear, month - 1, day);
    const nextBirthday =
      thisYearBirthday < today
        ? new Date(currentYear + 1, month - 1, day)
        : thisYearBirthday;
    const diffTime = nextBirthday.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error('❌ Error calculating days until birthday:', error);
    return null;
  }
}

export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  relatedId?: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  try {
    const notificationId = uuidv4();
    const timestamp = new Date().toISOString();

    const item: Record<string, import('@aws-sdk/client-dynamodb').AttributeValue> = {
      notification_id: { S: notificationId },
      user_id: { S: userId },
      type: { S: type },
      title: { S: title },
      message: { S: message },
      is_read: { BOOL: false },
      created_at: { S: timestamp },
    };

    if (relatedId) item.related_id = { S: relatedId };
    if (metadata && Object.keys(metadata).length > 0) {
      const m: Record<string, import('@aws-sdk/client-dynamodb').AttributeValue> = {};
      Object.entries(metadata).forEach(([key, value]) => {
        if (typeof value === 'string') m[key] = { S: value };
        else if (typeof value === 'number') m[key] = { N: String(value) };
        else if (typeof value === 'boolean') m[key] = { BOOL: value };
      });
      item.metadata = { M: m };
    }

    await dynamoDB.send(
      new PutItemCommand({ TableName: TABLES.NOTIFICATIONS, Item: item })
    );
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
};

export const getNotificationsByUser = async (
  userId: string
): Promise<Notification[]> => {
  try {
    const response = await dynamoDB.send(
      new ScanCommand({
        TableName: TABLES.NOTIFICATIONS,
        FilterExpression: 'user_id = :userId',
        ExpressionAttributeValues: { ':userId': { S: userId } },
      })
    );

    if (!response.Items) return [];

    return response.Items.map((item) => {
      const metadata = item.metadata?.M
        ? Object.keys(item.metadata.M).reduce(
            (acc, key) => {
              const value = item.metadata!.M![key];
              if (value.S) acc[key] = value.S;
              else if (value.N) acc[key] = Number(value.N);
              else if (value.BOOL !== undefined) acc[key] = value.BOOL;
              return acc;
            },
            {} as Record<string, string | number | boolean>
          )
        : undefined;
      return {
        notification_id: item.notification_id?.S || '',
        user_id: item.user_id?.S || '',
        type: (item.type?.S || 'birthday') as NotificationType,
        title: item.title?.S || '',
        message: item.message?.S || '',
        is_read: item.is_read?.BOOL ?? false,
        created_at: item.created_at?.S || '',
        related_id: item.related_id?.S,
        metadata,
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    return [];
  }
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const notifications = await getNotificationsByUser(userId);
    return notifications.filter((n) => !n.is_read).length;
  } catch (error) {
    console.error('❌ Error getting unread notification count:', error);
    return 0;
  }
};

export const markNotificationAsRead = async (
  notificationId: string,
  userId: string
): Promise<void> => {
  try {
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.NOTIFICATIONS,
        Key: { notification_id: { S: notificationId } },
        UpdateExpression: 'SET is_read = :read',
        ConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: { ':read': { BOOL: true }, ':userId': { S: userId } },
      })
    );
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    throw error;
  }
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const notifications = await getNotificationsByUser(userId);
    const unread = notifications.filter((n) => !n.is_read);
    for (const n of unread) {
      await markNotificationAsRead(n.notification_id, userId);
    }
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    throw error;
  }
};

export const deleteNotification = async (
  notificationId: string,
  userId: string
): Promise<void> => {
  try {
    await dynamoDB.send(
      new DeleteItemCommand({
        TableName: TABLES.NOTIFICATIONS,
        Key: { notification_id: { S: notificationId } },
        ConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: { ':userId': { S: userId } },
      })
    );
  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    throw error;
  }
};

export const deleteAllReadNotifications = async (userId: string): Promise<void> => {
  try {
    const notifications = await getNotificationsByUser(userId);
    const read = notifications.filter((n) => n.is_read);
    for (const n of read) {
      await deleteNotification(n.notification_id, userId);
    }
  } catch (error) {
    console.error('❌ Error deleting all read notifications:', error);
    throw error;
  }
};

export const generateBirthdayNotifications = async (): Promise<void> => {
  try {
    const familyMembers = await getAllFamilyMembers();
    const today = new Date();

    for (const member of familyMembers) {
      if (!member.birthday || member.death_date) continue;
      const daysUntilBirthday = getDaysUntilBirthday(member.birthday);
      if (daysUntilBirthday === null || daysUntilBirthday < 0) continue;

      const reminderDays = [30, 7, 1, 0];
      if (!reminderDays.includes(daysUntilBirthday)) continue;

      for (const otherMember of familyMembers) {
        if (otherMember.family_member_id === member.family_member_id) continue;

        const memberName =
          member.use_nick_name && member.nick_name
            ? member.nick_name
            : member.use_middle_name && member.middle_name
              ? member.middle_name
              : member.first_name;
        const daysText =
          daysUntilBirthday === 0
            ? 'today'
            : daysUntilBirthday === 1
              ? 'tomorrow'
              : `in ${daysUntilBirthday} days`;
        const title = `${memberName} ${member.last_name}'s Birthday`;
        const message = `${memberName} ${member.last_name}'s birthday is ${daysText}! 🎂`;

        const existingNotifications = await getNotificationsByUser(
          otherMember.family_member_id
        );
        const todayStart = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        ).toISOString();
        const alreadyNotified = existingNotifications.some(
          (n) =>
            n.type === 'birthday' &&
            n.related_id === member.family_member_id &&
            (n.metadata as { days_until?: number })?.days_until === daysUntilBirthday &&
            n.created_at >= todayStart
        );

        if (!alreadyNotified) {
          await createNotification(
            otherMember.family_member_id,
            'birthday',
            title,
            message,
            member.family_member_id,
            { days_until: daysUntilBirthday }
          );
        }
      }
    }
  } catch (error) {
    console.error('❌ Error generating birthday notifications:', error);
    throw error;
  }
};
