import React, { createContext, useContext, useState } from 'react';

interface UserData {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  bio: string;
  phone_number: string;
  birthday: string;
  profile_photo?: string;
  city?: string;
  state?: string;
}

interface UserContextType {
  userData: UserData | null;
  setUserData: React.Dispatch<React.SetStateAction<UserData | null>>;
  refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);

  const refreshUserData = async () => {
    // This will be implemented when we need it
    // For now it's a placeholder for future functionality
  };

  return (
    <UserContext.Provider value={{ userData, setUserData, refreshUserData }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 