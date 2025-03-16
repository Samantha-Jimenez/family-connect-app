"use client";
import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { familyTreeData } from './familyTreeData';
import { getAllFamilyMembers } from "@/hooks/dynamoDB";
import { FamilyMember as FamilyMemberType } from "@/hooks/dynamoDB";
import Image from "next/image";
import { getFullImageUrl } from "@/utils/imageUtils";

// Define FamilyMemberProps type
export type FamilyMemberProps = {
  id?: string;
  first_name: string;
  last_name: string;
  profile_photo?: string;
  spouse?: {
    id?: string;
    first_name: string;
    last_name: string;
    profile_photo?: string;
  };
  previousSpouses?: {
    id?: string;
    first_name: string;
    last_name: string;
    profile_photo?: string;
    children: FamilyMemberProps[];
  }[];
  children?: FamilyMemberProps[];
};

// Define a Partial type for FamilyMember
type PartialFamilyMember = Pick<FamilyMemberType, 'family_member_id' | 'first_name' | 'last_name' | 'profile_photo'>;

// Function to match and update familyTreeData with DB members
const updateFamilyTreeData = (membersFromDB: PartialFamilyMember[], familyTreeData: FamilyMemberProps) => {
  const updateMember = (member: FamilyMemberProps) => {
    const dbMember = membersFromDB.find(dbMem => dbMem.first_name === member.first_name && dbMem.last_name.includes(member.last_name));
    if (dbMember) {
      member.id = dbMember.family_member_id;
      member.first_name = dbMember.first_name;
      member.last_name = dbMember.last_name;
      member.profile_photo = dbMember.profile_photo;
    }
    member.children?.forEach(updateMember);
    member.previousSpouses?.forEach(spouse => spouse.children.forEach(updateMember));
  };

  updateMember(familyTreeData);
};

// Family Member Component
const FamilyMember = ({ member }: { member: FamilyMemberProps }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [members, setMembers] = useState<FamilyMemberProps[]>([]);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      const membersFromDB = await getAllFamilyMembers();
      const formattedMembers: PartialFamilyMember[] = membersFromDB.map(member => ({
        family_member_id: member.family_member_id,
        first_name: member.first_name || "Unknown", // Ensure first_name is present
        last_name: member.last_name || "",
        profile_photo: getFullImageUrl(member.profile_photo),
      }));

      setMembers(formattedMembers as FamilyMemberProps[]);
      updateFamilyTreeData(formattedMembers, familyTreeData as FamilyMemberProps);
    };

    fetchMembers();
  }, []);

  // Combine all children for display
  const allChildren = [
    ...(member.children || []),
    ...(member.previousSpouses?.flatMap(spouse => spouse.children) || [])
  ];

  return (
    <div className="flex flex-col items-center relative">
      {/* Profile Card */}
      <div className="bg-white shadow-md p-3 rounded-lg text-center w-32 relative">
        <div className="avatar">
          {member.profile_photo ? (
            <Image 
              src={member.profile_photo} 
              alt={member.first_name} 
              className="rounded-full mx-auto" 
              width={48}
              height={48}
              style={{ width: '3rem', height: '3rem' }}
            />
          ) : (
            <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto" style={{ width: '3rem', height: '3rem' }}></div>
          )}
        </div>
        <Link href={`/profile/${member.id || member.first_name.toLowerCase().replace(/\s+/g, '-')}`}>
          <span className="text-gray-800 text-sm font-semibold mt-2">{member.first_name} {member.last_name}</span>
        </Link>

        {/* Toggle Button */}
        {(allChildren.length > 0) && (
          <button 
            className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "−" : "+"}
          </button>
        )}
      </div>

      {/* Children Profiles (Mini Circle View when Collapsed) */}
      {allChildren.length > 0 && !isExpanded && (
        <div className="flex items-center gap-1 mt-2">
          {allChildren.slice(0, 5).map((child, index) => (
            <div key={index} className="relative">
              <div className="h-[24px] w-[24px] bg-gray-300 border-2 border-white rounded-full overflow-hidden text-center">
                <span className="icon-[mdi--person-circle-outline]"></span>
              </div>
            </div>
          ))}
          {allChildren.length > 5 && (
            <span className="flex items-center justify-center bg-white text-[11px] font-semibold border-2 border-gray-300 rounded-full h-[24px] w-[24px]">
              +{allChildren.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Full Expanded Children View */}
      {isExpanded && (
        <div className="flex flex-col items-center mt-4">
          <div className="w-0.5 bg-gray-400 h-6"></div>
          <div className="flex flex-wrap justify-center gap-8">
            {member.previousSpouses?.map((spouse, spouseIndex) => (
              <div key={`prev-${spouseIndex}`} className="flex flex-col items-center">
                {/* Spouse card */}
                <div className="bg-white shadow-md p-2 rounded-lg text-center w-24 mb-4">
                  <p className="text-gray-700 text-xs font-medium">{spouse.first_name} {spouse.last_name}</p>
                </div>
                
                {/* Connecting line */}
                <div className="w-0.5 bg-gray-400 h-4"></div>
                
                {/* Children container */}
                <div className="flex flex-wrap justify-center gap-4 mt-2">
                  {spouse.children.map((child, childIndex) => (
                    <FamilyMember key={`prev-${spouseIndex}-${childIndex}`} member={child} />
                  ))}
                </div>
              </div>
            ))}
            
            {member.children && member.children.length > 0 && (
              <div className="flex flex-col items-center">
                {/* Current spouse card */}
                {member.spouse && (
                  <>
                    <div className="bg-white shadow-md p-2 rounded-lg text-center w-24 mb-4">
                      <p className="text-gray-700 text-xs font-medium">{member.spouse.first_name} {member.spouse.last_name}</p>
                    </div>
                    
                    {/* Connecting line */}
                    <div className="w-0.5 bg-gray-400 h-4"></div>
                  </>
                )}
                
                {/* Children container */}
                <div className="flex flex-wrap justify-center gap-4 mt-2">
                  {member.children.map((child, index) => (
                    <FamilyMember key={index} member={child} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Family Tree Component
const FamilyTree = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-6 overflow-x-auto">
      <h1 className="text-4xl font-bold text-center mb-6 text-gray-800">Our Family Tree</h1>
      <div className="flex justify-center">
        <div className="flex flex-col md:flex-row md:items-start">
          <FamilyMember member={familyTreeData as FamilyMemberProps} />
        </div>
      </div>
    </div>
  );
};

export default FamilyTree;
