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
import { getAllFamilyMembers, sendEventCancellationNotifications, createNotification, getUserNameById, saveEventToDynamoDB, deleteEventFromDynamoDB } from '@/hooks/dynamoDB';
import { getUserFamilyGroup, REAL_FAMILY_GROUP } from '@/utils/demoConfig';

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
    familyGroup?: string;
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
  
  // Events are now loaded and generated in CalendarContext, so we just use them directly
  // No need to generate birthday events or filter again here since CalendarContext handles it

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
    const userFamilyGroup = user?.userId ? getUserFamilyGroup(user.userId) : REAL_FAMILY_GROUP;
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
        userId: userId, // Also store in extendedProps for consistency with filtering logic
        familyGroup: userFamilyGroup // Store family group for filtering
      }
    };

    // Check if the event already exists based on title and start time
    const eventExists = events.some(event => event.title === newEvent.title && event.start === newEvent.start);
    if (!eventExists) {
      // Update events state
      setEvents(currentEvents => {
        const updatedEvents = [...currentEvents, newEvent];
        // Immediately save to localStorage for quick access
        localStorage.setItem('calendarEvents', JSON.stringify(updatedEvents));
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
