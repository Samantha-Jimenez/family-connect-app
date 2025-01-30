"use client"
import { useAuthenticator } from "@aws-amplify/ui-react";
import { useEffect, useState } from 'react';

interface CognitoAuthSignInDetails {
  loginId?: string;
}

interface UserData {
  username: string;
  signInDetails?: CognitoAuthSignInDetails;
  attributes?: {
    email?: string;
    name?: string;
  };
}

export default function PublicProfile() {
  const { user } = useAuthenticator();
  const [userData, setUserData] = useState<UserData | null>(null);
  
  useEffect(() => {
    if (user) {
      // Cast the user to UserData type since we know the structure matches
      setUserData(user as unknown as UserData);
    }
  }, [user]);

  if (!userData) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <p className="text-2xl font-bold mb-6">Profile</p>
      <div className="card w-[30rem] bg-base-100 shadow-xl p-6 mx-auto">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold mb-4">
            {userData.signInDetails?.loginId?.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold">{userData.signInDetails?.loginId}</h1>
        </div>
        
        <div className="space-y-4">
          <div className="relative z-0 w-full mb-5 group">
            <p className="block py-2.5 px-0 w-full text-sm bg-transparent border-0 border-b-2 border-gray-300 appearance-none text-white">
              <strong className="text-gray-500">Username:</strong> {userData.username}
            </p>
          </div>
          
          <div className="relative z-0 w-full mb-5 group">
            <p className="block py-2.5 px-0 w-full text-sm bg-transparent border-0 border-b-2 border-gray-300 appearance-none text-white">
              <strong className="text-gray-500">Email:</strong> {userData.attributes?.email || 'Not provided'}
            </p>
          </div>
          
          <div className="relative z-0 w-full mb-5 group">
            <p className="block py-2.5 px-0 w-full text-sm bg-transparent border-0 border-b-2 border-gray-300 appearance-none text-white">
              <strong className="text-gray-500">Full Name:</strong> {userData.attributes?.name || 'Not provided'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}