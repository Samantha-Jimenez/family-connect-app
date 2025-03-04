'use client';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import awsconfig from '../aws-exports';
import { ToastProvider } from '@/context/ToastContext';
import { Providers } from '../app/providers';
import { UserProvider } from '@/context/UserContext';

Amplify.configure(awsconfig);

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Authenticator.Provider>
      <ToastProvider>
        <UserProvider>
          <Providers>
            {children}
          </Providers>
        </UserProvider>
      </ToastProvider>
    </Authenticator.Provider>
  );
} 