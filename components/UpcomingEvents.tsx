import React, { useEffect, useState } from 'react'
import { useCalendar } from '@/context/CalendarContext'
import { useRouter, useSearchParams } from 'next/navigation'
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
  rsvpStatus?: 'yes' | 'no' | 'maybe';
}

const UpcomingEvents = () => {
  const { events } = useCalendar();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventIdFromQuery = searchParams.get('eventId');

  // Add RSVP state
  const [rsvpStatuses, setRsvpStatuses] = useState<Record<string, 'yes' | 'no' | 'maybe' | null>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [modalMode, setModalMode] = useState<'edit' | 'view'>('view');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch current user ID on mount
  useEffect(() => {
    getCurrentUser()
      .then(user => setUserId(user.userId))
      .catch(() => setUserId(null));
  }, []);

  // Fetch RSVP statuses for the upcoming events
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

  // Function to get the next occurrence of a recurring event
  const getNextOccurrence = (event: Event) => {
    const eventStart = new Date(event.start);
    
    if (!event.rrule) {
      // For non-recurring events, only show them if they're in the future
      const now = new Date();
      return eventStart >= now ? eventStart : null;
    }

    // Handle weekly events
    if (event.rrule.freq === 'weekly') {
      const dayOfWeek = eventStart.getDay();
      const nextDate = new Date();
      
      // Find the next occurrence of the weekday
      while (nextDate.getDay() !== dayOfWeek) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      
      // Set the same time as the original event
      nextDate.setHours(eventStart.getHours());
      nextDate.setMinutes(eventStart.getMinutes());
      
      return nextDate;
    }

    return eventStart;
  };

  // Update getRSVPSymbol to use RSVP status from state
  const getRSVPSymbol = (eventId?: string) => {
    if (!eventId) return null;
    const status = rsvpStatuses[eventId];
    if (status === 'yes' || status === 'no' || status === 'maybe') {
      return (
        <span
          className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap mb-auto
            ${status === 'yes' ? 'bg-green-200 text-green-800' : ''}
            ${status === 'maybe' ? 'bg-blue-200 text-blue-800' : ''}
            ${status === 'no' ? 'bg-red-200 text-red-800' : ''}
          `}
        >
          RSVP'd: {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      );
    }
    return null;
  };

  const sortedEvents: (Event & { nextOccurrence: Date | null })[] = (events || [])
    .map(event => ({
      ...event,
      nextOccurrence: getNextOccurrence(event),
    }))
    .filter(event => event.nextOccurrence !== null)
    .sort((a, b) => a.nextOccurrence!.getTime() - b.nextOccurrence!.getTime())
    .slice(0, 5);

  const formatDate = (date: Date) => {
    // Create dates in local timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Adjust the event date to local timezone
    const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    const dateString = localDate.toDateString();
    
    // Check if the event is today or tomorrow
    if (dateString === today.toDateString()) {
      return `Today, ${localDate.toLocaleTimeString('en-US', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`;
    } else if (dateString === tomorrow.toDateString()) {
      return `Tomorrow, ${localDate.toLocaleTimeString('en-US', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`;
    }
    
    // For other dates, show the full date and time
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
    if (event.id) {
      router.push(`/calendar?eventId=${event.id}`);
    } else {
      router.push(`/calendar`);
    }
  };

  useEffect(() => {
    if (eventIdFromQuery && events.length > 0) {
      const foundEvent = events.find(e => e.id === eventIdFromQuery);
      if (foundEvent) {
        setSelectedEvent(foundEvent);
        setModalMode('edit');
        setIsModalOpen(true);
      }
    }
  }, [eventIdFromQuery, events]);

  return (
    <div className="card bg-white text-black p-4 xl:p-6 shadow-md">
      <h1 className="text-xl flex items-center gap-2">
        Upcoming Events
      </h1>
      <div className="mt-4 space-y-2">
        {sortedEvents.length > 0 ? (
          sortedEvents.map((event) => {
            const hasRSVP = !!rsvpStatuses[event.id || ''];
            return (
              <div 
                key={event.id || event.start} 
                className={`flex items-center justify-between hover:bg-yellow-800/5 p-2 rounded-lg transition-colors cursor-pointer
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
                  <h2 className="text-gray-900 flex items-center justify-between grid grid-cols-[1fr_min-content]">
                    <h2 className="whitespace-normal text-ellipsis overflow-hidden">{event.title}</h2>
                    {getRSVPSymbol(event.id)}
                  </h2>
                  <p className="text-sm text-gray-600">{formatDate(event.nextOccurrence!)}</p>
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
            <p className="text-gray-500">No upcoming events</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingEvents;