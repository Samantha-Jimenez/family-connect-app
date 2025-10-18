import React, { useEffect, useState } from 'react';
import { useCalendar } from '@/context/CalendarContext';
import { getUserRSVPs } from '@/hooks/dynamoDB';
import Link from 'next/link';
import LoadSpinner from '@/components/LoadSpinner';

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
      // Only include events RSVP'd as 'yes' or 'maybe'
      const rsvpEventIds = userRSVPs
        .filter(rsvp => rsvp.status === 'yes' || rsvp.status === 'maybe')
        .map(rsvp => rsvp.eventId);

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
    return (
      <div className="card bg-yellow-800/20 text-black shadow-lg p-4 col-span-1 col-start-1 h-min">
        <h2 className="text-xl mb-2">Upcoming RSVP'd Events</h2>
        <div className="flex justify-center items-center py-8">
          <LoadSpinner size={48} />
        </div>
      </div>
    );
  }

  if (upcomingRSVPEvents.length === 0) {
    return <div>No upcoming RSVP'd events.</div>;
  }

  return (
    <div className="card bg-yellow-800/20 text-black shadow-lg p-4 col-span-1 col-start-1 h-min">
      <h2 className="text-xl mb-2">Upcoming RSVP'd Events</h2>
      <ul className="space-y-2">
        {upcomingRSVPEvents.map(event => (
          <li key={event.id || event.start} className="p-2 bg-white rounded justify-between w-full flex">
            <div className="font-medium">{event.title}</div>
            <div className="text-sm text-gray-600">
              {(() => {
                const date = new Date(event.start);
                // Check if all-day: either event.allDay is true, or time is 00:00:00.000Z
                const isAllDay = event.allDay || event.start.endsWith('T00:00:00.000Z');
                return isAllDay
                  ? date.toLocaleDateString()
                  : `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
              })()}
            </div>
            {event.location && (
              <div className="text-xs text-gray-500">📍 {event.location}</div>
            )}
          </li>
        ))}
      </ul>
      <Link href="/calendar">
        <button className="btn btn-outline mt-4 bg-[#717568] text-white border-0 w-full hover:bg-[#717568]/80">Calendar</button>
      </Link>
    </div>
  );
};

export default RSVP;