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
      <div className="bg-white rounded-3xl p-8 transition-all duration-300 shadow-lg">
        <div className="flex flex-col md:flex-row">
          {/* Left Column - Avatar and Basic Info */}
          <div className="md:w-1/3 text-center mb-8 md:mb-0">
            <div className="avatar mb-4">
              <div className="w-48 h-48 mx-auto rounded-full shadow-lg">
                <Image 
                  src={avatar.src} 
                  alt="User Avatar"
                  className="rounded-full"
                  width={192}
                  height={192}
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[#5D3A1A]">
              {user?.signInDetails?.loginId || 'Guest User'}
            </h1>
            <p className="text-[#7B4F2B] italic">Samantha Jimenez</p>
            <button className="btn btn-outline mt-2 bg-[#914F2F] text-white border-0 w-full">
              Edit Profile
            </button>
          </div>

          {/* Right Column - Details */}
          <div className="md:w-2/3 md:pl-8">
            <h2 className="text-xl font-semibold text-black mb-2">About Me</h2>
            <p className="text-gray-500 mb-6">
              Share your story with your family members. Click edit to add your bio.
            </p>

            <h2 className="text-xl font-semibold text-black mb-2">Family Role</h2>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="bg-[#FAE5C0] text-gray-500 px-3 py-1 rounded-full text-sm">Child</span>
              <span className="bg-[#FAE5C0] text-gray-500 px-3 py-1 rounded-full text-sm">Sibling</span>
              <span className="bg-[#FAE5C0] text-gray-500 px-3 py-1 rounded-full text-sm">Cousin</span>
            </div>

            <h2 className="text-xl font-semibold text-black mb-2">Contact Information</h2>
            <ul className="space-y-2 text-gray-500">
              <li className="flex items-center">
                <span className="icon-[mdi--email] w-5 h-5 mr-2 text-[#914F2F]" />
                SamanthaB.Jimenez@gmail.com
              </li>
              <li className="flex items-center">
                <span className="icon-[mdi--phone] w-5 h-5 mr-2 text-[#914F2F]" />
                (516) 637-4533
              </li>
              <li className="flex items-center">
                <span className="icon-[mdi--map-marker] w-5 h-5 mr-2 text-[#914F2F]" />
                Miami, NY
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}