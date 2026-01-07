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
import { getAllFamilyMembers, FamilyMember, sendEventCancellationNotifications, createNotification, getUserNameById } from '@/hooks/dynamoDB';

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
          // Add birthday events - create events for current and next few years
          if (member.birthday) {
            // Parse the date string directly to avoid timezone issues
            const dateStr = member.birthday.split('T')[0]; // Get YYYY-MM-DD part
            const [year, month, day] = dateStr.split('-').map(Number);
            
            if (month && day) {
              // Create birthday events for the next 5 years
              const currentYear = new Date().getFullYear();
              for (let yearOffset = 0; yearOffset < 5; yearOffset++) {
                // Format date directly as YYYY-MM-DD to avoid timezone conversion
                const eventDateStr = `${currentYear + yearOffset}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                
                const title = `${member.first_name} ${member.last_name}'s Birthday 🎂`;
                
                generatedEvents.push({
                  id: `birthday-${member.family_member_id}-${currentYear + yearOffset}`,
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

          // Add death date events (memorial dates) - create for current and next few years
          if (member.death_date) {
            // Parse the date string directly to avoid timezone issues
            const dateStr = member.death_date.split('T')[0]; // Get YYYY-MM-DD part
            const [year, month, day] = dateStr.split('-').map(Number);
            
            if (year && month && day) {
              // Create memorial events for the next 5 years
              const currentYear = new Date().getFullYear();
              for (let yearOffset = 0; yearOffset < 5; yearOffset++) {
                // Format date directly as YYYY-MM-DD to avoid timezone conversion
                const eventDateStr = `${currentYear + yearOffset}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                
                generatedEvents.push({
                  id: `memorial-${member.family_member_id}-${currentYear + yearOffset}`,
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

    fetchFamilyEvents();
  }, []);

  useEffect(() => {
    // Combine DEFAULT_EVENTS, familyEvents, and user-created events
    const baseEvents = [...DEFAULT_EVENTS, ...familyEvents];
    
    // Initialize events with base events if events are empty
    if (events.length === 0) {
      setEvents(baseEvents);
    } else {
      // Combine all events, ensuring no duplicates based on id
      const combinedEvents = [...events, ...baseEvents].filter((event, index, self) =>
        index === self.findIndex((e) => e.id === event.id)
      );

      // Only update state if combinedEvents is different from current events
      if (JSON.stringify(combinedEvents) !== JSON.stringify(events)) {
        setEvents(combinedEvents);
      }
    }
  }, [familyEvents]);

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
        category: 'appointment' as const // Default category for user-created events
      }
    };

    // Check if the event already exists based on title and start time
    const eventExists = events.some(event => event.title === newEvent.title && event.start === newEvent.start);
    if (!eventExists) {
      setEvents(currentEvents => [...currentEvents, newEvent]);

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
          right: 'refreshEvents timeGridWeek,dayGridMonth,multiMonthYear,listYear'
        }}
        customButtons={{
          refreshEvents: {
            text: '🔄 Refresh',
            click: () => {
              refreshEvents();
              // Also refresh the page to ensure all events are regenerated
              window.location.reload();
            }
          }
        }}
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
