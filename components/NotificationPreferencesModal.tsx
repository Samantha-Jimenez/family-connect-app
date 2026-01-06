'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

export type NotificationType = 'birthday' | 'hobby_comment' | 'photo_comment' | 'photo_tag' | 'event_rsvp' | 'event_reminder' | 'event_cancelled';

export interface NotificationPreferences {
  disabledTypes: NotificationType[];
}

const NOTIFICATION_TYPE_INFO: Record<NotificationType, { label: string; description: string; icon: string }> = {
  birthday: {
    label: 'Birthdays',
    description: 'Notifications for upcoming family member birthdays',
    icon: 'mdi:cake-variant'
  },
  hobby_comment: {
    label: 'Hobby Comments',
    description: 'Comments on shared hobbies',
    icon: 'mdi:comment-text-multiple'
  },
  photo_comment: {
    label: 'Photo Comments',
    description: 'Comments on photos you uploaded or are tagged in',
    icon: 'mdi:comment-plus'
  },
  photo_tag: {
    label: 'Photo Tags',
    description: 'When someone tags you in a photo',
    icon: 'mdi:account-tag'
  },
  event_rsvp: {
    label: 'Event RSVPs',
    description: 'RSVP updates for events you created',
    icon: 'mdi:calendar-check'
  },
  event_reminder: {
    label: 'Event Reminders',
    description: 'Reminders for upcoming events (30 days, 7 days, 1 day, day of)',
    icon: 'mdi:calendar-clock'
  },
  event_cancelled: {
    label: 'Event Cancellations',
    description: 'Notifications when events you RSVP\'d to are cancelled',
    icon: 'mdi:event-remove'
  }
};

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const NOTIFICATION_PREFERENCES_KEY = 'notification_preferences';

// Legacy localStorage fallback (for migration)
export const getNotificationPreferences = async (userId: string): Promise<NotificationPreferences> => {
  // Try DynamoDB first
  try {
    const { getNotificationPreferencesFromDB } = await import('@/hooks/dynamoDB');
    return await getNotificationPreferencesFromDB(userId);
  } catch (error) {
    console.error('Error loading preferences from DB, trying localStorage:', error);
  }
  
  // Fallback to localStorage (for backward compatibility during migration)
  if (typeof window !== 'undefined') {
    try {
      const key = `${NOTIFICATION_PREFERENCES_KEY}_${userId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const prefs = JSON.parse(stored);
        // Migrate to DB on next save
        return prefs;
      }
    } catch (error) {
      console.error('Error loading notification preferences from localStorage:', error);
    }
  }
  
  return { disabledTypes: [] };
};

export const saveNotificationPreferences = async (userId: string, preferences: NotificationPreferences): Promise<void> => {
  try {
    const { saveNotificationPreferencesToDB } = await import('@/hooks/dynamoDB');
    await saveNotificationPreferencesToDB(userId, preferences);
    
    // Also clear localStorage after successful DB save (migration cleanup)
    if (typeof window !== 'undefined') {
      try {
        const key = `${NOTIFICATION_PREFERENCES_KEY}_${userId}`;
        localStorage.removeItem(key);
      } catch (error) {
        // Ignore localStorage errors during cleanup
      }
    }
  } catch (error) {
    console.error('Error saving notification preferences to DB:', error);
    throw error;
  }
};

export default function NotificationPreferencesModal({
  isOpen,
  onClose,
  userId
}: NotificationPreferencesModalProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({ disabledTypes: [] });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      getNotificationPreferences(userId).then(saved => {
        setPreferences(saved);
        setHasChanges(false);
      }).catch(error => {
        console.error('Error loading preferences:', error);
        setPreferences({ disabledTypes: [] });
        setHasChanges(false);
      });
    }
  }, [isOpen, userId]);

  const toggleNotificationType = (type: NotificationType) => {
    setPreferences(prev => {
      const isDisabled = prev.disabledTypes.includes(type);
      const newDisabledTypes = isDisabled
        ? prev.disabledTypes.filter(t => t !== type)
        : [...prev.disabledTypes, type];
      
      setHasChanges(true);
      return { disabledTypes: newDisabledTypes };
    });
  };

  const handleSave = async () => {
    if (userId) {
      setIsSaving(true);
      try {
        await saveNotificationPreferences(userId, preferences);
        setHasChanges(false);
        onClose();
      } catch (error) {
        console.error('Error saving preferences:', error);
        alert('Failed to save preferences. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleCancel = () => {
    if (isOpen && userId) {
      getNotificationPreferences(userId).then(saved => {
        setPreferences(saved);
        setHasChanges(false);
      }).catch(error => {
        console.error('Error loading preferences:', error);
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black z-[60] transition-opacity duration-300 ease-out opacity-50"
        onClick={handleCancel}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Notification preferences"
      >
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Notification Preferences</h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Close preferences modal"
            >
              <Icon icon="mdi:close" className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <p className="text-sm text-gray-600 mb-6">
              Choose which types of notifications you'd like to receive. Disabled notification types will be hidden from your notification list.
            </p>

            <div className="space-y-3">
              {(Object.keys(NOTIFICATION_TYPE_INFO) as NotificationType[]).map((type) => {
                const info = NOTIFICATION_TYPE_INFO[type];
                const isDisabled = preferences.disabledTypes.includes(type);

                return (
                  <div
                    key={type}
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-colors ${
                      isDisabled
                        ? 'bg-gray-50 border-gray-200 opacity-60'
                        : 'bg-white border-gray-200 hover:border-plantain-green'
                    }`}
                  >
                    <div className={`mt-1 ${isDisabled ? 'text-gray-400' : 'text-plantain-green'}`}>
                      <Icon icon={info.icon} className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-medium ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
                          {info.label}
                        </h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!isDisabled}
                            onChange={() => toggleNotificationType(type)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-plantain-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-plantain-green"></div>
                        </label>
                      </div>
                      <p className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-600'}`}>
                        {info.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                hasChanges && !isSaving
                  ? 'bg-plantain-green hover:bg-plantain-green/90'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

