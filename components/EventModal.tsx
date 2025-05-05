import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserNameById, getRSVPStatus, getEventRSVPs } from '@/hooks/dynamoDB';
import { CalendarEvent } from '@/context/CalendarContext';
import ConfirmationModal from './ConfirmationModal';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, start: string, userId: string, end?: string, allDay?: boolean, location?: string) => void;
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
    }
  }, [isOpen, mode]);

  useEffect(() => {
    const resetToEventValues = () => {
      try {
        if (event && mode === 'edit') {
          setTitle(event.title);
          setIsAllDay(!!event.allDay);
          setLocation(event.location || '');
          const start = new Date(event.start);
          if (!isNaN(start.getTime())) {
            setStartDate(start.toISOString().split('T')[0]);
            setStartTime(start.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5));
          }
          
          if (event.end) {
            const end = new Date(event.end);
            if (!isNaN(end.getTime())) {
              setEndDate(end.toISOString().split('T')[0]);
              setEndTime(end.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5));
            }
          }
        } else {
          const selected = new Date(selectedDate);
          if (!isNaN(selected.getTime())) {
            setTitle('');
            setIsAllDay(false);
            setLocation('');
            setStartDate(selected.toISOString().split('T')[0]);
            setStartTime('09:00');
            setEndDate(selected.toISOString().split('T')[0]);
            setEndTime('10:00');
          }
        }
      } catch (error) {
        console.error('Error resetting form:', error);
      }
    };

    resetToEventValues();
  }, [event, mode, selectedDate, setTitle, setIsAllDay, setLocation, setStartDate, setStartTime, setEndDate, setEndTime]);

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
        hour12: true
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
            endDateTime = new Date(`${endDate}T23:59:59`);
            endDateTime.setMinutes(endDateTime.getMinutes() - endDateTime.getTimezoneOffset());
          }
        } else {
          const [startHours, startMinutes] = startTime.split(':').map(Number);
          const [endHours, endMinutes] = endTime ? endTime.split(':').map(Number) : [0, 0];
          const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
          startDateTime = new Date(startYear, startMonth - 1, startDay);
          startDateTime.setHours(startHours, startMinutes, 0);

          if (endDate && endTime) {
            const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
            endDateTime = new Date(endYear, endMonth - 1, endDay);
            endDateTime.setHours(endHours, endMinutes, 0);
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
          location.trim() || undefined
        );

        // Close the modal after successful submission
        onClose();
      } catch (error) {
        console.error('Error submitting event:', error);
        alert('Please enter valid date and time values');
      }
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const handleCancel = () => {
    if (mode === 'edit') {
      // Reset all form fields individually
      if (event) {
        setTitle(event.title);
        setIsAllDay(!!event.allDay);
        setLocation(event.location || '');
        const start = new Date(event.start);
        if (!isNaN(start.getTime())) {
          setStartDate(start.toISOString().split('T')[0]);
          setStartTime(start.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5));
        }
        
        if (event.end) {
          const end = new Date(event.end);
          if (!isNaN(end.getTime())) {
            setEndDate(end.toISOString().split('T')[0]);
            setEndTime(end.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5));
          }
        }
      }
      setIsEditing(false);
    } else {
      handleClose();
    }
  };

  const handleRsvp = async (status: 'yes' | 'no' | 'maybe') => {
    setRsvpStatus(status);
    if (event?.id) {
      await rsvpEvent(event.id, status);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      setIsConfirmOpen(false);
    }
  };

  return (
    <dialog className={`modal ${isOpen ? 'modal-open' : ''}`}>
      <div className="modal-box bg-gray-100">
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
                    className="input input-bordered w-full bg-white"
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
                    className="input input-bordered w-full bg-white"
                    placeholder="Enter location (optional)"
                  />
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">All Day Event</span>
                    <input
                      type="checkbox"
                      checked={isAllDay}
                      onChange={(e) => setIsAllDay(e.target.checked)}
                      className="checkbox checkbox-primary"
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
                      className="input input-bordered bg-white"
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
                        className="input input-bordered bg-white"
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
                      className="input input-bordered bg-white"
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
                        className="input input-bordered bg-white"
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
                      className="btn btn-error"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="btn btn-primary"
                    >
                      Edit
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {mode === 'add' ? 'Add Event' : 'Save Changes'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h3 className="font-bold text-lg mb-4">{title}</h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-500">
                  {isAllDay ? 'Date' : 'Start'}
                </div>
                <div>
                  {formatDateTime(startDate, isAllDay ? undefined : startTime)}
                </div>
              </div>

              {(endDate || endTime) && (
                <div>
                  <div className="text-sm font-semibold text-gray-500">
                    End
                  </div>
                  <div>
                    {formatDateTime(endDate, isAllDay ? undefined : endTime)}
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm font-semibold text-gray-500">
                  Duration
                </div>
                <div>
                  {isAllDay ? 'All Day Event' : calculateDuration(startDate, startTime, endDate, endTime)}
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

              {event?.userId && (
                <div>
                  <div className="text-sm font-semibold text-gray-500">
                    Created By
                  </div>
                  <div>{creatorName}</div>
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="font-semibold mb-2">RSVPs:</div>
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

            <div className="modal-action">
              {(event?.userId === user.userId || user.userId === "f16b1510-0001-705f-8680-28689883e706") && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsConfirmOpen(true)}
                    className="btn btn-error"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="btn btn-primary"
                  >
                    Edit
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="btn"
              >
                Close
              </button>
            </div>

            <div className="modal-action">
              <div className="text-sm font-semibold text-gray-500">
                Your RSVP Status: {rsvpStatus ? rsvpStatus.charAt(0).toUpperCase() + rsvpStatus.slice(1) : 'Not Responded'}
              </div>
              <button onClick={() => handleRsvp('yes')} className="btn btn-success">RSVP Yes</button>
              <button onClick={() => handleRsvp('no')} className="btn btn-error">RSVP No</button>
              <button onClick={() => handleRsvp('maybe')} className="btn btn-warning">RSVP Maybe</button>
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