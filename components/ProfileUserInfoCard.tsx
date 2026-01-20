"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getUserDataById, getFamilyRelationships, FamilyRelationship, getFamilyMembersWithHobby } from "@/hooks/dynamoDB";
import { getFullImageUrl } from '@/utils/imageUtils';
import FamilyRoleModal from './FamilyRoleModal';
import HobbyMembersModal from './HobbyMembersModal';
import { getSocialMediaIcon } from '@/utils/socialMediaIcons';
import { size } from "@/app/icon";

interface UserData {
  first_name: string;
  last_name: string;
  middle_name: string;
  nick_name: string;
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
  show_zodiac?: boolean;
  social_media?: { platform: string; url: string }[];
  hobbies?: string[];
  use_first_name?: boolean;
  use_middle_name?: boolean;
  use_nick_name?: boolean;
}

export default function ProfileUserInfoCard({ userId }: { userId: string }) {
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [relationships, setRelationships] = useState<FamilyRelationship[]>([]);
  const [targetUserNames, setTargetUserNames] = useState<{ [userId: string]: string }>({});
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<{ type: string; relatedNames: string[]; relatedIds: string[] } | null>(null);
  const [showHobbyModal, setShowHobbyModal] = useState(false);
  const [selectedHobby, setSelectedHobby] = useState<string | null>(null);
  const [hobbyMembers, setHobbyMembers] = useState<Array<{ id: string; name: string; profile_photo?: string }>>([]);

  // Helper function to get preferred name
  const getPreferredName = (userData: UserData | null): string => {
    if (!userData) return '';
    
    // Check preference flags and use the preferred name
    if (userData.use_nick_name && userData.nick_name && userData.nick_name.trim() !== '') {
      return userData.nick_name;
    } else if (userData.use_middle_name && userData.middle_name && userData.middle_name.trim() !== '') {
      return userData.middle_name;
    } else {
      return userData.first_name || '';
    }
  };

  // Helper function to format relationship type for display
  const formatRelationshipType = (type: string): string => {
    return type
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Helper function to get inverse relationship type
  const getInverseRelationshipType = (type: string): string => {
    switch (type) {
      case 'parent': return 'child';
      case 'child': return 'parent';
      case 'sibling': return 'sibling';
      case 'spouse': return 'spouse';
      case 'grandparent': return 'grandchild';
      case 'grandchild': return 'grandparent';
      case 'aunt': return 'niece';
      case 'uncle': return 'nephew';
      case 'niece': return 'aunt';
      case 'nephew': return 'uncle';
      case 'cousin': return 'cousin';
      case 'uncle_in_law': return 'niece_in_law';
      case 'aunt_in_law': return 'nephew_in_law';
      case 'niece_in_law': return 'uncle_in_law';
      case 'nephew_in_law': return 'aunt_in_law';
      default: return type;
    }
  };

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
    
    // Handle unknown year (1000 placeholder)
    if (year === 1000) {
      const date = new Date(2000, month - 1, day); // Use 2000 as a dummy year for formatting
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
      });
    }
    
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatPhoneNumber = (phoneNumber: string): string => {
    if (!phoneNumber) return '';
    
    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a 10-digit number
    if (digitsOnly.length === 10) {
      // Format as (XXX) XXX-XXXX
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    }
    
    // If not 10 digits, return the original (or could handle other formats)
    return phoneNumber;
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await getUserDataById(userId);
        if (data) {
          setUserData({
            first_name: data.first_name?.S || '',
            last_name: data.last_name?.S || '',
            middle_name: data.middle_name?.S || '',
            nick_name: data.nick_name?.S || '',
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
            show_zodiac: data.show_zodiac?.BOOL ?? false,
            social_media: data.social_media?.L?.map((item: any) => ({
              platform: item.M?.platform?.S || '',
              url: item.M?.url?.S || ''
            })) || [],
            hobbies: data.hobbies?.L?.map((item: any) => item.S || '') || [],
            use_first_name: data.use_first_name?.BOOL ?? true,
            use_middle_name: data.use_middle_name?.BOOL ?? false,
            use_nick_name: data.use_nick_name?.BOOL ?? false,
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

          // Fetch names for each related person
          const names: { [userId: string]: string } = {};
          await Promise.all(
            userRelationships.map(async (relationship) => {
              // Determine which person is the related person (not the current user)
              const relatedPersonId = relationship.person_a_id === userId ? relationship.person_b_id : relationship.person_a_id;
              
              if (!names[relatedPersonId]) {
                try {
                  const targetData = await getUserDataById(relatedPersonId);
                  if (targetData) {
                    const firstName = targetData.first_name?.S || '';
                    const lastName = targetData.last_name?.S || '';
                    names[relatedPersonId] = `${firstName} ${lastName}`.trim();
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
        <div className="grid grid-cols-1 md:grid-cols-[286px_1fr_1fr] md:grid-rows-[min-content_min-content_min-content_min-content] px-2 sm:px-0">
          <div className="text-center md:h-[13rem] h-[17rem] md:row-span-2">
            <div className="avatar md:bottom-10 bottom-6">
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
              {userData?.first_name || ''} {userData?.nick_name && `"${userData?.nick_name}"` || ''} {userData?.middle_name || ''} {userData?.last_name || ''}
            </h1>
          </div>

          <div className="md:pl-4 xl:pl-8">
            {/* {userData?.username ? (
              <>
                <h2 className="text-xl text-black">Username</h2>
                <p className="text-gray-500 mb-2">
                  {userData?.username}
                </p>
              </>
            ) : ""} */}

            <h2 className="text-xl text-black">Family Role</h2>
            <p className="text-gray-500 text-xs mb-1">{getPreferredName(userData)} is a(n) ...</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {(() => {
                // 1. Filter relationships for this user (user can be either person_a or person_b)
                const userRelationships = relationships.filter(
                  (relationship) => relationship.person_a_id === userId || relationship.person_b_id === userId
                );

                // 2. Group by relationship_type
                const grouped: { [type: string]: Set<string> } = {};
                userRelationships.forEach((relationship) => {
                  // Determine which person is the related person (not the current user)
                  const relatedPersonId = relationship.person_a_id === userId ? relationship.person_b_id : relationship.person_a_id;
                  
                  // Use the actual relationship type from the user's perspective
                  // If the user is person_a, use the relationship_type directly
                  // If the user is person_b, we need to find the reverse relationship
                  let relationshipTypeFromUserPerspective: string;
                  
                  if (relationship.person_a_id === userId) {
                    // User is person_a, so use the relationship type directly
                    relationshipTypeFromUserPerspective = relationship.relationship_type;
                  } else {
                    // User is person_b, so we need to find the reverse relationship
                    // Look for a relationship where the user is person_a and the other person is person_b
                    const reverseRelationship = userRelationships.find(rel => 
                      rel.person_a_id === userId && 
                      rel.person_b_id === relationship.person_a_id &&
                      rel.relationship_id !== relationship.relationship_id
                    );
                    
                    if (reverseRelationship) {
                      // Use the actual reverse relationship type
                      relationshipTypeFromUserPerspective = reverseRelationship.relationship_type;
                    } else {
                      // Fallback to hardcoded inverse (for backward compatibility)
                      relationshipTypeFromUserPerspective = getInverseRelationshipType(relationship.relationship_type);
                    }
                  }
                  
                  if (!grouped[relationshipTypeFromUserPerspective]) {
                    grouped[relationshipTypeFromUserPerspective] = new Set();
                  }
                  grouped[relationshipTypeFromUserPerspective].add(relatedPersonId);
                });

                // 3. Render each relationship type once, with all names in tooltip (vertical)
                return Object.entries(grouped).map(([type, targetIdsSet], index) => {
                  const targetIds = Array.from(targetIdsSet);
                  const relatedNames = targetIds
                    .map((id) => targetUserNames[id])
                    .filter(Boolean);
                  
                  return (
                    // <div
                    //   className="tooltip tooltip-bottom whitespace-pre-line opacity-0 animate-[fadeIn_0.4s_ease-in_forwards]"
                    //   data-tip={relatedNames.join("\n")}
                    //   key={type}
                    //   style={{ animationDelay: `${index * 0.1}s` }}
                    // >
                      <span 
                        className="text-palm-green bg-tea-green/30 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-tea-green/60 transition-colors opacity-0 animate-[fadeIn_0.4s_ease-in_forwards]"
                        onClick={() => {
                          setSelectedRole({ type, relatedNames, relatedIds: targetIds });
                          setShowRoleModal(true);
                        }}
                        key={type}
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        {formatRelationshipType(type)}
                      </span>
                    // </div>
                  );
                });
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
                    {formatBirthday(userData.birthday)}
                    {userData.show_zodiac && (
                      <> - <span className="text-xl ml-1">{getZodiacSign(userData.birthday)}</span></>
                    )}
                  </div>
                </>
              ) : ''}
              {userData?.birth_city || userData?.birth_state ? (
                <>
                  <div className="text-gray-500 flex items-center source-sans-3">
                    <span className="icon-[mdi--map-marker] h-5 mr-2" />
                    {userData.birth_city && userData.birth_state 
                      ? `${userData.birth_city}, ${userData.birth_state}`
                      : userData.birth_city || userData.birth_state}
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
                      {formatPhoneNumber(userData.phone_number)}
                    </li>
                  ) : ""}
                  {userData?.current_city || userData?.current_state ? (
                    <li className="flex items-center">
                      <span className="icon-[mdi--map-marker] h-5 mr-2" />
                      {userData?.current_city && userData?.current_state 
                        ? `${userData.current_city}, ${userData.current_state}`
                        : userData.current_city || userData.current_state}
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
            <div className="md:pl-4 xl:pl-8 md:col-start-2 md:col-span-2">
              {userData?.social_media && userData.social_media.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-3">
                    {userData.social_media.map((link, index) => {
                      const IconComponent = getSocialMediaIcon(link.platform);
                      const platformName = link.platform.charAt(0).toUpperCase() + link.platform.slice(1);
                      return (
                        <div
                          key={index}
                          className="tooltip tooltip-bottom opacity-0 animate-[fadeIn_0.4s_ease-in_forwards] tooltip-desktop-only !z-10 after:!z-20 before:!z-20 hover:!z-20 "
                          data-tip={platformName}
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 text-gray-700 hover:text-gray-900"
                            title={platformName}
                          >
                            <IconComponent className="w-5 h-5" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : ""}
            </div>


          <div className="md:pl-4 md:col-span-3">
            {userData?.bio ? (
              <>
                <h2 className="text-xl text-black md:row-span-2">About Me</h2>
                <p className="text-gray-500 md:row-span-2 whitespace-pre-line">
                  {userData?.bio || ''}
                </p>
              </>
            ) : (
              <div className="h-10"></div>
            )}
          </div>

          {/* Hobbies Section */}
          {userData?.hobbies && userData.hobbies.length > 0 && (
            <div className="md:pl-4 md:col-span-3 mt-4">
              <div className="flex flex-wrap gap-2">
                {userData.hobbies.map((hobby, index) => (
                  <button
                    key={index}
                    onClick={async () => {
                      setSelectedHobby(hobby);
                      const members = await getFamilyMembersWithHobby(hobby);
                      setHobbyMembers(members);
                      setShowHobbyModal(true);
                    }}
                    className="text-giants-orange bg-carrot-orange/20 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-carrot-orange/30 transition-colors opacity-0 animate-[fadeIn_0.4s_ease-in_forwards]"
                  >
                    <span>{hobby}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Family Role Modal */}
      {showRoleModal && selectedRole && (
        <FamilyRoleModal
          isOpen={showRoleModal}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedRole(null);
          }}
          userName={`${userData?.first_name || ''} ${userData?.last_name || ''}`}
          relationshipType={selectedRole.type}
          relatedUserNames={selectedRole.relatedNames}
          relatedUserIds={selectedRole.relatedIds}
        />
      )}

      {/* Hobby Members Modal */}
      {showHobbyModal && selectedHobby && (
        <HobbyMembersModal
          isOpen={showHobbyModal}
          onClose={() => {
            setShowHobbyModal(false);
            setSelectedHobby(null);
            setHobbyMembers([]);
          }}
          hobby={selectedHobby}
          members={hobbyMembers}
        />
      )}
    </div>
  );
}