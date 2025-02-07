import React, { useState, useEffect } from 'react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, start: string, end?: string, allDay?: boolean, location?: string) => void;
  onDelete?: () => void;
  selectedDate: string;
  event?: {
    id?: string;
    title: string;
    start: string;
    end?: string;
    allDay?: boolean;
    location?: string;
  } | null;
  mode?: 'add' | 'edit';
}

export default function EventModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  selectedDate,
  event,
  mode = 'add'
}: EventModalProps) {
  const [isEditing, setIsEditing] = useState(mode === 'add');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');

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
          // Create dates in local timezone
          const [startHours, startMinutes] = startTime.split(':').map(Number);
          const [endHours, endMinutes] = endTime ? endTime.split(':').map(Number) : [0, 0];

          // Parse the date strings and create Date objects
          const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
          startDateTime = new Date(startYear, startMonth - 1, startDay);
          startDateTime.setHours(startHours, startMinutes, 0);

          if (endDate && endTime) {
            const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
            endDateTime = new Date(endYear, endMonth - 1, endDay);
            endDateTime.setHours(endHours, endMinutes, 0);
          }
        }
        
        // Validate dates
        if (isNaN(startDateTime.getTime())) {
          throw new Error('Invalid start date/time');
        }
        if (endDateTime && isNaN(endDateTime.getTime())) {
          throw new Error('Invalid end date/time');
        }
        
        onSubmit(
          title.trim(), 
          startDateTime.toISOString(), 
          endDateTime?.toISOString(),
          isAllDay,
          location.trim() || undefined
        );
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

  return (
    <dialog className={`modal ${isOpen ? 'modal-open' : ''}`}>
      <div className="modal-box">
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
                    className="input input-bordered w-full"
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
                    className="input input-bordered w-full"
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
                      className="checkbox"
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
                      className="input input-bordered"
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
                        className="input input-bordered"
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
                      className="input input-bordered"
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
                        className="input input-bordered"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-action">
                {mode === 'edit' && onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="btn btn-error"
                  >
                    Delete
                  </button>
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
            </div>

            <div className="modal-action">
              <button
                type="button"
                onClick={onDelete}
                className="btn btn-error"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="btn"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="btn btn-primary"
              >
                Edit
              </button>
            </div>
          </>
        )}
      </div>
      <div className="modal-backdrop" onClick={handleClose}>
        <button className="cursor-default">close</button>
      </div>
    </dialog>
  );
} 