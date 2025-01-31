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
}

export default function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([
    { 
      title: "Family Dinner", 
      start: "2024-03-21T18:00:00",
      end: "2024-03-21T20:00:00",
      allDay: false
    },
    {
      title: "Family Reunion",
      start: "2024-03-25",
      allDay: true
    },
    {
      title: "Family Game Night",
      start: "2024-03-21T19:00:00",
      rrule: {
        freq: 'weekly',
        interval: 1,
        byweekday: [5] // Every Friday (0=Sunday, 1=Monday, etc.)
      }
    }
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  const handleDateClick = (info: { date: Date }) => {
    setSelectedDate(info.date.toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleAddEvent = (title: string) => {
    setEvents([...events, { 
      id: crypto.randomUUID(),
      title, 
      start: selectedDate 
    }]);
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
