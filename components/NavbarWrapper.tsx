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
      <div className="flex justify-center items-stretch min-h-screen">
        <div className="grid lg:grid-cols-2 items-center max-w-6xl max-lg:max-w-[30rem] w-full justify-center">
          <div className="px-6 py-16 lg:pt-0">
            <h1 className="text-5xl leading-[57px] text-slate-900 font-bold text-british-racing-green">
              Family Connect App
            </h1>
            <h3 className="font-light mt-12 text-slate-500 leading-relaxed">This is our shared space to celebrate memories, explore our family tree, and stay connected. Sign in to view and share photos, find birthdays, and discover our roots. 
              <br/> Don't have an account yet? Create one and join the family online.</h3>
            <h3 className="font-light mt-8 text-slate-500">Aren't a family member? <a href="javascript:void(0);" className="text-lighter-brown hover:text-highlight-brown font-medium hover:underline ml-1">View a demo here.</a></h3>
          </div>

          <div className="w-full mb-12">
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
                            firstName: '',
                            lastName: '',
                            email, 
                            username,
                            bio: '',
                            phoneNumber: '',
                            birthday: '',
                            birth_city: '',
                            birth_state: '',
                            profile_photo: '', // or some default profile photo URL
                            current_city: '',
                            current_state: '',
                            death_date: '',
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
                            // menuPlacement="auto"
                            // menuPosition="fixed"
                            menuPlacement="bottom"
                            menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
                            styles={{
                              control: (base, state) => ({
                                ...base,
                                borderColor: state.isFocused
                                  ? '#C8D5B9' // 🌿 focused border
                                  : state.menuIsOpen
                                  ? '#D2FF28' // open menu border
                                  : 'rgb(209 213 219 / var(--tw-border-opacity, 1))', // default border
                                boxShadow: state.isFocused || state.menuIsOpen ? '0 0 0 2px #5CAB68' : undefined,
                                height: '42px',
                                '&:hover': {
                                  borderColor: '#D2FF28',
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
                                backgroundColor: state.isFocused ? '#E8D4B8' : 'transparent',
                                color: state.isFocused ? '#000' : '#000',
                                '&:active': {
                                  backgroundColor: '#F4C47A',
                                  color: '#fff',
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