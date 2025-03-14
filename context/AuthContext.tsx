'use client';

import { createContext } from 'react';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';

const AuthContext = createContext({});

function AuthStateProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthenticator();
  return (
    <>
      {auth.authStatus === 'configuring' && <div>Loading...</div>}
      {auth.authStatus === 'unauthenticated' && (
        <div className="grid items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-gray-100">
          <h3 className="text-2xl font-bold text-center mb-4">
            Sign in to your account
          </h3>
        </div>
      )}
      {auth.authStatus === 'authenticated' && children}
    </>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <Authenticator
      className="grid items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-gray-100"
      signUpAttributes={[]}
      loginMechanisms={['username', 'email']}
    >
      <AuthStateProvider>{children}</AuthStateProvider>
    </Authenticator>
  );
}

export const useAuth = useAuthenticator;