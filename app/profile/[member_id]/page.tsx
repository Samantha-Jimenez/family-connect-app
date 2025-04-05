"use client"
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";
import { useEffect, useState } from 'react';
import { getUserData } from "@/hooks/dynamoDB";
import ProfileUserInfoCard from "@/components/ProfileUserInfoCard";
import { usePathname } from 'next/navigation';
import { fetchUserAttributes } from "aws-amplify/auth";
import UpcomingEvents from "@/components/UpcomingEvents";
import { getUserDataById } from '@/hooks/dynamoDB';
import { FamilyMember } from '@/hooks/dynamoDB';
import AlbumsCard from "@/components/AlbumsCard";
import TaggedPhotosCard from "@/components/TaggedPhotosCard";

interface UserData {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  bio: string;
  phone_number: string;
  birthday: string;
  birth_city: string;
  birth_state: string;
  profile_photo: string;
  current_city: string;
  current_state: string;
}

export default function ProfilePage() {
  const pathname = usePathname();
  const member_id = pathname.split('/').pop();
  const [memberData, setMemberData] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member_id) {
      const fetchMemberData = async () => {
        try {
          const data = await getUserDataById(member_id as string);
          if (data) {
            setMemberData({
              family_member_id: data.family_member_id?.S || '',
              first_name: data.first_name?.S || '',
              last_name: data.last_name?.S || '',
              email: data.email?.S || '',
              username: data.username?.S || '',
              bio: data.bio?.S || '',
              phone_number: data.phone_number?.S || '',
              birthday: data.birthday?.S || '',
              profile_photo: data.profile_photo?.S || '',
              current_city: data.current_city?.S || '',
              current_state: data.current_state?.S || '',
              birth_city: data.birth_city?.S || '',
              birth_state: data.birth_state?.S || '',
            });
          } else {
            setError('Member not found');
          }
        } catch (err) {
          console.error('Error fetching member data:', err);
          setError('Error fetching member data');
        } finally {
          setLoading(false);
        }
      };

      fetchMemberData();
    }
  }, [member_id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!memberData) {
    return <div>No member data available</div>;
  }

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="max-w-6xl mx-auto grid gap-6 grid-cols-1 md:grid-cols-2"> 
      {/* <h1 className="text-4xl font-bold text-center mb-6 text-[#717568]">User Profile</h1> */}
      {/* User Info */}
      <div className="col-span-1 sm:col-span-2">
        <ProfileUserInfoCard userId={member_id as string}/>
      </div>
      <div className="divider col-span-1 sm:col-span-2"></div>
      {/* Albums */}
      <AlbumsCard userId={member_id as string} auth={false}/>
      {/* <div className="divider divider-horizontal"></div> */}
      <UpcomingEvents />
      <div className="divider col-span-1 sm:col-span-2"></div>
      {/* Tagged Photos */}
      <TaggedPhotosCard userId={member_id as string} />
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
