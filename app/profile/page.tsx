"use client"
import { useAuthenticator } from "@aws-amplify/ui-react";
import { useEffect, useState } from 'react';
import { getUserData } from "../hooks/dynamoDB";
import ProfileUserInfoCard from "@/components/ProfileUserInfoCard";
import { usePathname } from 'next/navigation';
import { fetchUserAttributes } from "aws-amplify/auth";
import UpcomingEvents from "@/components/UpcomingEvents";

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
    <div className="min-h-screen p-6 bg-white">
      <div className="max-w-6xl mx-auto grid gap-6 grid-cols-1 md:grid-cols-2"> 
      {/* <h1 className="text-4xl font-bold text-center mb-6 text-[#717568]">User Profile</h1> */}
      {/* User Info */}
      <div className="col-span-1 sm:col-span-2">
        <ProfileUserInfoCard currentPath={pathname} />
      </div>
      <div className="divider col-span-1 sm:col-span-2"></div>
      {/* Albums */}
      <div className="card bg-white text-black shadow-lg p-6">
        <h2 className="text-xl font-bold">📸 Albums</h2>
        <p className="mt-2">View and organize your photo albums.</p>
        <button className="btn btn-outline mt-4 bg-[#ffdaad] border-0 text-gray-700">Go to Albums</button>
      </div>
      {/* <div className="divider divider-horizontal"></div> */}
      <UpcomingEvents />
      <div className="divider col-span-1 sm:col-span-2"></div>
      {/* Tagged Photos */}
      <div className="card bg-white text-black shadow-lg p-6 col-span-1 sm:col-span-2">
        <h2 className="text-xl font-bold">🏷️ Tagged Photos</h2>
        <p className="mt-2">See all photos you are tagged in.</p>
        <button className="btn btn-outline mt-4 bg-[#ffdaad] border-0 text-gray-700">View Tags</button>
      </div>
      <div className="divider col-span-1 sm:col-span-2"></div>
      {/* Family Tree */}
      <div className="card bg-white text-black shadow-lg p-6 col-span-1 sm:col-span-2">
        <h2 className="text-xl font-bold">🌳 Family Tree</h2>
        <p className="mt-2">Explore your family connections.</p>
        <button className="btn btn-outline mt-4 bg-[#717568] text-white border-0">View Family Tree</button>
      </div>
      
      {/* Events */}
        {/* <div className="card bg-white text-black shadow-lg p-6">
          <h2 className="text-xl font-bold">📅 Upcoming Events</h2>
          <p className="mt-2">Check family gatherings and birthdays.</p>
          <button className="btn btn-outline mt-4 bg-[#717568] text-white border-0">View Events</button>
        </div> */}
      </div>
    </div>
  );
}