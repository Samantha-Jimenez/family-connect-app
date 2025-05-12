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
  spouse?: FamilyMemberProps;
  previousSpouses?: FamilyMemberProps[];
  children?: FamilyMemberProps[];
};

type PartialFamilyMember = Pick<FamilyMemberType, 'family_member_id' | 'first_name' | 'last_name' | 'profile_photo'>;

const updateFamilyTreeData = (membersFromDB: PartialFamilyMember[], member: FamilyMemberProps) => {
  const dbMember = membersFromDB.find(dbMem => dbMem.first_name === member.first_name && dbMem.last_name.includes(member.last_name));
  if (dbMember) {
    member.id = dbMember.family_member_id;
    member.profile_photo = getFullImageUrl(dbMember.profile_photo);
  }
  member.children?.forEach(child => updateFamilyTreeData(membersFromDB, child));
  member.previousSpouses?.forEach(spouse => {
    updateFamilyTreeData(membersFromDB, spouse);
    spouse.children?.forEach(child => updateFamilyTreeData(membersFromDB, child));
  });
  if (member.spouse) {
    updateFamilyTreeData(membersFromDB, member.spouse);
  }
};

const FamilyMember = ({
  member,
  expandedChildIndex: controlledExpandedChildIndex,
  setExpandedChildIndex: controlledSetExpandedChildIndex,
  isExpanded = true,
}: {
  member: FamilyMemberProps;
  expandedChildIndex?: number | null;
  setExpandedChildIndex?: (index: number | null) => void;
  isExpanded?: boolean;
}) => {
  // Local state fallback if not controlled
  const [localExpandedChildIndex, setLocalExpandedChildIndex] = useState<number | null>(null);

  // Use controlled or local state
  const expandedChildIndex = controlledExpandedChildIndex ?? localExpandedChildIndex;
  const setExpandedChildIndex = controlledSetExpandedChildIndex ?? setLocalExpandedChildIndex;

  const allChildren = [
    ...(member.children || []),
    ...(member.previousSpouses?.flatMap(spouse => spouse.children || []) || [])
  ];

  const handleToggleChild = (index: number) => {
    if (setExpandedChildIndex) {
      setExpandedChildIndex(expandedChildIndex === index ? null : index);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center space-x-2">
        <div className="bg-white shadow-md p-2 rounded-lg text-center w-36 h-28">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 mx-auto">
            {member.profile_photo && member.profile_photo !== "https://family-connect-app.s3.us-east-2.amazonaws.com/" ? (
              <Image
                src={member.profile_photo}
                alt={member.first_name}
                width={64}
                height={64}
                className="object-cover w-16 h-16"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 rounded-[60px] flex items-center justify-center">
                <span className="icon-[mdi--account] text-4xl text-gray-400" />
              </div>
            )}
          </div>
          <Link href={`/profile/${member.id || (member.first_name ? member.first_name.toLowerCase() : "unknown")}`}>
            <p className="text-sm font-medium mt-2 text-black">{member.first_name} {member.last_name}</p>
          </Link>
          {/* <button className="text-xs mt-1 text-blue-600" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? "Collapse" : "Expand"}
          </button> */}
        </div>

        {member.spouse && (
          <>
            <div className="w-4 h-0.5 bg-gray-400"></div>
            <div className="bg-white shadow-md p-2 rounded-lg text-center w-36 h-28">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 mx-auto">
                {member.spouse.profile_photo && (
                  <Image
                    src={member.spouse.profile_photo}
                    alt={member.spouse.first_name}
                    width={64}
                    height={64}
                    className="object-cover w-16 h-16"
                  />
                )}
              </div>
              <Link href={`/profile/${member.spouse.id || (member.spouse.first_name ? member.spouse.first_name.toLowerCase() : "unknown")}`}>
                <p className="text-sm font-medium mt-2 text-black">{member.spouse.first_name} {member.spouse.last_name}</p>
              </Link>
            </div>
          </>
        )}
      </div>

      {allChildren.length > 0 && isExpanded && (
        <div className="flex flex-col items-center min-h-screen">
          <div className="w-0.5 h-8 bg-gray-400 relative top-[25px]"></div>
          <div className="flex justify-center items-start space-x-8 mt-8 relative">
            {allChildren.map((child, index) => (
              <div
                key={index}
                className={`flex flex-col items-center ${child.spouse ? "w-[304px]" : "w-[128px]"}`}
              >
                <FamilyMember
                  member={child}
                  isExpanded={expandedChildIndex === index}
                />
                {child.children && child.children.length > 0 && (
                  <button
                    className="text-xs mt-1 text-blue-600 absolute top-[114px]"
                    onClick={() => handleToggleChild(index)}
                  >
                    {expandedChildIndex === index ? "Collapse" : "Expand"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const FamilyTree = () => {
  const [initialized, setInitialized] = useState(false);
  const [expandedChildIndex, setExpandedChildIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      const membersFromDB = await getAllFamilyMembers();
      const formattedMembers: PartialFamilyMember[] = membersFromDB.map(member => ({
        family_member_id: member.family_member_id,
        first_name: member.first_name || "Unknown",
        last_name: member.last_name || "",
        profile_photo: member.profile_photo || "",
      }));
      updateFamilyTreeData(formattedMembers, familyTreeData as FamilyMemberProps);
      setInitialized(true);
    };

    fetchMembers();
  }, []);

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

            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ justifySelf: 'center' }}>
              <div className="flex justify-center min-w-max">
                <div className="flex flex-col items-center space-y-6">
                  {initialized && (
                    <FamilyMember
                      member={familyTreeData as FamilyMemberProps}
                      expandedChildIndex={expandedChildIndex}
                      setExpandedChildIndex={setExpandedChildIndex}
                    />
                  )}
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
