"use client";
import { useAuthenticator } from "@aws-amplify/ui-react";
import Image from "next/image";
import avatar from '../public/avatar.jpeg';

export default function UserInfoCard() {
  const { user } = useAuthenticator();
  
  // Generate a consistent avatar seed using username instead of id
//   const avatarSeed = user?.signInDetails?.loginId || 'default';

  return (
    <div className="rounded-3xl">
      <div className="bg-[#fff7ed] rounded-2xl p-8 transition-all duration-300 shadow-lg">
        <div className="flex flex-col md:flex-row">
          {/* Left Column - Avatar and Basic Info */}
          <div className="md:w-1/3 text-center mb-8 md:mb-0">
            <div className="avatar mb-4">
              <div className="w-48 h-48 mx-auto rounded-full ring ring-[#914F2F] ring-offset-[#FAE5C0] ring-offset-2 shadow-md transition-transform duration-300 hover:scale-105">
                <Image 
                  src={avatar.src} 
                  alt="User Avatar"
                  className="rounded-full"
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[#5D3A1A] mb-2">
              {user?.signInDetails?.loginId || 'Guest User'}
            </h1>
            <p className="text-[#7B4F2B] italic">Family Member</p>
            <button className="mt-4 bg-[#914F2F] hover:bg-[#7B4F2B] text-white px-6 py-2 rounded-full shadow-md transition-colors duration-300">
              Edit Profile
            </button>
          </div>

          {/* Right Column - Details */}
          <div className="md:w-2/3 md:pl-8">
            <h2 className="text-xl font-semibold text-[#5D3A1A] mb-4">About Me</h2>
            <p className="text-[#7B4F2B] mb-6">
              Share your story with your family members. Click edit to add your bio.
            </p>

            <h2 className="text-xl font-semibold text-[#5D3A1A] mb-4">Family Role</h2>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="bg-[#FAE5C0] text-[#914F2F] px-3 py-1 rounded-full text-sm">Parent</span>
              <span className="bg-[#FAE5C0] text-[#914F2F] px-3 py-1 rounded-full text-sm">Sibling</span>
              <span className="bg-[#FAE5C0] text-[#914F2F] px-3 py-1 rounded-full text-sm">Cousin</span>
            </div>

            <h2 className="text-xl font-semibold text-[#5D3A1A] mb-4">Contact Information</h2>
            <ul className="space-y-2 text-[#7B4F2B]">
              <li className="flex items-center">
                <span className="icon-[mdi--email] w-5 h-5 mr-2 text-[#914F2F]" />
                {user?.signInDetails?.loginId || 'email@example.com'}
              </li>
              <li className="flex items-center">
                <span className="icon-[mdi--phone] w-5 h-5 mr-2 text-[#914F2F]" />
                Add your phone number
              </li>
              <li className="flex items-center">
                <span className="icon-[mdi--map-marker] w-5 h-5 mr-2 text-[#914F2F]" />
                Add your location
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}