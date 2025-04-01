'use client'
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; // Import your auth context
import { v4 as uuidv4 } from 'uuid';

export interface CalendarEvent {
  id?: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  classNames?: string[];
  location?: string;
  createdBy?: string;
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

interface CalendarContextType {
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  addEvent: (title: string, start: string, end?: string, allDay?: boolean, location?: string, createdBy?: string) => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

const DEFAULT_EVENTS: CalendarEvent[] = [{
  id: '1',
  title: "Family Game Night",
  start: "2024-03-22T19:00:00.000Z", // Use a fixed date instead of dynamic
  rrule: {
    freq: 'weekly',
    interval: 1,
    byweekday: [5]
  }
}];

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>(DEFAULT_EVENTS);
  const [isInitialized, setIsInitialized] = useState(false);

  // Define addEvent inside the provider
  const addEvent = (title: string, start: string, end?: string, allDay?: boolean, location?: string, createdBy?: string) => {
    setEvents((prevEvents: CalendarEvent[]) => [
      ...prevEvents,
      {
        id: uuidv4(),
        title,
        start,
        end,
        allDay,
        location,
        createdBy,
      },
    ]);
  };

  // Load saved events after initial render
  useEffect(() => {
    const savedEvents = localStorage.getItem('calendarEvents');
    if (savedEvents) {
      setEvents(JSON.parse(savedEvents));
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage whenever events change, but only after initialization
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('calendarEvents', JSON.stringify(events));
    }
  }, [events, isInitialized]);

  // Only render the provider when we have a user
  if (!user) {
    return null;
  }

  return (
    <CalendarContext.Provider value={{ events, setEvents, addEvent }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}