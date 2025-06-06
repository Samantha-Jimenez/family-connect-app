"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getUserDataById, getFamilyRelationships } from "@/hooks/dynamoDB";
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
  death_date?: string;
}

interface Relationship {
  source_id: string;
  target_id: string;
  relationship_type: string;
}

export default function ProfileUserInfoCard({ userId }: { userId: string }) {
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [targetUserNames, setTargetUserNames] = useState<{ [userId: string]: string }>({});

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
            death_date: data.death_date?.S || '',
          });

          if (data.profile_photo?.S) {
            const photoUrl = getFullImageUrl(data.profile_photo.S);
            setProfilePhotoUrl(photoUrl);
          } else {
            setProfilePhotoUrl(null);
          }

          // Fetch relationships
          const userRelationships = await getFamilyRelationships(userId);
          setRelationships(userRelationships);

          // Fetch names for each target_id
          const names: { [userId: string]: string } = {};
          await Promise.all(
            userRelationships.map(async (relationship) => {
              if (!names[relationship.target_id]) {
                try {
                  const targetData = await getUserDataById(relationship.target_id);
                  if (targetData) {
                    const firstName = targetData.first_name?.S || '';
                    const lastName = targetData.last_name?.S || '';
                    names[relationship.target_id] = `${firstName} ${lastName}`.trim();
                  }
                } catch (e) {
                  // Optionally handle error
                }
              }
            })
          );
          setTargetUserNames(names);
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
      <div className="rounded-3xl pt-8 transition-all duration-300 md:mt-12">
        <div className="grid grid-cols-1 md:grid-cols-[286px_1fr_1fr] md:grid-rows-[min-content_min-content_min-content]">
          <div className="text-center md:h-[13rem] h-[17rem] md:row-span-2">
            <div className="avatar md:bottom-20 bottom-6">
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

          <div className="md:pl-4 xl:pl-8 md:col-span-2 mb-2">
            <h1 className="text-4xl text-black">
              {userData?.first_name || ''} {userData?.last_name || ''}
            </h1>
          </div>

          <div className="md:pl-4 xl:pl-8">
            {userData?.username ? (
              <>
                <h2 className="text-xl text-black">Username</h2>
                <p className="text-gray-500 mb-2">
                  {userData?.username}
                </p>
              </>
            ) : ""}

            <h2 className="text-xl text-black">Family Role</h2>
            <div className="flex flex-wrap gap-2 mb-2">
              {(() => {
                // 1. Filter relationships for this user
                const userRelationships = relationships.filter(
                  (relationship) => relationship.source_id === userId
                );

                // 2. Group by relationship_type
                const grouped: { [type: string]: string[] } = {};
                userRelationships.forEach((relationship) => {
                  if (!grouped[relationship.relationship_type]) {
                    grouped[relationship.relationship_type] = [];
                  }
                  grouped[relationship.relationship_type].push(relationship.target_id);
                });

                // 3. Render each relationship type once, with all names in tooltip (vertical)
                return Object.entries(grouped).map(([type, targetIds]) => (
                  <div
                    className="tooltip tooltip-bottom whitespace-pre-line"
                    data-tip={targetIds
                      .map((id) => targetUserNames[id])
                      .filter(Boolean)
                      .join("\n")}
                    key={type}
                  >
                    <span className="bg-yellow-800/60 text-white px-3 py-1 rounded-full text-sm">
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                  </div>
                ));
              })()}
            </div>
            
          </div>

          <div className="md:pl-4 xl:pl-8">
            <div className="mb-2">
              {userData?.birthday || userData?.birth_city || userData?.birth_state ? (
                <>
                  <h2 className="text-xl text-black">Birth</h2>
                </>
              ) : ""}
              {userData?.birthday ? (
                <>
                  <div className="text-gray-500 flex items-center source-sans-3">
                    <span className="icon-[mdi--date-range] h-5 mr-2" />
                    {formatBirthday(userData.birthday)} - <span className="text-xl ml-1">{getZodiacSign(userData.birthday)}</span>
                  </div>
                </>
              ) : ''}
              {userData?.birth_city || userData?.birth_state ? (
                <>
                  <div className="text-gray-500 flex items-center source-sans-3">
                    <span className="icon-[mdi--map-marker] h-5 mr-2" />
                    {userData.birth_city}, {userData.birth_state}
                  </div>
                </>
              ) : ''}
            </div>

            <div className="mb-2 md:mb-0">
            {userData?.email || userData?.phone_number || userData?.current_city || userData?.current_state ? (
              <>
                <h2 className="text-xl text-black">Contact Information</h2>
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
              <div className="mb-2">
                {userData?.death_date ? (
                  <>
                    <h2 className="text-xl text-black">Death</h2>
                    <div className="text-gray-500 flex items-center source-sans-3">
                      <span className="icon-[mdi--date-range] h-5 mr-2" />
                      {formatBirthday(userData.death_date)}
                    </div>
                  </>
                ) : ''}
              </div>
            </div>

          </div>

          <div className="md:pl-4 md:col-span-3">
            {userData?.bio ? (
              <>
                <h2 className="text-xl text-black md:row-span-2">About Me</h2>
                <p className="text-gray-500 md:row-span-2">
                  {userData?.bio || ''}
                </p>
              </>
            ) : ""}
          </div>
        </div>
      </div>
    </div>
  );
}