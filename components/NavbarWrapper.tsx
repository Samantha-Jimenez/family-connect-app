'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import Navbar from "./Navbar";
import Footer from "./Footer";
import { CalendarProvider } from '@/context/CalendarContext';
import { Authenticator } from '@aws-amplify/ui-react';
import { useState, useEffect } from 'react';
import { getFamilyMembersWithoutEmail, FamilyMember, updateFamilyMember } from '@/hooks/dynamoDB';
import { useUser } from '@/context/UserContext';
import Select from 'react-select';
import Image from 'next/image';
import ProjectOverviewModal from './ProjectOverviewModal';
import { Icon } from '@iconify/react';

export default function NavbarWrapper({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuthenticator();
  const { userData } = useUser();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<{ value: string, label: string } | null>(null);
  const [isProjectOverviewOpen, setIsProjectOverviewOpen] = useState(false);
  const [isNotificationOpen, setNotificationOpen] = useState(false);
  const [isDrawerMounted, setIsDrawerMounted] = useState(false);
  const [shouldAnimateIn, setShouldAnimateIn] = useState(false);

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
  }, [isNotificationOpen]);
  
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
            className={`fixed top-0 right-0 h-full w-80 md:w-96 bg-white shadow-2xl z-[50] transition-transform duration-500 ease-out ${
              shouldAnimateIn ? 'translate-x-0' : 'translate-x-full'
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Notifications drawer"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
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
              <ul className="py-2">
                <li>
                  <a className="block px-6 py-4 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer border-b border-gray-100 transition-colors">
                    <div className="font-medium">Notification 1</div>
                    <div className="text-xs text-gray-500 mt-1">This is a sample notification message</div>
                  </a>
                </li>
                <li>
                  <a className="block px-6 py-4 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer border-b border-gray-100 transition-colors">
                    <div className="font-medium">Notification 2</div>
                    <div className="text-xs text-gray-500 mt-1">This is another notification message</div>
                  </a>
                </li>
                <li>
                  <a className="block px-6 py-4 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors">
                    <div className="font-medium">Notification 3</div>
                    <div className="text-xs text-gray-500 mt-1">This is a third notification message</div>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </>
      )}
      </div>
    </CalendarProvider>
  );
}