"use client"; // Required for Next.js App Router
import React, { useEffect, useState } from 'react'
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction"; // Enables event interactions
import listPlugin from "@fullcalendar/list";  // Add this import
import EventModal from '@/components/EventModal';
import rrulePlugin from '@fullcalendar/rrule'
import multiMonthPlugin from '@fullcalendar/multimonth'
import googleCalendarPlugin from '@fullcalendar/google-calendar'
import iCalendarPlugin from '@fullcalendar/icalendar'
import { useCalendar } from '@/context/CalendarContext';
import { useAuth } from '@/context/AuthContext';
import { EventApi } from '@fullcalendar/core';
import { DEFAULT_EVENTS } from './calendarData'; // Import your default events
import { useSearchParams } from 'next/navigation';

interface CalendarEvent {
  id?: string;
  title: string;
  start: string;  // Can include time: "2024-03-21T10:00:00"
  end?: string;   // Optional end time
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  classNames?: string[];
  description?: string;
  extendedProps?: {
    category?: 'birthday' | 'holiday' | 'family-event' | 'appointment';
    rrule?: {
      freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
      interval?: number;
      byweekday?: number[];
      until?: string;
    };
    userId?: string;
    location?: string;
    description?: string;
  }
  userId?: string;
  location?: string;
  rrule?: {
    freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    byweekday?: number[];
    until?: string;
  };
}

export default function Calendar() {
  const { events, setEvents, rsvpEvent } = useCalendar();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const searchParams = useSearchParams();
  const eventIdFromQuery = searchParams.get('eventId');

  useEffect(() => {
    // Initialize events with DEFAULT_EVENTS if events are empty
    if (events.length === 0) {
      setEvents(DEFAULT_EVENTS);
    } else {
      // Combine DEFAULT_EVENTS with existing events, ensuring no duplicates
      const combinedEvents = [...events, ...DEFAULT_EVENTS].filter((event, index, self) =>
        index === self.findIndex((e) => e.id === event.id)
      );

      // Only update state if combinedEvents is different from current events
      if (JSON.stringify(combinedEvents) !== JSON.stringify(events)) {
        setEvents(combinedEvents);
      }
    }
  }, [events, setEvents]);

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

  const handleDateClick = (info: { date: Date }) => {
    setSelectedEvent(null);
    setModalMode('add');
    setSelectedDate(info.date.toISOString());
    setIsModalOpen(true);
  };

  const handleEventClick = (info: { event: EventApi }) => {
    try {
      const { event } = info;
      const eventData = {
        id: event.id,
        title: event.title,
        start: event.start?.toISOString() || event.startStr,
        end: event.end?.toISOString() || event.endStr,
        allDay: event.allDay,
        extendedProps: event.extendedProps,
        rrule: event.extendedProps?.rrule,
        userId: event.extendedProps?.userId,
        location: event.extendedProps?.location,
        description: event.extendedProps?.description
      };
      setSelectedEvent(eventData);
      setModalMode('edit');
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error handling event click:', error);
      alert('Unable to edit this event. Please try again.');
    }
  };

  const handleAddEvent = (title: string, start: string, userId: string, end?: string, allDay?: boolean, location?: string, description?: string) => {
    const newEvent = {
      id: crypto.randomUUID(),
      title,
      start,
      end,
      allDay,
      location,
      userId,
      description
    };

    // Check if the event already exists based on title and start time
    const eventExists = events.some(event => event.title === newEvent.title && event.start === newEvent.start);
    if (!eventExists) {
      setEvents(currentEvents => [...currentEvents, newEvent]);
    } else {
      console.warn('Event already exists:', newEvent);
    }
  };

  const handleEditEvent = (title: string, start: string, userId: string, end?: string, allDay?: boolean, location?: string, description?: string) => {
    if (!selectedEvent?.id) return;
    
    setEvents(currentEvents =>
      currentEvents.map(event =>
        event.id === selectedEvent.id
          ? { ...event, title, start, end, allDay, location, userId, description }
          : event
      )
    );
    setIsModalOpen(false);
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent?.id) return;
    
    setEvents(currentEvents =>
      currentEvents.filter(event => event.id !== selectedEvent.id)
    );
    setIsModalOpen(false);
  };

  const handleResetEvents = () => {
    setEvents([]); // Clear all events
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-lg text-gray-800 opacity-0 animate-[fadeIn_0.6s_ease-in_forwards]">
      <FullCalendar
        plugins={[
          dayGridPlugin,
          timeGridPlugin,
          interactionPlugin,
          listPlugin,
          rrulePlugin,
          multiMonthPlugin,
          googleCalendarPlugin,
          iCalendarPlugin
        ]}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'timeGridDay,timeGridWeek,dayGridMonth,multiMonthYear,listWeek'
        }}
        initialView="dayGridMonth"
        views={{
          timeGridDay: { buttonText: 'Day' },
          timeGridWeek: { buttonText: 'Week' },
          dayGridMonth: { buttonText: 'Month' },
          multiMonthYear: { buttonText: 'Year' },
          listWeek: { buttonText: 'List' }
        }}
        editable={true}
        selectable={true}
        events={events}
        dateClick={handleDateClick} // Allow users to add events by clicking a date
        eventDrop={(info) => {
          const { event } = info;
          // Update event dates when dragged
          setEvents(currentEvents => 
            currentEvents.map(e => 
              e.id === event.id 
                ? { ...e, start: event.startStr, end: event.endStr }
                : e
            )
          );
        }}
        eventResize={(info) => {
          const { event } = info;
          // Update event duration when resized
          setEvents(currentEvents => 
            currentEvents.map(e => 
              e.id === event.id 
                ? { ...e, end: event.endStr }
                : e
            )
          );
        }}
        eventClick={handleEventClick}
        eventMouseEnter={(info) => {
          console.log('Event mouse entered:', info.event.title, info.event.extendedProps);
          // Show tooltip or additional info on hover
        }}
        timeZone="local"
      />
      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={modalMode === 'add' ? handleAddEvent : handleEditEvent}
        onDelete={handleDeleteEvent}
        selectedDate={selectedDate}
        event={selectedEvent}
        mode={modalMode}
        rsvpEvent={rsvpEvent}
      />
    </div>
  )
}
