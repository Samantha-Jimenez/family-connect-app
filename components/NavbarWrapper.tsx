'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import Navbar from "./Navbar";
import { CalendarProvider } from '@/context/CalendarContext';
import { Authenticator } from '@aws-amplify/ui-react';
import { useState, useEffect } from 'react';
import { getFamilyMembersWithoutEmail, FamilyMember, updateFamilyMember } from '@/hooks/dynamoDB';
import { useUser } from '@/context/UserContext';
import Select from 'react-select';

export default function NavbarWrapper({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuthenticator();
  const { userData } = useUser();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<{ value: string, label: string } | null>(null);

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
  
  // If no user, show the authentication component
  if (!user) {
    return (
      <div className="flex justify-center items-center p-8 min-h-screen">
        <div className="grid lg:grid-cols-2 items-center gap-10 max-w-6xl max-lg:max-w-md w-full justify-center">
          <div>
            <h2 className="lg:text-5xl text-3xl font-bold lg:leading-[57px] text-slate-900 poppins-thin">
              Family Connect App
            </h2>
            <p className="text-sm mt-6 text-slate-500 leading-relaxed source-sans-3">This is our shared space to celebrate memories, explore our family tree, and stay connected. Sign in to view and share photos, find birthdays, and discover our roots. 
              <br/> Don't have an account yet? Create one and join the family online.</p>
            <p className="text-sm mt-12 text-slate-500 source-sans-3">Aren't a family member? <a href="javascript:void(0);" className="text-blue-600 font-medium hover:underline ml-1">View a demo here.</a></p>
          </div>

          <div className="m-auto w-full">
            <Authenticator
              signUpAttributes={[
                'email',
              ]}
              loginMechanisms={['username', 'email']}
              components={{
                SignUp: {
                  FormFields() {
                    const { validationErrors, submitForm } = useAuthenticator();
        
                    // Convert familyMembers to react-select options
                    const familyMemberOptions = familyMembers.map((member) => ({
                      value: member.family_member_id,
                      label: `${member.first_name} ${member.last_name}`,
                    }));

                    return (
                      <form
                        onSubmit={async (event) => {
                          event.preventDefault();
                          if (!selectedFamilyMember) {
                            alert("Please select a family member.");
                            return;
                          }
                          const formData = new FormData(event.target as HTMLFormElement);
                          const email = formData.get('email') as string;
                          const username = formData.get('username') as string;
                          // Add other fields as needed

                          // Update the family member in the database
                          await updateFamilyMember(selectedFamilyMember.value, { 
                            email, 
                            username,
                            profile_photo: '' // or some default profile photo URL
                          });

                          // Proceed with the sign-up
                          await submitForm();
                        }}
                        className="mb-4"
                      >
                        {/* Render only the necessary form fields without the default button */}
        
                        <div className="form-control w-full gap-1 grid mb-[5px]">
                          <label htmlFor="familyMember" className="label">
                            <span className="label-text text-[#304050]">Select Family Member</span>
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
                            menuPlacement="auto"
                            menuPosition="fixed"
                            menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
                            styles={{
                              control: (base, state) => ({
                                ...base,
                                borderColor: state.isFocused || state.menuIsOpen ? 'green' : '#89949f',
                                boxShadow: state.isFocused || state.menuIsOpen ? '0 0 0 2px rgba(0, 128, 0, 0.2)' : undefined,
                                height: '42px',
                                '&:hover': {
                                  borderColor: state.isFocused || state.menuIsOpen ? 'green' : '#89949f',
                                },
                              }),
                              menu: (base) => ({
                                ...base,
                                zIndex: 9999,
                                maxHeight: '40vh',
                              }),
                              placeholder: (base) => ({
                                ...base,
                                color: '#9BA3AF',
                              }),
                              indicatorSeparator: (base) => ({
                                ...base,
                                height: '100%',
                                marginTop: '0px',
                              }),
                              dropdownIndicator: (base) => ({
                                ...base,
                                width: '50px',
                                textAlignLast: 'center',
                                display: 'flow',
                                padding: '0px',
                                color: 'black',
                              }),
                              option: (base, state) => ({
                                ...base,
                                backgroundColor: state.isFocused ? 'white' : state.isSelected ? 'green' : '#F4F2E6',
                                '&:active': {
                                  backgroundColor: state.isFocused ? '#B19071' : 'white',
                                },
                                '&:hover': {
                                  color: state.isFocused ? 'black' : '',
                                },
                              }),
                            }}
                          />
                        </div>
                        <Authenticator.SignUp.FormFields/>

                      </form>
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
      </div>
    );
  }
  
  return (
    <CalendarProvider>
      <div>
        <Navbar 
          signOut={signOut} 
          username={user.username || 'Guest'} 
          userFirstName={userData?.first_name || 'First Name'} 
          userLastName={userData?.last_name || 'Last Name'}
          userId={userData?.userId || ''}
        />
        <main>
          {children}
        </main>
      </div>
    </CalendarProvider>
  );
} 