"use client"; // Required for Next.js App Router
import React from 'react'
import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction"; // Enables event interactions

interface CalendarEvent {
  title: string;
  date: string;
}

export default function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([
    { title: "Family Reunion", date: "2025-02-15" },
    { title: "So-&-so's Birthday", date: "2025-03-10" },
  ]);

  const handleDateClick = (info: { date: Date }) => {
    const title = prompt("Enter event title:");
    if (title) {
      setEvents([...events, { title, date: info.date.toISOString().split('T')[0] }]);
    }
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-lg">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        editable={true}
        selectable={true}
        events={events}
        dateClick={handleDateClick} // Allow users to add events by clicking a date
      />
    </div>
  )
}
