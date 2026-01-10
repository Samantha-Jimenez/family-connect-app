'use client'
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; // Import your auth context
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_EVENTS } from '@/app/calendar/calendarData'; // Ensure this import is correct
import { PutItemCommand } from "@aws-sdk/client-dynamodb"; // Import PutItemCommand
import { getUserRSVPs, saveRSVPToDynamoDB, getAllFamilyMembers, getEventsFromDynamoDB, saveEventToDynamoDB, deleteEventFromDynamoDB, FamilyMember } from '@/hooks/dynamoDB'; // Import the new function and saveRSVPToDynamoDB
import { getUserFamilyGroup, isDemoUser, REAL_FAMILY_GROUP, DEMO_USER_IDS, DEMO_FAMILY_GROUP } from '@/utils/demoConfig';

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
    description?: string;
    rsvpStatus?: 'yes' | 'no' | 'maybe' | null;
    familyGroup?: string;
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
    const userFamilyGroup = user?.userId ? getUserFamilyGroup(user.userId) : REAL_FAMILY_GROUP;
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
          userId: eventUserId, // Also store in extendedProps for compatibility
          familyGroup: userFamilyGroup // Store family group for filtering
        }
      },
    ]);
  };

  // Load saved events after initial render
  useEffect(() => {
    const loadAndFilterEvents = async () => {
      if (!user?.userId) return;
      
      try {
        // Get current user's family group and family member IDs FIRST (needed for filtering)
        const userFamilyGroup = getUserFamilyGroup(user.userId);
        const isUserDemo = isDemoUser(user.userId);
        const familyMembers = await getAllFamilyMembers(user.userId);
        const familyMemberIds = new Set(familyMembers.map(m => m.family_member_id));
        
        console.log('👤 Current user:', user.userId, 'Family group:', userFamilyGroup, 'Is demo:', isUserDemo);
        console.log('👥 Family member IDs for current user:', Array.from(familyMemberIds));
        
        // Generate birthday and memorial events from family members
        const generatedEvents: CalendarEvent[] = [];
        console.log('👥 Generating birthday/memorial events from', familyMembers.length, 'family members');
        
        familyMembers.forEach((member: FamilyMember) => {
          // Get the member's family group (default to 'real' for backward compatibility)
          const memberFamilyGroup = member.family_group || REAL_FAMILY_GROUP;
          
          // Double-check: If this is a demo member but we're a real user (or vice versa), skip
          // This is a safety check in case getAllFamilyMembers didn't filter correctly
          const isMemberDemo = memberFamilyGroup === DEMO_FAMILY_GROUP;
          if (isUserDemo !== isMemberDemo) {
            console.log(`⚠️ Skipping ${member.first_name} ${member.last_name} - member group (${memberFamilyGroup}) doesn't match user group (${isUserDemo ? 'demo' : 'real'})`);
            return; // Skip this member
          }
          
          console.log(`✅ Generating events for ${member.first_name} ${member.last_name} (group: ${memberFamilyGroup})`);
          
          // Add birthday events - create events starting from 2025 onward
          if (member.birthday) {
            // Parse the date string directly to avoid timezone issues
            const dateStr = member.birthday.split('T')[0]; // Get YYYY-MM-DD part
            const [year, month, day] = dateStr.split('-').map(Number);
            
            if (month && day) {
              // Always start from 2025, then generate events for the next 5 years
              const startYear = 2025;
              const currentYear = new Date().getFullYear();
              // Generate events from 2025 to currentYear + 4 (at least 5 years total)
              const endYear = Math.max(startYear + 4, currentYear + 4);
              
              for (let eventYear = startYear; eventYear <= endYear; eventYear++) {
                // Format date directly as YYYY-MM-DD to avoid timezone conversion
                const eventDateStr = `${eventYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                
                const title = `${member.first_name} ${member.last_name}'s Birthday 🎂`;
                
                generatedEvents.push({
                  id: `birthday-${member.family_member_id}-${eventYear}`,
                  title: title,
                  start: eventDateStr,
                  allDay: true,
                  backgroundColor: '#E8D4B8',
                  borderColor: '#D2A267',
                  textColor: '#000000',
                  extendedProps: {
                    category: 'birthday',
                    userId: member.family_member_id,
                    familyGroup: memberFamilyGroup,
                    description: `Happy Birthday to ${member.first_name} ${member.last_name}! 🎉`,
                  }
                });
              }
            }
          }

          // Add death date events (memorial dates) - create starting from 2025 onward
          if (member.death_date) {
            // Parse the date string directly to avoid timezone issues
            const dateStr = member.death_date.split('T')[0]; // Get YYYY-MM-DD part
            const [year, month, day] = dateStr.split('-').map(Number);
            
            if (year && month && day) {
              // Always start from 2025, then generate events for the next 5 years
              const startYear = 2025;
              const currentYear = new Date().getFullYear();
              // Generate events from 2025 to currentYear + 4 (at least 5 years total)
              const endYear = Math.max(startYear + 4, currentYear + 4);
              
              for (let eventYear = startYear; eventYear <= endYear; eventYear++) {
                // Format date directly as YYYY-MM-DD to avoid timezone conversion
                const eventDateStr = `${eventYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                
                generatedEvents.push({
                  id: `memorial-${member.family_member_id}-${eventYear}`,
                  title: `In Memory of ${member.first_name} ${member.last_name} 🕊️`,
                  start: eventDateStr,
                  allDay: true,
                  backgroundColor: '#6b7280', // Gray color for memorial dates
                  borderColor: '#4b5563',
                  textColor: '#ffffff',
                  extendedProps: {
                    category: 'family-event',
                    userId: member.family_member_id,
                    familyGroup: memberFamilyGroup,
                    description: `In loving memory of ${member.first_name} ${member.last_name}. ❤️`,
                  }
                });
              }
            }
          }
        });
        
        console.log('🎂 Generated', generatedEvents.length, 'birthday/memorial events from family members');
        
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
        // Note: getEventsFromDynamoDB already filters by family group at the database level
        dynamoEvents.forEach(event => {
          if (event.id) {
            // Determine family group - events from DynamoDB are already filtered by family group
            // So all events returned are in the correct group for this user
            const eventFamilyGroup = isUserDemo ? DEMO_FAMILY_GROUP : REAL_FAMILY_GROUP;
            eventsMap.set(event.id, {
              ...event,
              extendedProps: {
                category: event.category,
                userId: event.userId,
                location: event.location,
                rrule: event.rrule,
                familyGroup: eventFamilyGroup
              }
            });
          }
        });
        
        // Filter localStorage events before combining - they might be from a different user
        // Use the same strict filtering logic as the main filter
        const filteredLocalEvents = localEvents.filter((event: CalendarEvent) => {
          const eventUserId = event.userId || event.extendedProps?.userId;
          const eventFamilyGroup = event.extendedProps?.familyGroup;
          
          if (!eventUserId) {
            // System events - keep them
            return true;
          }
          
          const hasExplicitDemoGroup = eventFamilyGroup === DEMO_FAMILY_GROUP;
          const hasExplicitRealGroup = eventFamilyGroup === REAL_FAMILY_GROUP;
          const isEventUserIdDemo = isDemoUser(eventUserId) || DEMO_USER_IDS.includes(eventUserId);
          const isEventUserIdInFamily = familyMemberIds.has(eventUserId);
          
          if (isUserDemo) {
            // Demo users: ONLY show events that belong to demo group
            if (hasExplicitDemoGroup) {
              return true;
            }
            if (hasExplicitRealGroup) {
              return false; // Explicitly marked as real, exclude
            }
            if (isEventUserIdDemo) {
              return true;
            }
            if (isEventUserIdInFamily) {
              // This event belongs to a demo family member
              return true;
            }
            return false; // No match - exclude
          } else {
            // Real family members: ONLY show events that belong to real group
            if (hasExplicitDemoGroup) {
              return false; // Explicitly marked as demo, exclude
            }
            if (hasExplicitRealGroup) {
              return true;
            }
            if (isEventUserIdDemo) {
              return false; // Demo user ID, exclude
            }
            if (isEventUserIdInFamily) {
              // This event belongs to a real family member
              return true;
            }
            // If no familyGroup is set and userId doesn't match, exclude it for strict separation
            return !isEventUserIdDemo;
          }
        });
        
        // Add filtered localStorage events (only if not already in map - for backward compatibility)
        filteredLocalEvents.forEach((event: CalendarEvent) => {
          if (event.id && !eventsMap.has(event.id)) {
            eventsMap.set(event.id, event);
          }
        });
        
        // Add generated birthday/memorial events (these take precedence as they're generated fresh)
        generatedEvents.forEach((event: CalendarEvent) => {
          if (event.id) {
            eventsMap.set(event.id, event);
          }
        });
        
        // Combine with DEFAULT_EVENTS
        DEFAULT_EVENTS.forEach((event: CalendarEvent) => {
          if (event.id && !eventsMap.has(event.id)) {
            eventsMap.set(event.id, event);
          }
        });
        
        const allEvents = Array.from(eventsMap.values());
        console.log('📅 Total merged events (after filtering localStorage and adding generated events):', allEvents.length);
        
        // Filter events by family group - STRICT filtering
        const filteredEvents = allEvents.filter((event: CalendarEvent) => {
          // Events without userId/extendedProps.userId are system events (like holidays) - show to all
          const eventUserId = event.userId || event.extendedProps?.userId;
          const eventFamilyGroup = event.extendedProps?.familyGroup;
          
          if (!eventUserId) {
            // System events (holidays, etc.) - show to everyone
            return true;
          }
          
          // Check if the event belongs to demo group
          // First check if familyGroup is explicitly set in extendedProps (for birthday/memorial events)
          const hasExplicitDemoGroup = eventFamilyGroup === DEMO_FAMILY_GROUP;
          const hasExplicitRealGroup = eventFamilyGroup === REAL_FAMILY_GROUP;
          
          // Check if the userId is a demo user ID (for manually created events)
          const isEventUserIdDemo = isDemoUser(eventUserId) || DEMO_USER_IDS.includes(eventUserId);
          
          // Check if the userId matches a family member ID in the current user's family
          const isEventUserIdInFamily = familyMemberIds.has(eventUserId);
          
          if (isUserDemo) {
            // Demo users: ONLY show events that belong to demo group
            // Must have explicit demo group OR userId is demo user ID OR userId is in demo family member IDs
            if (hasExplicitDemoGroup) {
              return true;
            }
            if (hasExplicitRealGroup) {
              return false; // Explicitly marked as real, exclude
            }
            if (isEventUserIdDemo) {
              return true;
            }
            if (isEventUserIdInFamily) {
              // This event belongs to a demo family member (since getAllFamilyMembers filters to demo only for demo users)
              return true;
            }
            // No match - exclude
            return false;
          } else {
            // Real family members: ONLY show events that belong to real group
            // Must NOT have demo group, and either have real group OR userId is in real family member IDs
            if (hasExplicitDemoGroup) {
              return false; // Explicitly marked as demo, exclude
            }
            if (hasExplicitRealGroup) {
              return true;
            }
            if (isEventUserIdDemo) {
              return false; // Demo user ID, exclude
            }
            if (isEventUserIdInFamily) {
              // This event belongs to a real family member (since getAllFamilyMembers filters to real only for real users)
              return true;
            }
            // If no familyGroup is set and userId doesn't match, assume it's from an old event without familyGroup
            // For backward compatibility, we could allow it, but for strict separation, exclude it
            // Only allow if it's definitely not a demo user
            return !isEventUserIdDemo;
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