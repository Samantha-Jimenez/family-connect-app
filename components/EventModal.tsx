import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserNameById, getRSVPStatus, getEventRSVPs } from '@/hooks/dynamoDB';
import { CalendarEvent } from '@/context/CalendarContext';
import ConfirmationModal from './ConfirmationModal';
import { useToast } from '@/context/ToastContext';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, start: string, userId: string, end?: string, allDay?: boolean, location?: string, description?: string) => void;
  onDelete?: () => void;
  selectedDate: string;
  event?: CalendarEvent | null;
  mode?: 'add' | 'edit';
  rsvpEvent: (eventId: string, status: 'yes' | 'no' | 'maybe') => void;
}

export default function EventModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  selectedDate,
  event,
  mode = 'add',
  rsvpEvent,
}: EventModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(mode === 'add');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<'yes' | 'no' | 'maybe' | null>(null);
  const [rsvpStatusFetched, setRsvpStatusFetched] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [rsvpList, setRsvpList] = useState<{ userId: string; status: 'yes' | 'no' | 'maybe'; name: string }[]>([]);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (event?.userId) {
      getUserNameById(event.userId).then((name) => {
        if (name) {
          setCreatorName(`${name.firstName} ${name.lastName}`);
        } else {
          setCreatorName('Unknown');
        }
      });
    }
  }, [event]);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
    } else {
      setIsEditing(mode === 'add');
      
      // Scroll to bottom on mobile when modal opens
      if (window.innerWidth < 640) { // sm breakpoint
        setTimeout(() => {
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
          });
        }, 100); // Small delay to ensure modal is rendered
      }
    }
  }, [isOpen, mode]);

  useEffect(() => {
    const resetToEventValues = () => {
      try {
        if (event && mode === 'edit') {
          setTitle(event.title);
          setIsAllDay(!!event.allDay);
          setLocation(event.location || '');
          setDescription(event.description || '');
          const start = new Date(event.start);
          if (!isNaN(start.getTime())) {
            setStartDate(start.toISOString().split('T')[0]);
            setStartTime(start.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5));
          }
          if (event.end) {
            let end = new Date(event.end);
            if (event.allDay) {
              end.setDate(end.getDate() - 1);
            }
            if (!isNaN(end.getTime())) {
              setEndDate(end.toISOString().split('T')[0]);
              if (!event.allDay) {
                setEndTime(end.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5));
              }
            }
          } else {
            const selected = new Date(selectedDate);
            if (!isNaN(selected.getTime())) {
              setTitle('');
              setIsAllDay(false);
              setLocation('');
              setDescription('');
              setStartDate(selected.toISOString().split('T')[0]);
              setStartTime('00:00');
              setEndDate(selected.toISOString().split('T')[0]);
              setEndTime('00:00');
            }
          }
        } else if (mode === 'add') {
          // Always set startDate to selectedDate in add mode
          const selected = new Date(selectedDate);
          if (!isNaN(selected.getTime())) {
            setTitle('');
            setIsAllDay(false);
            setLocation('');
            setDescription('');
            setStartDate(selected.toISOString().split('T')[0]);
            setStartTime('00:00');
            setEndDate(selected.toISOString().split('T')[0]);
            setEndTime('00:00');
          }
        }
      } catch (error) {
        console.error('Error resetting form:', error);
      }
    };

    resetToEventValues();
  }, [event, mode, selectedDate, setTitle, setIsAllDay, setLocation, setStartDate, setStartTime, setEndDate, setEndTime, setDescription]);

  useEffect(() => {
    if (event?.id && user?.userId && isOpen) {
      getRSVPStatus(event.id, user.userId).then((status) => {
        setRsvpStatus(status);
        setRsvpStatusFetched(true);
      });
    }
    if (!isOpen) setRsvpStatusFetched(false);
  }, [event?.id, user?.userId, isOpen]);

  useEffect(() => {
    async function fetchRSVPList() {
      if (!event?.id) {
        setRsvpList([]);
        return;
      }
      const rsvps = await getEventRSVPs(event.id);
      // Fetch names for each user
      const rsvpsWithNames = await Promise.all(
        rsvps.map(async (rsvp) => {
          const nameObj = await getUserNameById(rsvp.userId);
          const name = nameObj ? `${nameObj.firstName} ${nameObj.lastName}` : rsvp.userId;
          return { ...rsvp, name };
        })
      );
      setRsvpList(rsvpsWithNames);
    }
    fetchRSVPList();
  }, [event?.id]);

  const formatDateTime = (date: string, time?: string) => {
    try {
      const dateTime = time 
        ? new Date(`${date}T${time}`)
        : new Date(date);
      
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: isAllDay ? undefined : 'numeric',
        minute: isAllDay ? undefined : 'numeric',
        hour12: true,
        timeZone: 'America/New_York'
      }).format(dateTime);
    } catch {
      return 'Invalid date';
    }
  };

  const calculateDuration = (start: string, time1: string, end: string, time2: string) => {
    try {
      const startDate = new Date(`${start}T${time1}`);
      const endDate = new Date(`${end}T${time2}`);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return '';
      }

      const diff = endDate.getTime() - startDate.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''}${hours > 0 ? `, ${hours} hour${hours > 1 ? 's' : ''}` : ''}`;
      } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? `, ${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`;
      } else {
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
      }
    } catch {
      return '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      try {
        let startDateTime, endDateTime;
        
        if (isAllDay) {
          startDateTime = new Date(`${startDate}T00:00:00`);
          if (endDate) {
            // Add one day to the end date for all-day events (exclusive end)
            const end = new Date(endDate);
            end.setDate(end.getDate() + 2);
            endDateTime = new Date(`${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}T00:00:00`);
          }
        } else {
          startDateTime = new Date(`${startDate}T${startTime}:00`);
          if (endDate && endTime) {
            endDateTime = new Date(`${endDate}T${endTime}:00`);
          }
        }
        
        if (isNaN(startDateTime.getTime())) {
          throw new Error('Invalid start date/time');
        }
        if (endDateTime && isNaN(endDateTime.getTime())) {
          throw new Error('Invalid end date/time');
        }

        onSubmit(
          title.trim(), 
          startDateTime.toISOString(), 
          user.userId,
          endDateTime?.toISOString(),
          isAllDay,
          location.trim() || undefined,
          description.trim() || undefined
        );

        // Show success toast
        showToast(
          mode === 'add' ? 'Event created successfully!' : 'Event updated successfully!',
          'success', {
            position: 'top-right',
          }
        );

        // Close the modal after successful submission
        onClose();
      } catch (error) {
        console.error('Error submitting event:', error);
        showToast('Please enter valid date and time values', 'error');
      }
    }
  };

  const clearFields = () => {
    setTitle('');
    setLocation('');
    // Do not clear startDate so it can be set from selectedDate
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setIsAllDay(false);
    setDescription('');
  };

  const handleClose = () => {
    setIsEditing(false);
    clearFields();
    onClose();
  };

  const handleCancel = () => {
    if (mode === 'edit') {
      // Reset all form fields individually
      if (event) {
        setTitle(event.title);
        setIsAllDay(!!event.allDay);
        setLocation(event.location || '');
        setDescription(event.description || '');
        const start = new Date(event.start);
        if (!isNaN(start.getTime())) {
          setStartDate(start.toISOString().split('T')[0]);
          setStartTime(start.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5));
        }
        
        if (event.end) {
          let end = new Date(event.end);
          if (event.allDay) {
            end.setDate(end.getDate() - 1);
          }
          if (!isNaN(end.getTime())) {
            setEndDate(end.toISOString().split('T')[0]);
            if (!event.allDay) {
              setEndTime(end.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5));
            }
          }
        }
      }
      setIsEditing(false);
    } else {
      handleClose();
    }
  };

  const handleRsvp = async (status: 'yes' | 'no' | 'maybe') => {
    // Toggle RSVP: deselect if already selected
    if (rsvpStatus === status) {
      setRsvpStatus(null);
      if (event?.id) {
        await rsvpEvent(event.id, null as any); // Pass null to remove RSVP
      }
      return;
    }
    setRsvpStatus(status);
    if (event?.id) {
      await rsvpEvent(event.id, status);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      setIsConfirmOpen(false);
      showToast('Event deleted successfully!', 'error', {
        position: 'top-right',
      });
    }
  };

  const getEventDateDisplay = () => {
    if (!startDate) return '';
    const parseLocalDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };
    const start = parseLocalDate(startDate);
    const end = endDate ? parseLocalDate(endDate) : null;

    const format = (date: Date) =>
      date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/New_York',
      });

    if (end && end.toDateString() !== start.toDateString()) {
      return `${format(start)} - ${format(end)}`;
    }
    return format(start);
  };

  const getEventTimeDisplay = () => {
    const parseLocalDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };
    if (isAllDay) {
      if (!startDate) return '';
      const start = parseLocalDate(startDate);
      const end = endDate ? parseLocalDate(endDate) : null;
      if (end && end > start) {
        // Calculate number of days (inclusive)
        const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return `${diffDays} Day Event`;
      }
      return 'All Day Event';
    } else {
      // Timed event
      if (startTime && endTime) {
        // Format as "09:00 AM - 11:00 AM"
        const formatTime = (time: string) => {
          const [hour, minute] = time.split(':').map(Number);
          const date = new Date();
          date.setHours(hour, minute, 0, 0);
          return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        };
        return `${formatTime(startTime)} - ${formatTime(endTime)}`;
      }
      if (startTime) {
        const formatTime = (time: string) => {
          const [hour, minute] = time.split(':').map(Number);
          const date = new Date();
          date.setHours(hour, minute, 0, 0);
          return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        };
        return formatTime(startTime);
      }
      return '';
    }
  };

  return (
    <dialog className={`modal ${isOpen ? 'modal-open' : ''}`}>
      <div className="modal-box bg-gray-100 relative">
        {isEditing ? (
        <button
          onClick={handleCancel}
          className="absolute top-1 right-3 text-gray-600 hover:text-gray-800 text-2xl cursor-pointer z-10 font-light"
        >
          &times;
        </button>
        ) : (
          <button
          onClick={handleClose}
          className="absolute top-1 right-3 text-gray-600 hover:text-gray-800 text-2xl cursor-pointer z-10 font-light"
        >
          &times;
        </button>
        )}
        {isEditing ? (
          <>
            <h3 className="font-bold text-lg">
              {mode === 'add' ? 'Add New Event' : 'Edit Event'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="py-4 space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Event Title</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input input-bordered w-full bg-white block rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"
                    placeholder="Enter event title"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Location</span>
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="input input-bordered w-full bg-white block rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"
                    placeholder="Enter location (optional)"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Description</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input input-bordered w-full bg-white block rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"
                    placeholder="Enter description (optional)"
                  />
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer !justify-stretch">
                    <span className="label-text">All Day Event</span>
                    <input
                      type="checkbox"
                      checked={isAllDay}
                      onChange={(e) => setIsAllDay(e.target.checked)}
                      className="checkbox checkbox-success ml-2"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Start Date</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input input-bordered w-full bg-white block rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"
                    />
                  </div>
                  {!isAllDay && (
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Start Time</span>
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="input input-bordered w-full bg-white block rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"
                        />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">End Date</span>
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="input input-bordered w-full bg-white block rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"
                      />
                  </div>
                  {!isAllDay && (
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">End Time</span>
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="input input-bordered w-full bg-white block rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"
                        />
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-action">
                {(event?.userId === user.userId || user.userId === "f16b1510-0001-705f-8680-28689883e706") && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsConfirmOpen(true)}
                      className="btn btn-sm bg-[#E12B1F] border-0 text-white hover:bg-[#E12B1F]/70"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="btn btn-sm bg-sand-beige border-0 text-black hover:bg-sand-beige/70"
                    >
                      Edit
                    </button>
                  </>
                )}
                <button
                  type="submit"
                  className="btn btn-sm bg-plantain-green border-0 text-white hover:bg-plantain-green/70"
                >
                  {mode === 'add' ? 'Add Event' : 'Save Changes'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h3 className="font-bold text-lg mb-4">{event?.title || title}</h3>
            
            <div className="space-y-2">
              <div>
                <div className="text-sm font-semibold text-gray-500">
                  Date
                </div>
                <div>
                  {getEventDateDisplay()}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-500">
                  {isAllDay ? 'Duration' : 'Time'}
                </div>
                <div>
                  {getEventTimeDisplay()}
                </div>
              </div>

              {location && (
                <div>
                  <div className="text-sm font-semibold text-gray-500">
                    Location
                  </div>
                  <div>{location}</div>
                </div>
              )}

              {description && (
                <div>
                  <div className="text-sm font-semibold text-gray-500">
                    Description
                  </div>
                  <div>{description}</div>
                </div>
              )}

              {event?.userId && (
                <div>
                  <div className="text-sm font-semibold text-gray-500">
                    Created By
                  </div>
                  <div>{creatorName}</div>
                </div>
              )}
            </div>

            <div className="mt-2">
              <div className="font-semibold text-gray-500">RSVPs:</div>
              {rsvpList.length === 0 ? (
                <div className="text-gray-500 text-sm">No RSVPs yet.</div>
              ) : (
                <ul className="text-sm">
                  {rsvpList.map(rsvp => (
                    <li key={rsvp.userId}>
                      <span className="font-medium">{rsvp.name}</span>: <span className="capitalize">{rsvp.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-2 flex justify-end gap-2">
              {(event?.userId === user.userId || user.userId === "f16b1510-0001-705f-8680-28689883e706") && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsConfirmOpen(true)}
                    className="btn btn-sm bg-[#E12B1F] border-0 text-white hover:bg-[#E12B1F]/70 px-[10px]"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="btn btn-sm bg-sand-beige border-0 text-black hover:bg-sand-beige/70 px-[10px]"
                  >
                    Edit
                  </button>
                </>
              )}
              {/* <button
                type="button"
                onClick={handleClose}
                className="btn h-[30px] px-[10px]"
              >
                Close
              </button> */}
            </div>

            <div className="mt-3 flex justify-between gap-2 border-t border-gray-300 pt-3">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-gray-500">
                  RSVP: 
                </div>
                <h3 className="font-extralight text-gray-500 text-sm">
                  {rsvpStatus ? rsvpStatus.charAt(0).toUpperCase() + rsvpStatus.slice(1) : '--'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRsvp('yes')}
                  className={`btn btn-sm bg-plantain-green border-0 text-white hover:bg-plantain-green/70 px-[10px]${rsvpStatus === 'yes' ? ' border-2 border-black' : ''}`}
                >Yes</button>
                <button
                  onClick={() => handleRsvp('no')}
                  className={`btn btn-sm bg-engineering-orange border-0 text-white hover:bg-engineering-orange/70 px-[10px]${rsvpStatus === 'no' ? ' border-2 border-black' : ''}`}
                >No</button>
                <button
                  onClick={() => handleRsvp('maybe')}
                  className={`btn btn-sm bg-golden-sand border-0 text-black hover:bg-golden-sand/70 px-[10px]${rsvpStatus === 'maybe' ? ' border-2 border-black' : ''}`}
                >Maybe</button>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="modal-backdrop" onClick={handleClose}>
        <button className="cursor-default">close</button>
      </div>
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        message="Are you sure you want to delete this event?"
      />
    </dialog>
  );
} 