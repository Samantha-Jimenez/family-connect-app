"use client"; // Required for Next.js App Router
import React, { useState } from 'react'
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
  extendedProps?: {
    category?: 'birthday' | 'holiday' | 'family-event' | 'appointment';
  }
  rrule?: {
    freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    byweekday?: number[];
    until?: string;
  };
  userId?: string;
}

export default function Calendar() {
  const { events, setEvents } = useCalendar();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  const handleDateClick = (info: { date: Date }) => {
    setSelectedDate(info.date.toISOString());
    setIsModalOpen(true);
  };

  const handleAddEvent = (title: string) => {
    const newEvent = {
      id: crypto.randomUUID(),
      title,
      start: selectedDate,
      userId: user?.userId
    };
    setEvents(currentEvents => [...currentEvents, newEvent]);
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-lg">
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
        eventClick={(info) => {
          // Handle event clicks - could open a modal with event details
          const { event } = info;
          console.log('Event clicked:', event.title, event.extendedProps);
        }}
        eventMouseEnter={(info) => {
          console.log('Event mouse entered:', info.event.title, info.event.extendedProps);
          // Show tooltip or additional info on hover
        }}
      />
      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddEvent}
        selectedDate={selectedDate}
      />
    </div>
  )
}
