import React, { useEffect, useState } from 'react'
import { useCalendar } from '@/context/CalendarContext'
import { useRouter } from 'next/navigation'
import { getRSVPStatus } from '@/hooks/dynamoDB'
import { getCurrentUser } from 'aws-amplify/auth'

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
  rsvpStatus?: 'yes' | 'no' | 'maybe' | null;
}

const PastEvents = () => {
  const { events } = useCalendar() as { events: Event[] };
  const router = useRouter();

  // RSVP state
  const [rsvpStatuses, setRsvpStatuses] = useState<Record<string, 'yes' | 'no' | 'maybe' | null>>({});
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch current user ID on mount
  useEffect(() => {
    getCurrentUser()
      .then(user => setUserId(user.userId))
      .catch(() => setUserId(null));
  }, []);

  // Fetch RSVP statuses for the past events
  useEffect(() => {
    if (!userId || !events) return;

    const fetchRSVPs = async () => {
      const eventIds = events.map(e => e.id).filter(Boolean) as string[];
      const statusMap: Record<string, 'yes' | 'no' | 'maybe' | null> = {};
      await Promise.all(
        eventIds.map(async (eventId) => {
          const status = await getRSVPStatus(eventId, userId);
          statusMap[eventId] = status;
        })
      );
      setRsvpStatuses(statusMap);
    };

    fetchRSVPs();
  }, [userId, events]);

  // Function to get the last occurrence of a recurring event
  const getLastOccurrence = (event: Event) => {
    const eventStart = new Date(event.start);
    const now = new Date();
    
    if (!event.rrule) {
      // For non-recurring events, only show them if they're in the past
      return eventStart < now ? eventStart : null;
    }

    // Handle weekly events
    if (event.rrule.freq === 'weekly') {
      const dayOfWeek = eventStart.getDay();
      const lastDate = new Date(now);
      
      // Find the previous occurrence of the weekday
      while (lastDate.getDay() !== dayOfWeek) {
        lastDate.setDate(lastDate.getDate() - 1);
      }
      
      // Set the same time as the original event
      lastDate.setHours(eventStart.getHours());
      lastDate.setMinutes(eventStart.getMinutes());
      
      return lastDate < now ? lastDate : null;
    }

    return eventStart < now ? eventStart : null;
  };

  const sortedEvents: (Event & { lastOccurrence: Date | null })[] = (events || [])
    .map(event => ({
      ...event,
      lastOccurrence: getLastOccurrence(event),
    }))
    .filter(event => event.lastOccurrence !== null)
    .sort((a, b) => b.lastOccurrence!.getTime() - a.lastOccurrence!.getTime()) // Reverse sort for past events
    .slice(0, 5);

  const formatDate = (date: Date) => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    const dateString = localDate.toDateString();
    
    if (dateString === yesterday.toDateString()) {
      return `Yesterday, ${localDate.toLocaleTimeString('en-US', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`;
    }
    
    return localDate.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleEventClick = (event: Event) => {
    router.push('/calendar');
  };

  // Use RSVP status from state
  const getRSVPSymbol = (eventId?: string) => {
    if (!eventId) return null;
    const status = rsvpStatuses[eventId];
    if (status === 'yes' || status === 'no' || status === 'maybe') {
      return (
        <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap mb-auto
          ${status === 'yes' ? 'bg-green-200 text-green-800' : ''}
          ${status === 'maybe' ? 'bg-blue-200 text-blue-800' : ''}
          ${status === 'no' ? 'bg-red-200 text-red-800' : ''}
        `}>
          RSVP'd: {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="card bg-white text-black p-4 xl:p-6 shadow-md">
      <h1 className="text-xl flex items-center gap-2">
        Past Events
      </h1>
      <div className="mt-4 space-y-1">
        {sortedEvents.length > 0 ? (
          sortedEvents.map((event) => { 
            const hasRSVP = !!rsvpStatuses[event.id || ''];
            return (
              <div 
                key={event.id || event.start} 
                className={`flex items-center justify-between p-2 rounded-lg hover:bg-yellow-800/5 transition-colors cursor-pointer
                  ${hasRSVP ? 'bg-gray-100' : ''}
                `}
                onClick={() => handleEventClick(event)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleEventClick(event);
                  }
                }}
              >
                <div className="flex-1">
                  <h2 className="text-gray-900 flex items-center">
                    {event.title}
                    {getRSVPSymbol(event.id)}
                  </h2>
                  <p className="text-sm text-gray-600">{formatDate(event.lastOccurrence!)}</p>
                  {event.location && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <span>📍</span> {event.location}
                    </p>
                  )}
                </div>
                {event.rrule && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Recurring
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500">No past events</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PastEvents;