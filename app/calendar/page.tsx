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
import { getAllFamilyMembers, FamilyMember, sendEventCancellationNotifications, createNotification, getUserNameById, saveEventToDynamoDB, deleteEventFromDynamoDB } from '@/hooks/dynamoDB';
import { getUserFamilyGroup, isDemoUser, DEMO_USER_IDS } from '@/utils/demoConfig';

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
  const { events, setEvents, rsvpEvent, refreshEvents } = useCalendar();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const searchParams = useSearchParams();
  const eventIdFromQuery = searchParams.get('eventId');
  const [familyEvents, setFamilyEvents] = useState<CalendarEvent[]>([]);

  // Fetch family members and create events from birthdays and death dates
  useEffect(() => {
    const fetchFamilyEvents = async () => {
      try {
        const familyMembers = await getAllFamilyMembers(user?.userId);
        const generatedEvents: CalendarEvent[] = [];

        familyMembers.forEach((member: FamilyMember) => {
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
                    description: `In loving memory of ${member.first_name} ${member.last_name}. ❤️`,
                  }
                });
              }
            }
          }
        });

        setFamilyEvents(generatedEvents);
      } catch (error) {
        console.error('Error fetching family events:', error);
      }
    };

    if (user?.userId) {
      fetchFamilyEvents();
    }
  }, [user?.userId]);

  useEffect(() => {
    const filterAndCombineEvents = async () => {
      if (!user?.userId) return;
      
      // Get current user's family group and family member IDs
      const userFamilyGroup = getUserFamilyGroup(user.userId);
      const isUserDemo = isDemoUser(user.userId);
      const familyMembers = await getAllFamilyMembers(user.userId);
      const familyMemberIds = new Set(familyMembers.map(m => m.family_member_id));
      
      // Combine DEFAULT_EVENTS and familyEvents
      // familyEvents are already filtered (generated from filtered family members)
      const baseEvents = [...DEFAULT_EVENTS, ...familyEvents];
      
      // Filter baseEvents by family group (for any events that might have userId)
      const filteredBaseEvents = baseEvents.filter((event: CalendarEvent) => {
        const eventUserId = event.userId || event.extendedProps?.userId;
        if (!eventUserId) {
          return true; // System events (holidays, etc.) - show to everyone
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
      
      // Get current events from context (which already has DynamoDB events loaded and filtered)
      // Combine with birthday/memorial events generated from family members
      setEvents(currentEvents => {
        const contextEvents = currentEvents || [];
        console.log('🔄 filterAndCombineEvents - combining', contextEvents.length, 'context events with', filteredBaseEvents.length, 'base events (birthdays/memorials)');
        
        // Combine all events, ensuring no duplicates based on id
        // Birthday/memorial events take precedence if there's a duplicate (they're generated fresh)
        const combinedEvents = [...filteredBaseEvents, ...contextEvents].filter((event, index, self) =>
          index === self.findIndex((e) => e.id === event.id)
        );

        console.log('🔄 filterAndCombineEvents - combined to', combinedEvents.length, 'total events');

        // Only update state if combinedEvents is different from current events
        const currentEventsStr = JSON.stringify(contextEvents.sort((a: CalendarEvent, b: CalendarEvent) => (a.id || '').localeCompare(b.id || '')));
        const combinedEventsStr = JSON.stringify(combinedEvents.sort((a: CalendarEvent, b: CalendarEvent) => (a.id || '').localeCompare(b.id || '')));
        
        if (currentEventsStr !== combinedEventsStr) {
          // Save to localStorage when updating
          console.log('💾 filterAndCombineEvents - saving', combinedEvents.length, 'events to localStorage');
          localStorage.setItem('calendarEvents', JSON.stringify(combinedEvents));
          return combinedEvents;
        }
        
        console.log('⏭️ filterAndCombineEvents - no changes, skipping update');
        return currentEvents;
      });
    };
    
    filterAndCombineEvents();
  }, [familyEvents, user?.userId]);

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

  const handleAddEvent = async (title: string, start: string, userId: string, end?: string, allDay?: boolean, location?: string, description?: string, notifyMembers?: boolean) => {
    const newEvent = {
      id: crypto.randomUUID(),
      title,
      start,
      end,
      allDay,
      location,
      userId,
      description,
      // Apply default green colors for user-created events
      backgroundColor: '#C8D5B9', // Green background
      borderColor: '#2E6E49',    // Darker green border
      textColor: '#000000',       // Black text
      extendedProps: {
        category: 'appointment' as const, // Default category for user-created events
        userId: userId // Also store in extendedProps for consistency with filtering logic
      }
    };

    // Check if the event already exists based on title and start time
    const eventExists = events.some(event => event.title === newEvent.title && event.start === newEvent.start);
    if (!eventExists) {
      // Update events state
      setEvents(currentEvents => {
        const updatedEvents = [...currentEvents, newEvent];
        // Immediately save to localStorage for quick access
        console.log('💾 Saving new event to localStorage:', newEvent.title, 'userId:', newEvent.userId);
        localStorage.setItem('calendarEvents', JSON.stringify(updatedEvents));
        console.log('✅ Saved', updatedEvents.length, 'events to localStorage');
        return updatedEvents;
      });

      // Save to DynamoDB for cross-device persistence
      try {
        await saveEventToDynamoDB({
          id: newEvent.id!,
          title: newEvent.title,
          start: newEvent.start,
          end: newEvent.end,
          allDay: newEvent.allDay,
          backgroundColor: newEvent.backgroundColor,
          borderColor: newEvent.borderColor,
          textColor: newEvent.textColor,
          location: newEvent.location,
          description: newEvent.description,
          userId: newEvent.userId,
          createdBy: newEvent.userId,
          category: newEvent.extendedProps?.category,
          rrule: (newEvent.extendedProps as any)?.rrule
        }, user?.userId);
        console.log('✅ Event saved to DynamoDB for cross-device persistence');
      } catch (error) {
        console.error('❌ Error saving event to DynamoDB:', error);
        // Don't fail the event creation if DynamoDB save fails
      }

      // Send notifications to all family members if requested
      if (notifyMembers) {
        try {
          const familyMembers = await getAllFamilyMembers(user?.userId);
          const creatorName = await getUserNameById(userId);
          const creatorDisplayName = creatorName 
            ? `${creatorName.firstName} ${creatorName.lastName}` 
            : 'A family member';

          // Format the event date for the notification
          const eventDate = new Date(start);
          const formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'America/New_York'
          });

          const notificationTitle = 'New Calendar Event';
          const notificationMessage = `${creatorDisplayName} created a new event: "${title}" on ${formattedDate}`;

          // Send notification to all family members except the creator
          for (const member of familyMembers) {
            if (member.family_member_id !== userId) {
              try {
                await createNotification(
                  member.family_member_id,
                  'event_reminder',
                  notificationTitle,
                  notificationMessage,
                  newEvent.id,
                  { event_title: title, event_start: start, is_new_event: true }
                );
              } catch (notificationError) {
                // Don't fail the event creation if notification fails for one member
                console.error(`Error creating notification for member ${member.family_member_id}:`, notificationError);
              }
            }
          }
        } catch (error) {
          // Don't fail the event creation if notification creation fails
          console.error('Error sending event notifications:', error);
        }
      }
    } else {
      console.warn('Event already exists:', newEvent);
    }
  };

  const handleEditEvent = async (title: string, start: string, userId: string, end?: string, allDay?: boolean, location?: string, description?: string) => {
    if (!selectedEvent?.id) return;
    
    const updatedEvent = {
      ...selectedEvent,
      title,
      start,
      end,
      allDay,
      location,
      userId,
      description
    };
    
    // Update state and localStorage
    setEvents(currentEvents => {
      const updatedEvents = currentEvents.map(event =>
        event.id === selectedEvent.id ? updatedEvent : event
      );
      localStorage.setItem('calendarEvents', JSON.stringify(updatedEvents));
      return updatedEvents;
    });
    
    // Update in DynamoDB
    try {
      await saveEventToDynamoDB({
        id: selectedEvent.id,
        title,
        start,
        end,
        allDay,
        backgroundColor: selectedEvent.backgroundColor,
        borderColor: selectedEvent.borderColor,
        textColor: selectedEvent.textColor,
        location,
        description,
        userId,
        createdBy: selectedEvent.userId || userId,
        category: selectedEvent.extendedProps?.category,
        rrule: selectedEvent.extendedProps?.rrule
      }, user?.userId);
      console.log('✅ Event updated in DynamoDB');
    } catch (error) {
      console.error('❌ Error updating event in DynamoDB:', error);
      // Don't block edit if DynamoDB update fails
    }
    
    setIsModalOpen(false);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent?.id) return;
    
    const eventId = selectedEvent.id;
    const eventTitle = selectedEvent.title;
    
    // Send cancellation notifications to users who RSVP'd yes or maybe
    try {
      await sendEventCancellationNotifications(eventId, eventTitle);
    } catch (error) {
      console.error('Error sending cancellation notifications:', error);
      // Don't block deletion if notification sending fails
    }
    
    // Delete from DynamoDB
    try {
      await deleteEventFromDynamoDB(eventId);
      console.log('✅ Event deleted from DynamoDB');
    } catch (error) {
      console.error('❌ Error deleting event from DynamoDB:', error);
      // Don't block deletion if DynamoDB delete fails
    }
    
    // Update state and localStorage
    setEvents(currentEvents => {
      const updatedEvents = currentEvents.filter(event => event.id !== selectedEvent.id);
      localStorage.setItem('calendarEvents', JSON.stringify(updatedEvents));
      return updatedEvents;
    });
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
          right: user?.userId === 'f16b1510-0001-705f-8680-28689883e706' 
            ? 'refreshEvents timeGridWeek,dayGridMonth,multiMonthYear,listYear'
            : 'timeGridWeek,dayGridMonth,multiMonthYear,listYear'
        }}
        customButtons={user?.userId === 'f16b1510-0001-705f-8680-28689883e706' ? {
          refreshEvents: {
            text: '🔄 Refresh',
            click: () => {
              refreshEvents();
              // Also refresh the page to ensure all events are regenerated
              window.location.reload();
            }
          }
        } : undefined}
        initialView="dayGridMonth"
        views={{
          // 🗓️ Grid Views
          dayGridMonth: { buttonText: 'Month' },
          multiMonthYear: { buttonText: 'Year' },
        
          // 🕒 Time Grid Views
          timeGridWeek: { buttonText: 'Week' },
        
          // 📋 List Views
          // listMonth: { buttonText: 'List (Month)' },
          listYear: { buttonText: 'List' },
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
