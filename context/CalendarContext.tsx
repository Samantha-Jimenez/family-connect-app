'use client'
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; // Import your auth context
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_EVENTS } from '@/app/calendar/calendarData'; // Ensure this import is correct
import { PutItemCommand } from "@aws-sdk/client-dynamodb"; // Import PutItemCommand
import { getUserRSVPs, saveRSVPToDynamoDB, getAllFamilyMembers, getEventsFromDynamoDB, saveEventToDynamoDB, deleteEventFromDynamoDB } from '@/hooks/dynamoDB'; // Import the new function and saveRSVPToDynamoDB
import { getUserFamilyGroup, isDemoUser, REAL_FAMILY_GROUP, DEMO_USER_IDS } from '@/utils/demoConfig';

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
  refreshEvents: () => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>(DEFAULT_EVENTS);
  const [isInitialized, setIsInitialized] = useState(false);

  // Define addEvent inside the provider
  const addEvent = (title: string, start: string, end?: string, allDay?: boolean, location?: string, createdBy?: string, description?: string) => {
    const eventUserId = user?.userId || createdBy;
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
        userId: eventUserId, // Store the creator's userId for filtering
        // Apply default green colors for non-birthday events
        backgroundColor: '#C8D5B9', // Green background
        borderColor: '#2E6E49',    // Darker green border
        textColor: '#000000',       // Black text
        extendedProps: {
          category: 'appointment' as const, // Default category for user-created events
          userId: eventUserId // Also store in extendedProps for compatibility
        }
      },
    ]);
  };

  // Load saved events after initial render
  useEffect(() => {
    const loadAndFilterEvents = async () => {
      if (!user?.userId) return;
      
      try {
        // Load events from DynamoDB first (for cross-device persistence) - do this in parallel with localStorage
        console.log('📅 Loading events from DynamoDB...');
        const [dynamoEvents, savedEvents] = await Promise.all([
          getEventsFromDynamoDB(user.userId).catch(err => {
            console.error('❌ Error loading from DynamoDB:', err);
            return [];
          }),
          Promise.resolve(localStorage.getItem('calendarEvents'))
        ]);
        
        console.log('📅 Loaded', dynamoEvents.length, 'events from DynamoDB');
        
        // Parse localStorage events (for backward compatibility and offline support)
        const localEvents = savedEvents ? JSON.parse(savedEvents) : [];
        console.log('📅 Loaded', localEvents.length, 'events from localStorage');
        
        // Merge events: DynamoDB takes precedence, then localStorage
        // Use a Map to deduplicate by event ID
        const eventsMap = new Map<string, CalendarEvent>();
        
        // Add DynamoDB events first (these are the source of truth)
        dynamoEvents.forEach(event => {
          if (event.id) {
            eventsMap.set(event.id, {
              ...event,
              extendedProps: {
                category: event.category,
                userId: event.userId,
                location: event.location,
                rrule: event.rrule
              }
            });
          }
        });
        
        // Add localStorage events (only if not already in map - for backward compatibility)
        localEvents.forEach((event: CalendarEvent) => {
          if (event.id && !eventsMap.has(event.id)) {
            eventsMap.set(event.id, event);
          }
        });
        
        const allEvents = Array.from(eventsMap.values());
        console.log('📅 Total merged events:', allEvents.length);
        
        // Get current user's family group and family member IDs
        const userFamilyGroup = getUserFamilyGroup(user.userId);
        const isUserDemo = isDemoUser(user.userId);
        const familyMembers = await getAllFamilyMembers(user.userId);
        const familyMemberIds = new Set(familyMembers.map(m => m.family_member_id));
        
        console.log('👤 Current user:', user.userId, 'Family group:', userFamilyGroup, 'Is demo:', isUserDemo);
        
        // Filter events by family group
        const filteredEvents = allEvents.filter((event: CalendarEvent) => {
          // Events without userId/extendedProps.userId are system events (like holidays) - show to all
          const eventUserId = event.userId || event.extendedProps?.userId;
          if (!eventUserId) {
            // System events (holidays, etc.) - show to everyone
            return true;
          }
          
          // Check if the event was created by a demo user
          const isEventFromDemoUser = isDemoUser(eventUserId) || DEMO_USER_IDS.includes(eventUserId);
          
          if (isUserDemo) {
            // Demo users: only show events created by demo users or events in their family group
            return isEventFromDemoUser || familyMemberIds.has(eventUserId);
          } else {
            // Real family members: show all events EXCEPT those created by demo users
            return !isEventFromDemoUser;
          }
        });
        
        console.log('📅 Filtered events:', filteredEvents.length, 'events');
        
        // Update existing events with new color scheme
        const updatedEvents = filteredEvents.map((event: CalendarEvent) => {
        // Update birthday events to new color scheme
        if (event.extendedProps?.category === 'birthday') {
          return {
            ...event,
            backgroundColor: '#E8D4B8',
            borderColor: '#D2A267',
            textColor: '#000000'
          };
        }
        
        // Update memorial events to appropriate color scheme
        if (event.extendedProps?.category === 'family-event' && event.title.includes('In Memory of')) {
          return {
            ...event,
            backgroundColor: '#6b7280',
            borderColor: '#4b5563',
            textColor: '#ffffff'
          };
        }
        
        // Update general events to new color scheme
        if (event.extendedProps?.category === 'appointment' || !event.extendedProps?.category) {
          return {
            ...event,
            backgroundColor: '#C8D5B9',
            borderColor: '#2E6E49',
            textColor: '#000000'
          };
        }
        
        return event;
      });
      
      // Save merged events to localStorage for faster future loads
      localStorage.setItem('calendarEvents', JSON.stringify(updatedEvents));
      setEvents(updatedEvents);
      setIsInitialized(true);
      } catch (error) {
        console.error('❌ Error loading events:', error);
        // Fallback to localStorage only if DynamoDB fails
        const savedEvents = localStorage.getItem('calendarEvents');
        if (savedEvents) {
          const parsedEvents = JSON.parse(savedEvents);
          setEvents(parsedEvents);
          setIsInitialized(true);
        }
      }
    };
    
    loadAndFilterEvents();
  }, [user?.userId]);

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
    // Find the event to get the creator's userId
    const event = events.find(e => e.id === eventId);
    const eventCreatorId = event?.userId || event?.extendedProps?.userId;

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
      await saveRSVPToDynamoDB(eventId, user.userId, status, eventCreatorId);
    }
  };

  const refreshEvents = () => {
    // Clear localStorage and reset to default events to force refresh
    localStorage.removeItem('calendarEvents');
    setEvents(DEFAULT_EVENTS);
  };

  // Only render the provider when we have a user
  if (!user) {
    return null;
  }

  return (
    <CalendarContext.Provider value={{ events, setEvents, addEvent, rsvpEvent, fetchUserRSVPs, refreshEvents }}>
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