import React from 'react'
import { useCalendar } from '@/context/CalendarContext'

interface Event {
  id?: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  rrule?: {
    freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    byweekday?: number[];
    until?: string;
  };
}

const UpcomingEvents = () => {
  const { events } = useCalendar();

  // Function to get the next occurrence of a recurring event
  const getNextOccurrence = (event: Event) => {
    const now = new Date();
    const eventStart = new Date(event.start);
    
    if (!event.rrule) {
      return eventStart;
    }

    // Handle weekly events
    if (event.rrule.freq === 'weekly') {
      const dayOfWeek = eventStart.getDay();
      let nextDate = new Date(now);
      
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

  const sortedEvents = (events || [])
    .map(event => ({
      ...event,
      nextOccurrence: getNextOccurrence(event)
    }))
    .sort((a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime())
    .slice(0, 3);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="card text-black p-6">
      <h2 className="text-xl font-bold">📅 Upcoming Events</h2>
      <div className="mt-4 space-y-3">
        {sortedEvents.length > 0 ? (
          sortedEvents.map((event) => (
            <div key={event.id || event.start} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{event.title}</p>
                <p className="text-sm text-gray-600">{formatDate(event.nextOccurrence)}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No upcoming events</p>
        )}
      </div>
    </div>
  )
}

export default UpcomingEvents