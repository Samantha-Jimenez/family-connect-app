'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { getUserData } from '@/hooks/dynamoDB';

interface UserData {
  first_name?: string;
  last_name?: string;
  email?: string;
  username?: string;
  bio?: string;
  phone_number?: string;
  birthday?: string;
  userId?: string;
  profile_photo?: string;
  city?: string;
  state?: string;
  // Add other fields as needed
}

interface UserContextType {
  userData: UserData | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthenticator();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const data = await getUserData(user.userId);
      const userAttributes = await fetchUserAttributes();
      
      if (data) {
        // Handle DynamoDB attribute types
        setUserData({
          first_name: data.first_name?.S || '',
          last_name: data.last_name?.S || '',
          email: userAttributes.email || '',
          username: data.username?.S || '',
          bio: data.bio?.S || '',
          phone_number: data.phone_number?.S || '',
          birthday: data.birthday?.S || '',
          userId: user.userId,
          profile_photo: data.profile_photo?.S || '',
          city: data.city?.S || '',
          state: data.state?.S || '',
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.userId) {
      fetchUserData();
    }
  }, [user?.userId]);

  const value = {
    userData,
    loading,
    refreshUserData: fetchUserData,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 