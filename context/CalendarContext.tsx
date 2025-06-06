'use client'
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; // Import your auth context
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_EVENTS } from '@/app/calendar/calendarData'; // Ensure this import is correct
import { PutItemCommand } from "@aws-sdk/client-dynamodb"; // Import PutItemCommand
import { getUserRSVPs, saveRSVPToDynamoDB } from '@/hooks/dynamoDB'; // Import the new function and saveRSVPToDynamoDB

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
    rsvpStatus?: 'yes' | 'no' | 'maybe' | null;
  };
  userId?: string;
}

interface CalendarContextType {
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  addEvent: (title: string, start: string, end?: string, allDay?: boolean, location?: string, createdBy?: string, description?: string) => void;
  rsvpEvent: (eventId: string, status: 'yes' | 'no' | 'maybe') => void;
  fetchUserRSVPs: () => Promise<CalendarEvent[]>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>(DEFAULT_EVENTS);
  const [isInitialized, setIsInitialized] = useState(false);

  // Define addEvent inside the provider
  const addEvent = (title: string, start: string, end?: string, allDay?: boolean, location?: string, createdBy?: string, description?: string) => {
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
        description,
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

  // Inside the CalendarProvider function
  const fetchUserRSVPs = async () => {
    if (user && typeof user.userId === 'string' && user.userId) {
      const rsvps = await getUserRSVPs(user.userId);
      const rsvpEventIds = rsvps.map((rsvp: { eventId: string }) => rsvp.eventId);
      const userEvents = events.filter(event => event.id && rsvpEventIds.includes(event.id));
      return userEvents; // Return the events the user RSVP'd to
    }
    return [];
  };

  const rsvpEvent = async (eventId: string, status: 'yes' | 'no' | 'maybe') => {
    setEvents(currentEvents => {
      const updatedEvents = currentEvents.map(event =>
        event.id === eventId
          ? { ...event, rsvpStatus: status }
          : event
      );
      localStorage.setItem('calendarEvents', JSON.stringify(updatedEvents));
      return updatedEvents;
    });
    // Save RSVP to DynamoDB and await it
    if (user && typeof user.userId === 'string' && user.userId) {
      await saveRSVPToDynamoDB(eventId, user.userId, status);
    }
  };

  // Only render the provider when we have a user
  if (!user) {
    return null;
  }

  return (
    <CalendarContext.Provider value={{ events, setEvents, addEvent, rsvpEvent, fetchUserRSVPs }}>
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