'use client';

import { Amplify } from 'aws-amplify';
import awsconfig from '../aws-exports';
import { Authenticator } from '@aws-amplify/ui-react';
import { useEffect, useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    Amplify.configure(awsconfig);
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return <Authenticator.Provider>{children}</Authenticator.Provider>;
} 