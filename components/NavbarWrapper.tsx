'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import Navbar from "./Navbar";
import { CalendarProvider } from '@/context/CalendarContext';
import { Authenticator } from '@aws-amplify/ui-react';

export default function NavbarWrapper({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuthenticator();
  
  // If no user, show the authentication component
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Authenticator
          signUpAttributes={[
            'birthdate',
            'email',
            // 'family_name',
            // 'middle_name',
            // 'name',
            'nickname',
            'phone_number',
          ]}
          loginMechanisms={['username', 'email']}
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
        <Navbar signOut={signOut} username={user.username} />
        <main>
          {children}
        </main>
      </div>
    </CalendarProvider>
  );
} 