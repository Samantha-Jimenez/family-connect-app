'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import Navbar from "./Navbar";
import Footer from "./Footer";
import { CalendarProvider } from '@/context/CalendarContext';
import { Authenticator } from '@aws-amplify/ui-react';
import { useState, useEffect } from 'react';
import { 
  getFamilyMembersWithoutEmail, 
  FamilyMember, 
  updateFamilyMember,
  getNotificationsByUser,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllReadNotifications,
  generateBirthdayNotifications,
  generateEventReminderNotifications,
  Notification,
  getAllFamilyMembers,
  getFamilyMembersWithHobby,
  getPhotoById,
  PhotoData,
  getUserNameById
} from '@/hooks/dynamoDB';
import { useUser } from '@/context/UserContext';
import Select from 'react-select';
import Image from 'next/image';
import ProjectOverviewModal from './ProjectOverviewModal';
import HobbyMembersModal from './HobbyMembersModal';
import PhotoModal from './PhotoModal';
import NotificationPreferencesModal, { getNotificationPreferences } from './NotificationPreferencesModal';
import { getNotificationPreferencesFromDB } from '@/hooks/dynamoDB';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';

export default function NavbarWrapper({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuthenticator();
  const { userData } = useUser();
  const router = useRouter();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<{ value: string, label: string } | null>(null);
  const [isProjectOverviewOpen, setIsProjectOverviewOpen] = useState(false);
  const [isNotificationOpen, setNotificationOpen] = useState(false);
  const [isDrawerMounted, setIsDrawerMounted] = useState(false);
  const [shouldAnimateIn, setShouldAnimateIn] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsPerPage, setNotificationsPerPage] = useState(20); // Number of notifications to show initially
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'birthday' | 'comments' | 'events' | 'tags'>('all');
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState<{ disabledTypes: string[] }>({ disabledTypes: [] });
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<Set<string>>(new Set());
  const [isHobbyModalOpen, setIsHobbyModalOpen] = useState(false);
  const [selectedHobby, setSelectedHobby] = useState<string | null>(null);
  const [hobbyMembers, setHobbyMembers] = useState<Array<{ id: string; name: string; profile_photo?: string }>>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [photoUploaderName, setPhotoUploaderName] = useState<string | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isPhotoEditing, setIsPhotoEditing] = useState(false);

  useEffect(() => {
    async function fetchFamilyMembers() {
      try {
        const data = await getFamilyMembersWithoutEmail();
        setFamilyMembers(data);
      } catch (error) {
        console.error('Error fetching family members:', error);
      }
    }
    fetchFamilyMembers();
  }, []);

  // Fetch notifications and unread count
  useEffect(() => {
    async function fetchNotifications() {
      if (!userData?.userId) return;
      
      try {
        setNotificationsLoading(true);
        const [notifs, count] = await Promise.all([
          getNotificationsByUser(userData.userId),
          getUnreadNotificationCount(userData.userId)
        ]);
        setNotifications(notifs);
        // Load and filter unread count by preferences
        const preferences = await getNotificationPreferencesFromDB(userData.userId);
        setNotificationPreferences(preferences);
        const visibleNotifications = notifs.filter(n => !preferences.disabledTypes.includes(n.type as any));
        const visibleUnreadCount = visibleNotifications.filter(n => !n.is_read).length;
        setUnreadCount(visibleUnreadCount);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setNotificationsLoading(false);
      }
    }

    fetchNotifications();
    
    // Refresh notifications every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userData?.userId]);

  // Generate birthday notifications on mount
  // Note: The function has duplicate checking, but for production consider moving this to a scheduled Lambda function
  useEffect(() => {
    async function generateNotifications() {
      if (!userData?.userId) return;
      
      try {
        await generateBirthdayNotifications();
        // Refresh notifications after generating
        const [notifs, count] = await Promise.all([
          getNotificationsByUser(userData.userId!),
          getUnreadNotificationCount(userData.userId!)
        ]);
        setNotifications(notifs);
        setUnreadCount(count);
      } catch (error) {
        console.error('Error generating birthday notifications:', error);
      }
    }

    // Generate notifications when user logs in
    if (userData?.userId) {
      generateNotifications();
    }
  }, [userData?.userId]);

  // Generate event reminder notifications on mount
  useEffect(() => {
    async function generateEventReminders() {
      if (!userData?.userId) return;
      
      try {
        // Get events from localStorage
        const savedEvents = typeof window !== 'undefined' ? localStorage.getItem('calendarEvents') : null;
        if (!savedEvents) return;
        
        const events = JSON.parse(savedEvents);
        if (!events || events.length === 0) return;
        
        // Convert events to the format expected by generateEventReminderNotifications
        const eventsForReminders = events.map((e: any) => ({
          id: e.id,
          title: e.title,
          start: e.start
        }));
        
        await generateEventReminderNotifications(eventsForReminders);
        // Refresh notifications after generating
        const [notifs, count] = await Promise.all([
          getNotificationsByUser(userData.userId!),
          getUnreadNotificationCount(userData.userId!)
        ]);
        setNotifications(notifs);
        setUnreadCount(count);
      } catch (error) {
        console.error('Error generating event reminder notifications:', error);
      }
    }

    // Generate reminders when user logs in
    if (userData?.userId) {
      // Small delay to ensure localStorage is ready
      const timeout = setTimeout(() => {
        generateEventReminders();
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [userData?.userId]);
  
  // Handle drawer mount/unmount for animation
  useEffect(() => {
    if (isNotificationOpen) {
      // Mount the drawer first
      setIsDrawerMounted(true);
      // Reset animation state and trigger it after a brief delay
      setShouldAnimateIn(false);
      // Reset pagination, filter, and selection when drawer opens
      setNotificationsPerPage(20);
      setNotificationFilter('all');
      setIsSelectionMode(false);
      setSelectedNotificationIds(new Set());
      // Use requestAnimationFrame to ensure DOM is updated before animating
      const frame1 = requestAnimationFrame(() => {
        const frame2 = requestAnimationFrame(() => {
          setShouldAnimateIn(true);
        });
      });
      
      // Mark all notifications as read when drawer opens
      if (userData?.userId && unreadCount > 0) {
        const userId = userData.userId;
        markAllNotificationsAsRead(userId).then(async () => {
          setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
          // Reload preferences and recalculate unread count
          const preferences = await getNotificationPreferencesFromDB(userId);
          setNotificationPreferences(preferences);
          const visibleNotifications = notifications.filter(n => !preferences.disabledTypes.includes(n.type as any));
          const visibleUnreadCount = visibleNotifications.filter(n => !n.is_read).length;
          setUnreadCount(visibleUnreadCount);
        }).catch(error => {
          console.error('Error marking notifications as read:', error);
        });
      }
      
      return () => {
        cancelAnimationFrame(frame1);
      };
    } else {
      // Start exit animation
      setShouldAnimateIn(false);
      // Then unmount after animation completes
      const timeout = setTimeout(() => {
        setIsDrawerMounted(false);
        // Reset pagination, filter, and selection when drawer closes
        setNotificationsPerPage(20);
        setNotificationFilter('all');
        setIsSelectionMode(false);
        setSelectedNotificationIds(new Set());
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isNotificationOpen, userData?.userId, unreadCount]);
  
  // If no user, show the authentication component
  if (!user) {
    return (
      <div className="flex justify-center items-stretch min-h-screen">
        <div className="grid lg:grid-cols-2 items-center max-w-6xl max-lg:max-w-[30rem] w-full justify-center">
          <div className="px-6 py-16 lg:pt-0">
            <h1 className="text-5xl leading-[57px] text-slate-900 font-bold text-british-racing-green">
              <Image 
                src="/OurRootline.png" 
                alt="Our Rootline" 
                width={400}
                height={200}
                className="w-full h-auto max-w-lg"
                priority
                quality={100}
                style={{
                  imageRendering: 'crisp-edges'
                }}
              />
            </h1>
            <h3 className="font-light mt-8 text-slate-500 leading-relaxed">
              This is our shared space to celebrate memories, explore our family tree, and stay connected. Sign in to view and share photos, find birthdays, and discover our roots. 
              <br/> Don't have an account yet? Create one and join the family online.
            </h3>
            <h3 className="font-light mt-8 text-slate-500">
              Aren't a family member? Don't worry, an app overview page is on its way!
              {/* <button onClick={() => setIsProjectOverviewOpen(true)} className="text-lighter-brown hover:text-highlight-brown font-medium hover:underline ml-1">View project overview.</button> */}
            </h3>
          </div>

          <div className="w-full mb-12">
            <Authenticator
              signUpAttributes={[
                'email',
              ]}
              loginMechanisms={['username', 'email']}
              components={{
                SignUp: {
                  Header() {
                    const { submitForm } = useAuthenticator();

                    const familyMemberOptions = familyMembers.map((member) => ({
                       value: member.family_member_id,
                       label: `${member.first_name} ${member.last_name}`,
                     }));

                    // Handle submit in the footer button
                    return (
                      <>
                      <div className="form-control w-full gap-1 grid mb-[-20px] px-8">
                      <label htmlFor="familyMember" className="label !pb-0">
                        <span className="label-text text-base text-[#304050]">Select Family Member</span>
                      </label>
                      <Select
                        inputId="familyMember"
                        name="familyMember"
                        classNamePrefix="react-select"
                        options={familyMemberOptions}
                        value={selectedFamilyMember}
                        onChange={(option) => setSelectedFamilyMember(option)}
                        placeholder="Select a Family Member"
                        isClearable
                        menuPlacement="bottom"
                        menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
                        styles={{
                          control: (base, state) => ({
                            ...base,
                            borderColor: state.isFocused
                              ? '#C8D5B9'
                              : state.menuIsOpen
                              ? '#D2FF28'
                              : 'rgb(209 213 219 / var(--tw-border-opacity, 1))',
                            boxShadow: state.isFocused || state.menuIsOpen ? '0 0 0 2px #5CAB68' : undefined,
                            height: '42px',
                            '&:hover': { borderColor: '#D2FF28' },
                          }),
                          menu: (base) => ({
                            ...base, zIndex: 9999, maxHeight: '40vh',
                          }),
                          placeholder: (base) => ({ ...base, color: '#9BA3AF' }),
                          indicatorSeparator: (base) => ({ ...base, height: '100%', marginTop: '0px' }),
                          dropdownIndicator: (base) => ({
                            ...base, width: '50px', textAlignLast: 'center', display: 'flow', padding: '0px', color: 'black',
                          }),
                          option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isFocused ? '#E8D4B8' : 'transparent',
                            color: '#000',
                            '&:active': { backgroundColor: '#F4C47A', color: '#fff' },
                          }),
                        }}
                      />
                    </div>
                      </>
                    );
                  },
                },
              }}
            >
              {({ signOut, user }) => (
                <main>
                  <h1>Hello {user?.username}</h1>
                  <button onClick={signOut}>Sign out</button>
                </main>
              )}
            </Authenticator>
          </div>
        </div>
        
        {/* Project Overview Modal */}
        <ProjectOverviewModal 
          isOpen={isProjectOverviewOpen} 
          onClose={() => setIsProjectOverviewOpen(false)} 
        />
      </div>
    );
  }
  
  return (
    <CalendarProvider>
      <div className="flex flex-col min-h-screen">
        <Navbar 
          signOut={signOut} 
          username={user.username || 'Guest'} 
          userFirstName={userData?.first_name || 'First Name'} 
          userLastName={userData?.last_name || 'Last Name'}
          userId={userData?.userId || ''}
          onNotificationClick={() => setNotificationOpen(true)}
          unreadNotificationCount={unreadCount}
        />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />

      {/* Notification Drawer */}
      {isDrawerMounted && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-black z-[40] transition-opacity duration-500 ease-out ${
              shouldAnimateIn ? 'opacity-50' : 'opacity-0'
            }`}
            onClick={() => setNotificationOpen(false)}
            style={{ pointerEvents: shouldAnimateIn ? 'auto' : 'none' }}
            aria-hidden="true"
          />
          
          {/* Drawer */}
          <div
            className={`fixed top-0 right-0 h-full w-80 md:w-96 bg-white shadow-2xl z-[50] transition-transform duration-500 ease-out rounded-ss-xl	rounded-es-xl ${
              shouldAnimateIn ? 'translate-x-0' : 'translate-x-full'
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Notifications drawer"
          >
            <div className="border-b border-gray-200 bg-gray-50 rounded-ss-xl">
              <div className="flex items-center justify-between px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-800 transition-all duration-300">
                  {isSelectionMode ? (
                    <span className="animate-[fadeIn_0.2s_ease-out]">
                      {selectedNotificationIds.size} selected
                    </span>
                  ) : (
                    'Notifications'
                  )}
                </h2>
                <div className="flex items-center gap-2">
                  {isSelectionMode ? (
                    <>
                      <button
                        onClick={() => {
                          setIsSelectionMode(false);
                          setSelectedNotificationIds(new Set());
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-all duration-200 hover:scale-105 active:scale-95"
                        aria-label="Cancel selection"
                        title="Cancel selection"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsSelectionMode(true)}
                        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-200 transition-all duration-200 hover:scale-110 active:scale-95"
                        aria-label="Select notifications"
                        title="Select notifications"
                      >
                        <Icon icon="mdi:checkbox-multiple-outline" className="w-5 h-5 transition-transform duration-200" />
                      </button>
                      <button
                        onClick={() => setIsPreferencesModalOpen(true)}
                        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                        aria-label="Notification preferences"
                        title="Notification preferences"
                      >
                        <Icon icon="mdi:cog-outline" className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  {notifications.some(n => n.is_read) && (
                    <button
                      onClick={async () => {
                        if (!userData?.userId) return;
                        try {
                          await deleteAllReadNotifications(userData.userId);
                          const [notifs, count] = await Promise.all([
                            getNotificationsByUser(userData.userId),
                            getUnreadNotificationCount(userData.userId)
                          ]);
                          setNotifications(notifs);
                          setUnreadCount(count);
                        } catch (error) {
                          console.error('Error deleting read notifications:', error);
                        }
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                      aria-label="Clear all read notifications"
                      title="Clear all read notifications"
                    >
                      Clear read
                    </button>
                  )}
                  <button
                    onClick={() => setNotificationOpen(false)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
                    aria-label="Close notifications drawer"
                  >
                    <Icon icon="mdi:close" className="w-6 h-6" />
                  </button>
                </div>
              </div>
              {/* Filter buttons */}
              <div className="px-6 pb-3 flex gap-2 overflow-x-auto">
                {(['all', 'birthday', 'comments', 'events', 'tags'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setNotificationFilter(filter);
                      setNotificationsPerPage(20); // Reset pagination when filter changes
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                      notificationFilter === filter
                        ? 'bg-plantain-green text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                    }`}
                    aria-label={`Filter by ${filter}`}
                  >
                    {filter === 'all' ? 'All' : filter === 'comments' ? 'Comments' : filter === 'events' ? 'Events' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto h-[calc(100%-130px)]">
              {notificationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">Loading notifications...</div>
                </div>
              ) : (() => {
                // Filter notifications based on user preferences first
                const preferenceFilteredNotifications = notifications.filter(notification => {
                  return !notificationPreferences.disabledTypes.includes(notification.type as any);
                });
                
                // Then filter based on selected filter
                const filteredNotifications = preferenceFilteredNotifications.filter(notification => {
                  if (notificationFilter === 'all') return true;
                  if (notificationFilter === 'birthday') return notification.type === 'birthday';
                  if (notificationFilter === 'comments') return notification.type === 'hobby_comment' || notification.type === 'photo_comment';
                  if (notificationFilter === 'events') return notification.type === 'event_rsvp' || notification.type === 'event_reminder' || notification.type === 'event_cancelled';
                  if (notificationFilter === 'tags') return notification.type === 'photo_tag';
                  return true;
                });

                if (filteredNotifications.length === 0) {
                  return (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-gray-500 text-center px-6">
                        <Icon icon="mdi:bell-off-outline" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No {notificationFilter === 'all' ? '' : notificationFilter} notifications</p>
                      </div>
                    </div>
                  );
                }

                const displayedNotifications = filteredNotifications.slice(0, notificationsPerPage);

                return (
                  <>
                    {/* Bulk action bar when in selection mode */}
                    {isSelectionMode && selectedNotificationIds.size > 0 && (
                      <div className="px-6 py-3 border-b border-gray-200 bg-blue-50 flex items-center justify-between sticky top-0 z-10 animate-[slideDown_0.3s_ease-out]">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const filteredIds = displayedNotifications.map((n: Notification) => n.notification_id);
                              const allSelected = filteredIds.length > 0 && filteredIds.every((id: string) => selectedNotificationIds.has(id));
                              if (allSelected) {
                                setSelectedNotificationIds(new Set());
                              } else {
                                setSelectedNotificationIds(new Set(filteredIds));
                              }
                            }}
                            className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                          >
                            {(() => {
                              const filteredIds = displayedNotifications.map((n: Notification) => n.notification_id);
                              const allSelected = filteredIds.length > 0 && filteredIds.every((id: string) => selectedNotificationIds.has(id));
                              return allSelected ? 'Deselect all' : 'Select all';
                            })()}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              if (!userData?.userId) return;
                              try {
                                const selectedIds = Array.from(selectedNotificationIds);
                                const unreadSelected = notifications.filter(n => selectedIds.includes(n.notification_id) && !n.is_read);
                                for (const notification of unreadSelected) {
                                  await markNotificationAsRead(notification.notification_id, userData.userId);
                                }
                                const [notifs, count] = await Promise.all([
                                  getNotificationsByUser(userData.userId),
                                  getUnreadNotificationCount(userData.userId)
                                ]);
                                setNotifications(notifs);
                                const preferences = await getNotificationPreferencesFromDB(userData.userId);
                                setNotificationPreferences(preferences);
                                const visibleNotifications = notifs.filter(n => !preferences.disabledTypes.includes(n.type as any));
                                const visibleUnreadCount = visibleNotifications.filter(n => !n.is_read).length;
                                setUnreadCount(visibleUnreadCount);
                                setSelectedNotificationIds(new Set());
                                setIsSelectionMode(false);
                              } catch (error) {
                                console.error('Error marking selected notifications as read:', error);
                              }
                            }}
                            className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                            aria-label="Mark selected as read"
                          >
                            Mark read ({selectedNotificationIds.size})
                          </button>
                          <button
                            onClick={async () => {
                              if (!userData?.userId) return;
                              if (!confirm(`Delete ${selectedNotificationIds.size} notification(s)?`)) return;
                              try {
                                const selectedIds = Array.from(selectedNotificationIds);
                                for (const notificationId of selectedIds) {
                                  await deleteNotification(notificationId, userData.userId);
                                }
                                const [notifs, count] = await Promise.all([
                                  getNotificationsByUser(userData.userId),
                                  getUnreadNotificationCount(userData.userId)
                                ]);
                                setNotifications(notifs);
                                const preferences = await getNotificationPreferencesFromDB(userData.userId);
                                setNotificationPreferences(preferences);
                                const visibleNotifications = notifs.filter(n => !preferences.disabledTypes.includes(n.type as any));
                                const visibleUnreadCount = visibleNotifications.filter(n => !n.is_read).length;
                                setUnreadCount(visibleUnreadCount);
                                setSelectedNotificationIds(new Set());
                                setIsSelectionMode(false);
                              } catch (error) {
                                console.error('Error deleting selected notifications:', error);
                              }
                            }}
                            className="text-xs text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                            aria-label="Delete selected"
                          >
                            Delete ({selectedNotificationIds.size})
                          </button>
                        </div>
                      </div>
                    )}
                    <ul className="py-2">
                      {displayedNotifications.map((notification, index) => {
                    const formatDate = (dateString: string) => {
                      const date = new Date(dateString);
                      const now = new Date();
                      const diffTime = now.getTime() - date.getTime();
                      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
                      const diffMinutes = Math.floor(diffTime / (1000 * 60));
                      
                      if (diffMinutes < 1) return 'Just now';
                      if (diffMinutes < 60) return `${diffMinutes}m ago`;
                      if (diffHours < 24) return `${diffHours}h ago`;
                      if (diffDays === 1) return 'Yesterday';
                      if (diffDays < 7) return `${diffDays}d ago`;
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
                    };

                    const getNotificationIcon = (type: string, title?: string, metadata?: Record<string, any>) => {
                      switch (type) {
                        case 'birthday':
                          return 'mdi:cake-variant';
                        case 'hobby_comment':
                          return 'mdi:comment-text-multiple';
                        case 'photo_comment':
                          // Use different icon for "New comment on a photo you're tagged in"
                          if (title === "New comment on a photo you're tagged in") {
                            return 'mdi:comment-account';
                          }
                          return 'mdi:comment-plus';
                        case 'photo_tag':
                          return 'mdi:account-tag';
                        case 'event_rsvp':
                          // Use specific icons based on RSVP status
                          if (metadata?.rsvp_status) {
                            const rsvpStatus = metadata.rsvp_status;
                            if (rsvpStatus === 'yes') {
                              return 'mdi:event-available';
                            } else if (rsvpStatus === 'maybe') {
                              return 'mdi:event-question';
                            } else if (rsvpStatus === 'no') {
                              return 'mdi:event-busy';
                            }
                          }
                          // Default fallback
                          return 'mdi:calendar-check';
                        case 'event_reminder':
                          // Check if this is a new event notification
                          if (metadata?.is_new_event === true) {
                            return 'mdi:event-add';
                          }
                          // Use specific icons based on days until event
                          if (metadata?.days_until !== undefined) {
                            const daysUntil = metadata.days_until;
                            if (daysUntil === 30) {
                              return 'mdi:event-clock';
                            } else if (daysUntil === 7) {
                              return 'mdi:event-auto';
                            } else if (daysUntil === 1) {
                              return 'mdi:event-alert';
                            } else if (daysUntil === 0) {
                              return 'mdi:event-star';
                            }
                          }
                          // Default fallback
                          return 'mdi:calendar-clock';
                        case 'event_cancelled':
                          return 'mdi:event-remove';
                        default:
                          return 'mdi:bell';
                      }
                    };

                    return (
                      <li 
                        key={notification.notification_id}
                        className="animate-[notificationEnter_0.3s_ease-out]"
                        style={{
                          animationDelay: `${index * 0.03}s`,
                          animationFillMode: 'both'
                        }}
                      >
                        <div 
                          className={`block px-6 py-3 text-sm hover:bg-gray-50 border-b border-gray-200 transition-all duration-300 group ${
                            !notification.is_read ? 'bg-blue-50' : 'bg-white'
                          } ${selectedNotificationIds.has(notification.notification_id) ? 'bg-blue-100 shadow-sm' : ''}`}
                        >
                          <div
                            className={isSelectionMode ? "" : "cursor-pointer"}
                            onClick={async () => {
                              if (isSelectionMode) return; // Don't navigate when in selection mode
                            if (!notification.is_read && userData?.userId) {
                              try {
                                await markNotificationAsRead(notification.notification_id, userData.userId);
                                setNotifications(prev => 
                                  prev.map(n => 
                                    n.notification_id === notification.notification_id 
                                      ? { ...n, is_read: true } 
                                      : n
                                  )
                                );
                                setUnreadCount(prev => Math.max(0, prev - 1));
                              } catch (error) {
                                console.error('Error marking notification as read:', error);
                              }
                            }
                            // Navigate to calendar event modal for birthday notifications
                            if (notification.related_id && notification.type === 'birthday') {
                              try {
                                // Get the member's birthday to calculate the correct event ID
                                const allMembers = await getAllFamilyMembers(user?.userId);
                                const member = allMembers.find(m => m.family_member_id === notification.related_id);
                                
                                if (member?.birthday) {
                                  // Calculate which year's birthday event to show
                                  const today = new Date();
                                  const currentYear = today.getFullYear();
                                  const dateStr = member.birthday.split('T')[0];
                                  const [birthYear, month, day] = dateStr.split('-').map(Number);
                                  
                                  if (month && day) {
                                    // Calculate the next birthday year
                                    const thisYearBirthday = new Date(currentYear, month - 1, day);
                                    const nextBirthdayYear = thisYearBirthday < today ? currentYear + 1 : currentYear;
                                    
                                    // Construct the event ID (matches the format used in calendar page)
                                    const eventId = `birthday-${notification.related_id}-${nextBirthdayYear}`;
                                    
                                    // Navigate to calendar with event ID
                                    setNotificationOpen(false);
                                    router.push(`/calendar?eventId=${eventId}`);
                                  }
                                }
                              } catch (error) {
                                console.error('Error navigating to birthday event:', error);
                              }
                            }
                            
                            // Open hobby modal for hobby comment notifications
                            if (notification.related_id && notification.type === 'hobby_comment') {
                              try {
                                const hobbyName = notification.related_id;
                                // Fetch members for this hobby
                                const members = await getFamilyMembersWithHobby(hobbyName);
                                setSelectedHobby(hobbyName);
                                setHobbyMembers(members);
                                setNotificationOpen(false);
                                setIsHobbyModalOpen(true);
                              } catch (error) {
                                console.error('Error opening hobby modal:', error);
                              }
                            }
                            
                            // Open photo modal for photo comment and photo tag notifications
                            if (notification.related_id && (notification.type === 'photo_comment' || notification.type === 'photo_tag')) {
                              try {
                                const photoId = notification.related_id;
                                // Fetch photo data
                                const photo = await getPhotoById(photoId);
                                
                                if (photo) {
                                  // Fetch uploader name
                                  const uploaderNameData = await getUserNameById(photo.uploaded_by);
                                  const uploaderName = uploaderNameData 
                                    ? `${uploaderNameData.firstName} ${uploaderNameData.lastName}` 
                                    : null;
                                  
                                  setSelectedPhoto(photo);
                                  setPhotoUploaderName(uploaderName);
                                  setIsPhotoEditing(false);
                                  setNotificationOpen(false);
                                  setIsPhotoModalOpen(true);
                                }
                              } catch (error) {
                                console.error('Error opening photo modal:', error);
                              }
                            }
                            
                            // Navigate to calendar event modal for RSVP notifications
                            if (notification.related_id && notification.type === 'event_rsvp') {
                              try {
                                const eventId = notification.related_id;
                                // Navigate to calendar with event ID
                                setNotificationOpen(false);
                                router.push(`/calendar?eventId=${eventId}`);
                              } catch (error) {
                                console.error('Error navigating to RSVP event:', error);
                              }
                            }
                            
                            // Navigate to calendar event modal for event reminder notifications
                            if (notification.related_id && notification.type === 'event_reminder') {
                              try {
                                const eventId = notification.related_id;
                                // Navigate to calendar with event ID
                                setNotificationOpen(false);
                                router.push(`/calendar?eventId=${eventId}`);
                              } catch (error) {
                                console.error('Error navigating to event reminder:', error);
                              }
                            }
                            
                            // Navigate to calendar for cancelled event notifications
                            // (event may not exist anymore, so just navigate to calendar)
                            if (notification.type === 'event_cancelled') {
                              try {
                                setNotificationOpen(false);
                                router.push('/calendar');
                              } catch (error) {
                                console.error('Error navigating to calendar:', error);
                              }
                            }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              {isSelectionMode && (
                                <div className="mt-0.5 flex-shrink-0 animate-[checkboxAppear_0.2s_ease-out]">
                                  <label className="flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={selectedNotificationIds.has(notification.notification_id)}
                                      onChange={(e) => {
                                        const newSelected = new Set(selectedNotificationIds);
                                        if (e.target.checked) {
                                          newSelected.add(notification.notification_id);
                                        } else {
                                          newSelected.delete(notification.notification_id);
                                        }
                                        setSelectedNotificationIds(newSelected);
                                      }}
                                      className={`w-4 h-4 text-plantain-green border-gray-300 rounded focus:ring-plantain-green focus:ring-2 transition-all duration-200 ${
                                        selectedNotificationIds.has(notification.notification_id) 
                                          ? 'scale-110 ring-2 ring-plantain-green ring-offset-1' 
                                          : ''
                                      }`}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </label>
                                </div>
                              )}
                              <div className={`mt-0.5 flex-shrink-0 transition-all duration-200 ${!notification.is_read ? 'text-blue-500' : 'text-gray-400'} ${selectedNotificationIds.has(notification.notification_id) ? 'scale-110' : ''}`}>
                                <Icon icon={getNotificationIcon(notification.type, notification.title, notification.metadata)} className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0 transition-all duration-200">
                                <div className={`font-medium transition-colors duration-200 ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'} ${selectedNotificationIds.has(notification.notification_id) ? 'font-semibold' : ''}`}>
                                  {notification.title}
                                </div>
                                <div className="text-sm text-gray-500 mt-1 font-extralight transition-colors duration-200">
                                  {notification.message}
                                </div>
                                <div className="text-xs text-gray-400 mt-1 font-extralight">
                                  {formatDate(notification.created_at)}
                                </div>
                              </div>
                              {!notification.is_read && (
                                <div className={`w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0 transition-all duration-200 ${selectedNotificationIds.has(notification.notification_id) ? 'scale-125' : ''}`}></div>
                              )}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!userData?.userId) return;
                                  try {
                                    await deleteNotification(notification.notification_id, userData.userId);
                                    const [notifs, count] = await Promise.all([
                                      getNotificationsByUser(userData.userId),
                                      getUnreadNotificationCount(userData.userId)
                                    ]);
                                    setNotifications(notifs);
                                    setUnreadCount(count);
                                  } catch (error) {
                                    console.error('Error deleting notification:', error);
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-200 transition-all duration-200 ml-auto flex-shrink-0 hover:scale-110"
                                aria-label="Delete notification"
                                title="Delete notification"
                              >
                                <Icon icon="mdi:delete-outline" className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                </li>
                    );
                      })}
                    </ul>
                    {filteredNotifications.length > notificationsPerPage && (
                      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <button
                          onClick={() => setNotificationsPerPage(prev => prev + 20)}
                          className="w-full py-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
                          aria-label="Load more notifications"
                        >
                          Load More ({filteredNotifications.length - notificationsPerPage} remaining)
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* Hobby Members Modal */}
      {isHobbyModalOpen && selectedHobby && (
        <HobbyMembersModal
          isOpen={isHobbyModalOpen}
          onClose={() => {
            setIsHobbyModalOpen(false);
            setSelectedHobby(null);
            setHobbyMembers([]);
          }}
          hobby={selectedHobby}
          members={hobbyMembers}
        />
      )}

      {/* Photo Modal */}
      {isPhotoModalOpen && selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          uploaderName={photoUploaderName}
          currentUserId={userData?.userId || null}
          isEditing={isPhotoEditing}
          setIsEditing={setIsPhotoEditing}
          closeModal={() => {
            setIsPhotoModalOpen(false);
            setSelectedPhoto(null);
            setPhotoUploaderName(null);
          }}
          handleImageError={() => {}}
          renderEditForm={() => <></>}
          onPhotoDeleted={() => {
            setIsPhotoModalOpen(false);
            setSelectedPhoto(null);
            setPhotoUploaderName(null);
          }}
          onPhotoUpdated={(updatedPhoto) => {
            setSelectedPhoto(updatedPhoto);
          }}
        />
      )}

      {/* Notification Preferences Modal */}
      {userData?.userId && (
        <NotificationPreferencesModal
          isOpen={isPreferencesModalOpen}
          onClose={() => {
            setIsPreferencesModalOpen(false);
            // Refresh notifications to apply preferences
            const userId = userData?.userId;
            if (userId) {
              Promise.all([
                getNotificationsByUser(userId),
                getNotificationPreferencesFromDB(userId)
              ]).then(([notifs, preferences]) => {
                setNotifications(notifs);
                setNotificationPreferences(preferences);
                const visibleNotifications = notifs.filter(n => !preferences.disabledTypes.includes(n.type as any));
                const visibleUnreadCount = visibleNotifications.filter(n => !n.is_read).length;
                setUnreadCount(visibleUnreadCount);
              });
            }
          }}
          userId={userData.userId}
        />
      )}
      </div>
    </CalendarProvider>
  );
}