'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import Navbar from "./Navbar";
import { CalendarProvider } from '@/context/CalendarContext';
import { Authenticator } from '@aws-amplify/ui-react';
import { useState, useEffect } from 'react';
import { getFamilyMembersWithoutEmail, FamilyMember, updateFamilyMember } from '@/hooks/dynamoDB';
import { useUser } from '@/context/UserContext';

export default function NavbarWrapper({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuthenticator();
  const { userData } = useUser();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<string | null>(null);

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
      <div className="flex justify-center items-center min-h-screen">
        <Authenticator
          signUpAttributes={[
            'email',
          ]}
          loginMechanisms={['username', 'email']}
          components={{
            SignUp: {
              FormFields() {
                const { validationErrors, submitForm } = useAuthenticator();
    
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
                      await updateFamilyMember(selectedFamilyMember, { email, username });

                      // Proceed with the sign-up
                      await submitForm();
                    }}
                  >
                    {/* Render only the necessary form fields without the default button */}
                    <Authenticator.SignUp.FormFields />
    
                    <div className="form-control w-full max-w-xs">
                      <label htmlFor="familyMember" className="label">
                        <span className="label-text">Select Family Member:</span>
                      </label>
                      <select 
                        id="familyMember" 
                        name="familyMember" 
                        className="select select-bordered w-full max-w-xs bg-white text-black"
                        value={selectedFamilyMember || ""}
                        onChange={(e) => setSelectedFamilyMember(e.target.value)}
                      >
                        <option value="">Select a family member</option>
                        {familyMembers.map((member) => (
                          <option key={member.family_member_id} value={member.family_member_id}>
                            {member.first_name} {member.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary mt-4">Create Account</button>
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