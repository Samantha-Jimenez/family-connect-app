import React, { useEffect, useState } from 'react';
import { useCalendar } from '@/context/CalendarContext';
import { getUserRSVPs } from '@/hooks/dynamoDB';

interface Event {
  id?: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  location?: string;
  category?: 'birthday' | 'holiday' | 'family-event' | 'appointment';
  rrule?: {
    freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    byweekday?: number[];
    until?: string;
  };
}

const RSVP = ({ userId }: { userId: string }) => {
  const { events } = useCalendar() as { events: Event[] };
  const [upcomingRSVPEvents, setUpcomingRSVPEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to get the next occurrence of an event (same as in UpcomingEvents)
  const getNextOccurrence = (event: Event) => {
    const eventStart = new Date(event.start);
    const now = new Date();

    if (!event.rrule) {
      return eventStart >= now ? eventStart : null;
    }

    if (event.rrule.freq === 'weekly') {
      const dayOfWeek = eventStart.getDay();
      const nextDate = new Date();
      while (nextDate.getDay() !== dayOfWeek) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      nextDate.setHours(eventStart.getHours());
      nextDate.setMinutes(eventStart.getMinutes());
      return nextDate;
    }

    return eventStart;
  };

  useEffect(() => {
    const fetchRSVPEvents = async () => {
      setLoading(true);
      const userRSVPs = await getUserRSVPs(userId);
      const rsvpEventIds = userRSVPs.map(rsvp => rsvp.eventId);

      // Filter events to only those RSVP'd and upcoming
      const filtered = (events || [])
        .filter(event => event.id && rsvpEventIds.includes(event.id))
        .filter(event => {
          const next = getNextOccurrence(event);
          return next && next >= new Date();
        })
        .sort((a, b) => {
          const aNext = getNextOccurrence(a);
          const bNext = getNextOccurrence(b);
          return (aNext?.getTime() || 0) - (bNext?.getTime() || 0);
        });

      setUpcomingRSVPEvents(filtered);
      setLoading(false);
    };

    if (userId && events) {
      fetchRSVPEvents();
    }
  }, [userId, events]);

  if (loading) {
    return <div>Loading RSVP'd events...</div>;
  }

  if (upcomingRSVPEvents.length === 0) {
    return <div>No upcoming RSVP'd events.</div>;
  }

  console.log('upcomingRSVPEvents', upcomingRSVPEvents);

  return (
    <div>
      <h2 className="text-lg font-bold mb-2">Your Upcoming RSVP'd Events</h2>
      <ul className="space-y-2">
        {upcomingRSVPEvents.map(event => (
          <li key={event.id || event.start} className="p-3 bg-blue-50 rounded">
            <div className="font-medium">{event.title}</div>
            <div className="text-sm text-gray-600">
              {new Date(event.start).toLocaleString()}
            </div>
            {event.location && (
              <div className="text-xs text-gray-500">📍 {event.location}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RSVP;