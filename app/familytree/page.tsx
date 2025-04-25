"use client";
import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { familyTreeData } from './familyTreeData';
import { getAllFamilyMembers } from "@/hooks/dynamoDB";
import { FamilyMember as FamilyMemberType } from "@/hooks/dynamoDB";
import Image from "next/image";
import { getFullImageUrl } from "@/utils/imageUtils";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

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

type PartialFamilyMember = Pick<FamilyMemberType, 'family_member_id' | 'first_name' | 'last_name' | 'profile_photo'>;

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

const FamilyMember = ({ member }: { member: FamilyMemberProps }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [members, setMembers] = useState<FamilyMemberProps[]>([]);

  useEffect(() => {
    const fetchMembers = async () => {
      const membersFromDB = await getAllFamilyMembers();
      const formattedMembers: PartialFamilyMember[] = membersFromDB.map(member => ({
        family_member_id: member.family_member_id,
        first_name: member.first_name || "Unknown",
        last_name: member.last_name || "",
        profile_photo: getFullImageUrl(member.profile_photo),
      }));

      setMembers(formattedMembers as FamilyMemberProps[]);
      updateFamilyTreeData(formattedMembers, familyTreeData as FamilyMemberProps);
    };

    fetchMembers();
  }, []);

  const allChildren = [
    ...(member.children || []),
    ...(member.previousSpouses?.flatMap(spouse => spouse.children) || [])
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white shadow-md p-2 rounded-lg text-center w-32">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 mx-auto">
          {member.profile_photo ? (
            <Image
              src={member.profile_photo}
              alt={member.first_name}
              width={64}
              height={64}
              className="object-cover w-16 h-16"
            />
          ) : null}
        </div>
        <Link href={`/profile/${member.id || member.first_name.toLowerCase()}`}>
          <p className="text-sm font-medium mt-2 text-black">{member.first_name} {member.last_name}</p>
        </Link>
      </div>

      {allChildren.length > 0 && isExpanded && (
        <div className="flex flex-col items-center">
          <div className="w-0.5 h-6 bg-gray-400"></div>
          <div className="flex justify-center items-start space-x-8 mt-4 relative">
            {allChildren.map((child, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="absolute top-0 left-1/2 w-0.5 h-6 bg-gray-400 transform -translate-x-1/2"></div>
                <FamilyMember member={child} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const FamilyTree = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-6 overflow-hidden">
      <h1 className="text-4xl font-bold text-center mb-6 text-gray-800">Our Family Tree</h1>
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={2}
        centerOnInit={false}
        centerZoomedOut={false}
        limitToBounds={false}
        disablePadding={true}
        wheel={{ disabled: false }}
        doubleClick={{ disabled: true }}
        pinch={{ disabled: false }}
        panning={{ velocityDisabled: false }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="flex justify-center mb-4 gap-2">
              <button className="bg-blue-500 text-white px-3 py-1 rounded" onClick={() => zoomIn()}>Zoom In</button>
              <button className="bg-blue-500 text-white px-3 py-1 rounded" onClick={() => zoomOut()}>Zoom Out</button>
              <button className="bg-gray-400 text-white px-3 py-1 rounded" onClick={() => resetTransform()}>Reset</button>
            </div>

            <TransformComponent>
              <div className="flex justify-center min-w-max">
                <div className="flex flex-col items-center space-y-6">
                  <FamilyMember member={familyTreeData as FamilyMemberProps} />
                </div>
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};

export default FamilyTree;
