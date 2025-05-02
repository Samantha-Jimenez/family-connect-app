"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getUserDataById } from "@/hooks/dynamoDB";
import { getFullImageUrl } from '@/utils/imageUtils';

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
  profile_photo?: string;
  current_city?: string;
  current_state?: string;
}

export default function ProfileUserInfoCard({ userId }: { userId: string }) {
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  const getZodiacSign = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-').map(num => parseInt(num));
    const monthDay = month * 100 + day; // Convert to MMDD format

    if ((monthDay >= 321 && monthDay <= 419)) return <div className="tooltip" data-tip="Aries"><span className="icon-[icon-park-outline--aries] text-base"></span></div>;
    if ((monthDay >= 420 && monthDay <= 520)) return <div className="tooltip" data-tip="Taurus"><span className="icon-[icon-park-outline--taurus] text-base"></span></div>;
    if ((monthDay >= 521 && monthDay <= 620)) return <div className="tooltip" data-tip="Gemini"><span className="icon-[icon-park-outline--gemini] text-base"></span></div>;
    if ((monthDay >= 621 && monthDay <= 722)) return <div className="tooltip" data-tip="Cancer"><span className="icon-[icon-park-outline--cancer] text-base"></span></div>;
    if ((monthDay >= 723 && monthDay <= 822)) return <div className="tooltip" data-tip="Leo"><span className="icon-[icon-park-outline--leo] text-base"></span></div>;
    if ((monthDay >= 823 && monthDay <= 922)) return <div className="tooltip" data-tip="Virgo"><span className="icon-[icon-park-outline--virgo] text-base"></span></div>;
    if ((monthDay >= 923 && monthDay <= 1022)) return <div className="tooltip" data-tip="Libra"><span className="icon-[icon-park-outline--libra] text-base"></span></div>;
    if ((monthDay >= 1023 && monthDay <= 1121)) return <div className="tooltip" data-tip="Scorpio"><span className="icon-[icon-park-outline--scorpio] text-base"></span></div>;
    if ((monthDay >= 1122 && monthDay <= 1221)) return <div className="tooltip" data-tip="Sagittarius"><span className="icon-[icon-park-outline--sagittarius] text-base"></span></div>;
    if ((monthDay >= 1222 || monthDay <= 119)) return <div className="tooltip" data-tip="Capricorn"><span className="icon-[icon-park-outline--capricornus] text-base"></span></div>;
    if ((monthDay >= 120 && monthDay <= 218)) return <div className="tooltip" data-tip="Aquarius"><span className="icon-[icon-park-outline--aquarius] text-base"></span></div>;
    return <div className="tooltip" data-tip="Pisces"><span className="icon-[icon-park-outline--pisces] text-base"></span></div>;
  };

  const formatBirthday = (dateString: any) => {
    if (!dateString) return '';
    if (typeof dateString !== 'string' || !dateString.includes('-')) {
      return '';
    }
    const [year, month, day] = dateString.split('-').map(num => parseInt(num));
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await getUserDataById(userId);
        if (data) {
          setUserData({
            first_name: data.first_name?.S || '',
            last_name: data.last_name?.S || '',
            email: data.email?.S || '',
            username: data.username?.S || '',
            bio: data.bio?.S || '',
            phone_number: data.phone_number?.S || '',
            birthday: data.birthday?.S || '',
            birth_city: data.birth_city?.S || '',
            birth_state: data.birth_state?.S || '',
            profile_photo: data.profile_photo?.S || '',
            current_city: data.current_city?.S || '',
            current_state: data.current_state?.S || '',
          });

          if (data.profile_photo?.S) {
            const photoUrl = getFullImageUrl(data.profile_photo.S);
            setProfilePhotoUrl(photoUrl);
          } else {
            setProfilePhotoUrl(null);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  return (
    <div className="rounded-3xl">
      <div className="rounded-3xl py-8 transition-all duration-300 mt-20 h-60">
        <div className="flex flex-col md:flex-row">
          <div className="text-center mb-8 md:mb-0">
            <div className="avatar bottom-24">
              <div className="w-[17rem] h-[17rem] mx-auto rounded-[60px] shadow-lg">
                {profilePhotoUrl ? (
                  <Image 
                    src={profilePhotoUrl}
                    alt="User Avatar"
                    className="rounded-[60px] object-cover"
                    width={192}
                    height={192}
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 rounded-[60px] flex items-center justify-center">
                    <span className="icon-[mdi--account] text-7xl text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="md:pl-8">
            <h1 className="text-2xl font-bold text-black">
              Welcome, {userData?.first_name || ''} {userData?.last_name || ''}!
            </h1>
            <h1 className="text-gray-500 mb-2">
              {userData?.username}
            </h1>
            {userData?.bio ? (
              <>
                <h2 className="text-xl font-semibold text-black">About Me</h2>
                <p className="text-gray-500 mb-2">
                  {userData?.bio || ''}
                </p>
              </>
            ) : ""}
            <h2 className="text-xl font-semibold text-black">Family Role</h2>
            <div className="flex flex-wrap gap-2">
              <span className="bg-[#FAE5C0] text-gray-500 px-3 py-1 rounded-full text-sm">Child</span>
              <span className="bg-[#FAE5C0] text-gray-500 px-3 py-1 rounded-full text-sm">Sibling</span>
              <span className="bg-[#FAE5C0] text-gray-500 px-3 py-1 rounded-full text-sm">Cousin</span>
            </div>
          </div>
          <div className="md:pl-8">
            {userData?.birthday ? (
              <>
                <h2 className="text-xl font-semibold text-black">Birth</h2>
                <div className="text-gray-500 flex items-center">
                  <span className="icon-[mdi--date-range] h-5 mr-2" />
                  {formatBirthday(userData.birthday)} - <span className="text-xl ml-1">{getZodiacSign(userData.birthday)}</span>
                </div>
              </>
            ) : ''}
            {userData?.birth_city || userData?.birth_state ? (
              <>
                <div className="text-gray-500 mb-2 flex items-center">
                  <span className="icon-[mdi--map-marker] h-5 mr-2" />
                  {userData.birth_city}, {userData.birth_state}
                </div>
              </>
            ) : ''}
            {userData?.email || userData?.phone_number || userData?.current_city || userData?.current_state ? (
              <>
                <h2 className="text-xl font-semibold text-black">Contact Information</h2>
                <ul className="text-gray-500">
                  {userData?.email ? (
                    <li className="flex items-center">
                      <span className="icon-[mdi--email] h-5 mr-2" />
                      {userData?.email || ''}
                    </li>
                  ) : ""}
                  {userData?.phone_number ? (
                    <li className="flex items-center">
                      <span className="icon-[mdi--phone] h-5 mr-2" />
                      {userData?.phone_number || ''}
                    </li>
                  ) : ""}
                  {userData?.current_city || userData?.current_state ? (
                    <li className="flex items-center">
                      <span className="icon-[mdi--map-marker] h-5 mr-2" />
                      {userData?.current_city && userData?.current_state 
                        ? `${userData.current_city}, ${userData.current_state}`
                        : ''}
                    </li>
                  ) : ""}
                </ul>
              </>
            ) : ""}
          </div>
        </div>
      </div>
    </div>
  );
}