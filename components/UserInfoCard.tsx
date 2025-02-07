"use client";
import Image from "next/image";
import avatar from '../public/avatar.jpeg';
import { useEffect, useState } from "react";
import { getUserData } from "@/app/hooks/dynamoDB";
import { useAuthenticator } from "@aws-amplify/ui-react";
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

export default function UserInfoCard({ currentPath }: { currentPath: string }) {
    const [userData, setUserData] = useState<UserData | null>(null);
    const { user } = useAuthenticator();
    
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
                setUserData({
                    first_name: '',
                    last_name: '',
                    email: '',
                    username: '',
                    bio: '',
                    phone_number: '',
                    birthday: '',
                });
            }
        };
        fetchUserData();
    }, [user]);

  // Generate a consistent avatar seed using username instead of id
    //   const avatarSeed = userData?.username || 'default';

  return (
    <div className="rounded-3xl">
      <div className="rounded-3xl p-8 transition-all duration-300 mt-20 h-60">
        <div className="flex flex-col md:flex-row">
          {/* Left Column - Avatar and Basic Info */}
          <div className="md:w-2/3 text-center mb-8 md:mb-0">
            <div className="avatar bottom-24">
              <div className="w-[17rem] h-[17rem] mx-auto rounded-[60px] shadow-lg">
                <Image 
                  src={avatar.src} 
                  alt="User Avatar"
                  className="rounded-[60px]"
                  width={192}
                  height={192}
                />
              </div>
            </div>
            {currentPath !== '/profile' && (
                <button className="btn btn-outline mt-2 bg-[#914F2F] text-white border-0 w-full">
                    Edit Profile
                </button>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="md:w-2/3 md:pl-8">
            <h1 className="text-2xl font-bold text-[#5D3A1A]">
              {userData?.username || 'Guest User'}
            </h1>
            <p className="text-[#7B4F2B] italic">
              {userData?.first_name || ''} {userData?.last_name || ''}
            </p>
            <h2 className="text-xl font-semibold text-black mb-1">About Me</h2>
            <p className="text-gray-500 mb-2">
              {userData?.bio || ''}
            </p>
            <h2 className="text-xl font-semibold text-black mb-1">Family Role</h2>
            <div className="flex flex-wrap gap-2">
              <span className="bg-[#FAE5C0] text-gray-500 px-3 py-1 rounded-full text-sm">Child</span>
              <span className="bg-[#FAE5C0] text-gray-500 px-3 py-1 rounded-full text-sm">Sibling</span>
              <span className="bg-[#FAE5C0] text-gray-500 px-3 py-1 rounded-full text-sm">Cousin</span>
            </div>
          </div>
          <div className="md:w-2/3 md:pl-8">
          <h2 className="text-xl font-semibold text-black mb-2">Birthday</h2>
            <p className="text-gray-500 mb-4">
              {userData?.birthday || ''}
            </p>
            <h2 className="text-xl font-semibold text-black mb-1">Contact Information</h2>
            <ul className="text-gray-500">
              <li className="flex items-center">
                <span className="icon-[mdi--email] w-5 h-5 mr-2 text-[#914F2F]" />
                {userData?.email || ''}
              </li>
              <li className="flex items-center">
                <span className="icon-[mdi--phone] w-5 h-5 mr-2 text-[#914F2F]" />
                {userData?.phone_number || ''}
              </li>
              <li className="flex items-center">
                <span className="icon-[mdi--map-marker] w-5 h-5 mr-2 text-[#914F2F]" />
                XXXXX, XX
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}