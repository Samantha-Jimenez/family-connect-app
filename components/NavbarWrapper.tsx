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
  generateBirthdayNotifications,
  Notification
} from '@/hooks/dynamoDB';
import { useUser } from '@/context/UserContext';
import Select from 'react-select';
import Image from 'next/image';
import ProjectOverviewModal from './ProjectOverviewModal';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';
import { getAllFamilyMembers } from '@/hooks/dynamoDB';

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
        setUnreadCount(count);
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
  
  // Handle drawer mount/unmount for animation
  useEffect(() => {
    if (isNotificationOpen) {
      // Mount the drawer first
      setIsDrawerMounted(true);
      // Reset animation state and trigger it after a brief delay
      setShouldAnimateIn(false);
      // Use requestAnimationFrame to ensure DOM is updated before animating
      const frame1 = requestAnimationFrame(() => {
        const frame2 = requestAnimationFrame(() => {
          setShouldAnimateIn(true);
        });
      });
      
      // Mark all notifications as read when drawer opens
      if (userData?.userId && unreadCount > 0) {
        markAllNotificationsAsRead(userData.userId).then(() => {
          setUnreadCount(0);
          setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-ss-xl	">
              <h2 className="text-xl font-semibold text-gray-800">Notifications</h2>
              <button
                onClick={() => setNotificationOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
                aria-label="Close notifications drawer"
              >
                <Icon icon="mdi:close" className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-y-auto h-[calc(100%-73px)]">
              {notificationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">Loading notifications...</div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500 text-center px-6">
                    <Icon icon="mdi:bell-off-outline" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No notifications yet</p>
                  </div>
                </div>
              ) : (
                <ul className="py-2">
                  {notifications.map((notification, index) => {
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

                    const getNotificationIcon = (type: string) => {
                      switch (type) {
                        case 'birthday':
                          return 'mdi:cake-variant';
                        case 'hobby_comment':
                          return 'mdi:comment-text';
                        case 'photo_comment':
                          return 'mdi:comment-image';
                        case 'photo_tag':
                          return 'mdi:tag';
                        case 'event_rsvp':
                          return 'mdi:calendar-check';
                        default:
                          return 'mdi:bell';
                      }
                    };

                    return (
                      <li key={notification.notification_id}>
                        <div 
                          className={`block px-6 py-4 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${
                            !notification.is_read ? 'bg-blue-50' : 'bg-white'
                          }`}
                          onClick={async () => {
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
                                const allMembers = await getAllFamilyMembers();
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
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 ${!notification.is_read ? 'text-blue-500' : 'text-gray-400'}`}>
                              <Icon icon={getNotificationIcon(notification.type)} className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                                {notification.title}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {notification.message}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {formatDate(notification.created_at)}
                              </div>
                            </div>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
      </div>
    </CalendarProvider>
  );
}