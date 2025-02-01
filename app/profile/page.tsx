"use client"
import { useAuthenticator } from "@aws-amplify/ui-react";
import { useEffect, useState } from 'react';
import { getUserData } from "../hooks/dynamoDB";
import UserInfoCard from "@/components/UserInfoCard";
import { usePathname } from 'next/navigation';
import { fetchUserAttributes } from "aws-amplify/auth";

interface UserData {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  bio: string;
  phone_number: string;
  birthday: string;
}

export default function PublicProfile() {
  const { user } = useAuthenticator();
  const [userData, setUserData] = useState<UserData | null>(null);
  const pathname = usePathname();
  
  useEffect(() => {
    const fetchUserData = async () => {
      const data = await getUserData(user.userId);
      const userAttributes = await fetchUserAttributes();
      if (data) {
        setUserData({
          first_name: data.first_name?.S || '',
          last_name: data.last_name?.S || '',
          email: userAttributes.email || '',
          username: data.username?.S || '',
          bio: data.bio?.S || '',
          phone_number: data.phone_number?.S || '',
          birthday: data.birthday?.S || '',
        });
      } else {
        setUserData({ first_name: '', last_name: '', email: '', username: '', bio: '', phone_number: '', birthday: '' });
      }
    };

    fetchUserData();
  }, [user]);

  if (!userData) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
     <div className="max-w-6xl mx-auto p-6 grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
{/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-w-6xl mx-auto"> */}
      {/* User Info */}
      <div className="col-span-1 sm:col-span-2">
        <UserInfoCard currentPath={pathname} />
      </div>
      {/* Albums */}
      <div className="card bg-base-100 shadow-xl flex flex-col items-center p-6 text-center">
        <div className="w-12 h-12 mb-3 text-blue-500">📸</div>
        <h3 className="text-lg font-semibold">Albums</h3>
        <p className="text-gray-500">View and organize your photo albums.</p>
        <button className="btn btn-secondary mt-3">Go to Albums</button>
      </div>
      
      {/* Tagged Photos */}
      <div className="card bg-base-100 shadow-xl flex flex-col items-center p-6 text-center">
        <div className="w-12 h-12 mb-3 text-green-500">🏷️</div>
        <h3 className="text-lg font-semibold">Tagged Photos</h3>
        <p className="text-gray-500">See all photos you are tagged in.</p>
        <button className="btn btn-secondary mt-3">View Tags</button>
      </div>
      
      {/* Family Tree */}
      <div className="card bg-base-100 shadow-xl flex flex-col items-center p-6 text-center">
        <div className="w-12 h-12 mb-3 text-purple-500">🌳</div>
        <h3 className="text-lg font-semibold">Family Tree</h3>
        <p className="text-gray-500">Explore your family connections.</p>
        <button className="btn btn-secondary mt-3">View Family Tree</button>
      </div>
      
      {/* Events */}
      <div className="card bg-base-100 shadow-xl flex flex-col items-center p-6 text-center">
        <div className="w-12 h-12 mb-3 text-red-500">📅</div>
        <h3 className="text-lg font-semibold">Upcoming Events</h3>
        <p className="text-gray-500">Check family gatherings and birthdays.</p>
        <button className="btn btn-secondary mt-3">View Events</button>
      </div>
    </div>
  );
}