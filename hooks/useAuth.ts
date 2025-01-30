"use client";
import { getCurrentUser, AuthUser } from '@aws-amplify/auth';
import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    async function checkUser() {
      try {
        const currentUser = await getCurrentUser();
        setUser(
            currentUser);
      } catch (err) {
        setUser(null);
      }
    }
    checkUser();
  }, []);

  return { user };
} 