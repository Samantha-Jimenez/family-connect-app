'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import Navbar from "./Navbar";

export default function NavbarWrapper() {
  const { user, signOut } = useAuthenticator();
  
  if (!user) return null;
  
  return <Navbar signOut={signOut} username={user.username} />;
} 