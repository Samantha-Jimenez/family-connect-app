import React from 'react'
import { useCalendar } from '@/context/CalendarContext'
import { useRouter } from 'next/navigation'

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

  const getRSVPSymbol = (status: Event['rsvpStatus']) => {
    if (status === 'yes' || status === 'no' || status === 'maybe') {
      return (
        <span className="ml-2 text-xs font-semibold bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
          RSVP'd
        </span>
      );
    }
    return null;
  };

  return (
    <div className="card bg-white text-black p-6 shadow-md">
      <h2 className="text-xl font-bold flex items-center gap-2">
        Past Events
      </h2>
      <div className="mt-4 space-y-4">
        {sortedEvents.length > 0 ? (
          sortedEvents.map((event) => {
            const hasRSVP = !!event.rsvpStatus;
            return (
              <div 
                key={event.id || event.start} 
                className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer
                  ${hasRSVP ? 'bg-blue-50' : ''}
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
                  <p className="font-medium text-gray-900 flex items-center">
                    {event.title}
                    {getRSVPSymbol(event.rsvpStatus)}
                  </p>
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