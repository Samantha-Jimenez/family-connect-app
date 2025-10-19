"use client";
import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { familyTreeData } from './familyTreeData';
import { getAllFamilyMembers, buildFamilyTreeFromRelationships, FamilyTreeNode } from "@/hooks/dynamoDB";
import { FamilyMember as FamilyMemberType } from "@/hooks/dynamoDB";
import Image from "next/image";
import { getFullImageUrl } from "@/utils/imageUtils";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useAuthenticator } from "@aws-amplify/ui-react";

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

const PersonCard = ({ member }: { member: FamilyMemberProps }) => {
  const [imageError, setImageError] = useState(false);
  
  return (
    <div className="bg-white shadow-md p-2 rounded-lg text-center w-36 h-28 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1">
      <Link
        href={`/profile/${member.id || (member.first_name ? member.first_name.toLowerCase() : "unknown")}`}
        className="group"
      >
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 mx-auto group-hover:animate-bounce">
          {member.profile_photo && member.profile_photo !== "https://family-connect-app.s3.us-east-2.amazonaws.com/" && !imageError ? (
            <Image
              src={member.profile_photo.startsWith('http') ? member.profile_photo : getFullImageUrl(member.profile_photo)}
              alt={member.first_name}
              width={64}
              height={64}
              className="object-cover w-16 h-16"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 rounded-[60px] flex items-center justify-center">
              <span className="icon-[mdi--account] text-4xl text-gray-400" />
            </div>
          )}
        </div>
        <p className="text-sm font-light mt-2 text-black hover:text-yellow-800/80 hover:font-medium hover:text-md transition-all duration-200 ease-in-out">
          {member.first_name} {member.last_name}
        </p>
      </Link>
    </div>
  );
};

/**
 * CoupleBlock:
 * Renders person A + person B (optional), a small "knot" between them,
 * and a single vertical line to children below that knot.
 */
const CoupleBlock = ({
  a,
  b, // spouse or previous spouse (optional)
  children = [],
  expandedChildIndex,
  onToggleChild,
}: {
  a: FamilyMemberProps;
  b?: FamilyMemberProps;
  children?: FamilyMemberProps[];
  expandedChildIndex: number | null;
  onToggleChild: (index: number) => void;
}) => {
  const hasSpouse = !!b;

  return (
    // <div className="relative flex flex-col items-center">
    <div className="flex flex-col items-center opacity-0 animate-[fadeIn_0.6s_ease-in_forwards] w-[10rem]">
      {/* Top row: either A alone, or A—spouse */}
      <div className="flex items-center space-x-2">
        <PersonCard member={a} />

        {hasSpouse && (
          <>
            {/* Horizontal connector between partners */}
            <div className="relative flex items-center">
              <div className="w-4 h-0.5 bg-gray-400" />
              {/* marriage knot (centered) */}
              <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-500 rounded-full" />
            </div>
            <PersonCard member={b!} />
          </>
        )}
      </div>

      {/* Down line from the knot (or from center of A if single parent) */}
      <div className="relative flex justify-center">
        <div
          className={`w-0.5 bg-gray-400 mt-[5px] ${children.length ? "h-8" : "h-0"}`}
          style={{
            // if there is a spouse, drop from middle between; else drop from A center
            position: "relative",
            top: hasSpouse ? 18 : 18,
          }}
        />
      </div>

      {/* Children row */}
      {children.length > 0 && (
        <div className={`flex justify-center items-start relative mt-4 ${children.length > 1 ? 'space-x-8' : ''}`}>
          {/* horizontal line behind all children */}
          <div className="absolute left-[95px] right-[63px] top-0 h-0.5 bg-gray-300" />
           {children.map((child, index) => (
             <div
               key={index}
               className={`relative flex flex-col items-center min-h-[170px] ${child.spouse ? "w-[304px]" : "w-[128px]"} animate-[fadeIn_0.3s_ease-in_forwards] opacity-0`}
               style={{ animationDelay: `${index * 0.06 + 0.2}s` }}
             >
               {/* vertical connector from the horizontal line to each child card */}
               <div 
                 className="w-0.5 h-8 bg-gray-300" 
                 style={{
                   position: "relative",
                   right: child.spouse ? "29%" : undefined,
                 }}
               />
               <FamilyMember 
                 member={child} 
                 isExpanded={expandedChildIndex === index}
               />
               {/* Expand/Collapse button - positioned absolutely to stay in place */}
               {child.children && child.children.length > 0 && (
                 <button
                   className="absolute top-[148px] text-xs text-green-600 font-extralight hover:text-dark-spring-green hover:font-light hover:text-sm transition-all duration-200 ease-in-out hover:scale-110 active:scale-95"
                   onClick={() => onToggleChild(index)}
                 >
                   {expandedChildIndex === index ? "Collapse" : "Expand"}
                 </button>
               )}
             </div>
           ))}
        </div>
      )}
    </div>
  );
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
  const [localExpandedChildIndex, setLocalExpandedChildIndex] = useState<number | null>(null);
  const expandedChildIndex = controlledExpandedChildIndex ?? localExpandedChildIndex;
  const setExpandedChildIndex = controlledSetExpandedChildIndex ?? setLocalExpandedChildIndex;

  const handleToggleChild = (index: number) => {
    setExpandedChildIndex(expandedChildIndex === index ? null : index);
  };

  // Primary union (member + spouse)
  const primaryUnionChildren = (member.children || []).slice();

  // Previous spouses as separate unions; each union shows THAT spouse + THEIR children
  const previousSpouseUnions =
    member.previousSpouses?.map((sp) => ({
      spouse: sp,
      children: sp.children || [],
    })) || [];

  return (
    // <div className="flex flex-col items-center opacity-0 animate-[fadeIn_0.6s_ease-in_forwards]">
    <div className="">
      {/* Primary union */}
      <CoupleBlock
        a={member}
        b={member.spouse}
        children={isExpanded ? primaryUnionChildren : []}
        expandedChildIndex={expandedChildIndex ?? -1}
        onToggleChild={handleToggleChild}
      />

      {/* Render separate unions for each previous spouse */}
      {isExpanded && previousSpouseUnions.length > 0 && (
        <div className="mt-6 space-y-8">
          {previousSpouseUnions.map((u, i) => (
            <CoupleBlock
              key={i}
              a={member}
              b={u.spouse}
              children={u.children}
              expandedChildIndex={-1}
              onToggleChild={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FamilyTree = () => {
  const { user } = useAuthenticator();
  const [initialized, setInitialized] = useState(false);
  const [expandedChildIndex, setExpandedChildIndex] = useState<number | null>(null);
  const [dynamicTree, setDynamicTree] = useState<FamilyTreeNode | null>(null);
  const [useDynamicTree, setUseDynamicTree] = useState(false);
  const [rootPersonId, setRootPersonId] = useState<string>('');
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberType[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is admin
    if (user && user.userId === "f16b1510-0001-705f-8680-28689883e706") {
      setIsAdmin(true);
    }

    const fetchMembers = async () => {
      try {
        const membersFromDB = await getAllFamilyMembers();
        setFamilyMembers(membersFromDB);
        
        const formattedMembers: PartialFamilyMember[] = membersFromDB.map(member => ({
          family_member_id: member.family_member_id,
          first_name: member.first_name || "Unknown",
          last_name: member.last_name || "",
          profile_photo: member.profile_photo || "",
        }));
        
        // Update static tree data
        updateFamilyTreeData(formattedMembers, familyTreeData as FamilyMemberProps);
        
        // Set default root person (look for Cynthia first, otherwise use first member)
        if (membersFromDB.length > 0) {
          const cynthia = membersFromDB.find(member => 
            member.first_name?.toLowerCase().includes('cynthia') || 
            member.first_name?.toLowerCase().includes('cindy')
          );
          setRootPersonId(cynthia ? cynthia.family_member_id : membersFromDB[0].family_member_id);
        }
        
        setInitialized(true);
      } catch (error) {
        console.error('Error fetching family members:', error);
        setInitialized(true);
      }
    };

    fetchMembers();
  }, [user]);

  useEffect(() => {
    const buildDynamicTree = async () => {
      if (rootPersonId && useDynamicTree) {
        try {
          const tree = await buildFamilyTreeFromRelationships(rootPersonId);
          setDynamicTree(tree);
        } catch (error) {
          console.error('Error building dynamic tree:', error);
        }
      } else if (!useDynamicTree) {
        // Clear dynamic tree when switching back to static
        setDynamicTree(null);
      }
    };

    buildDynamicTree();
  }, [rootPersonId, useDynamicTree]);

  // Convert FamilyTreeNode to FamilyMemberProps for compatibility
  const convertTreeNodeToFamilyMemberProps = (node: FamilyTreeNode): FamilyMemberProps => {
    return {
      id: node.id,
      first_name: node.first_name,
      last_name: node.last_name,
      profile_photo: node.profile_photo,
      spouse: node.spouse ? convertTreeNodeToFamilyMemberProps(node.spouse) : undefined,
      previousSpouses: node.previousSpouses?.map(spouse => convertTreeNodeToFamilyMemberProps(spouse)),
      children: node.children?.map(child => convertTreeNodeToFamilyMemberProps(child))
    };
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 overflow-hidden">
      <h1 className="text-4xl text-center mb-6 text-gray-800 opacity-0 animate-[fadeIn_0.6s_ease-in_forwards]">Our Family Tree</h1>

      {/* Tree Mode Selector - Admin Only */}
      {isAdmin && (
        <div className="flex justify-center mb-6 gap-4 opacity-0 animate-[fadeIn_0.6s_ease-in_forwards] [animation-delay:0.1s]">
          <button
            onClick={() => setUseDynamicTree(false)}
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${
              !useDynamicTree 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Static Tree (Current)
          </button>
          <button
            onClick={() => setUseDynamicTree(true)}
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${
              useDynamicTree 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Dynamic Tree (From Relationships)
          </button>
        </div>
      )}

      {/* Root Person Selector for Dynamic Tree - Admin Only */}
      {isAdmin && useDynamicTree && (
        <div className="flex justify-center mb-6 opacity-0 animate-[fadeIn_0.6s_ease-in_forwards] [animation-delay:0.2s]">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Root Person (Starting Point)
            </label>
            <select
              value={rootPersonId}
              onChange={(e) => setRootPersonId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {familyMembers.map((member) => (
                <option key={member.family_member_id} value={member.family_member_id}>
                  {member.first_name} {member.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

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
            <div className="flex justify-center mb-4 gap-2 opacity-0 animate-[fadeIn_0.6s_ease-in_forwards] [animation-delay:0.2s]">
              <button className="bg-plantain-green text-white px-3 py-1 rounded transition-all duration-200 hover:bg-dark-spring-green hover:scale-110 hover:shadow-lg active:scale-95" onClick={() => zoomIn()}>Zoom In</button>
              <button className="bg-plantain-green text-white px-3 py-1 rounded transition-all duration-200 hover:bg-dark-spring-green hover:scale-110 hover:shadow-lg active:scale-95" onClick={() => zoomOut()}>Zoom Out</button>
              <button className="bg-sand-beige text-black px-3 py-1 rounded transition-all duration-200 hover:bg-golden-sand hover:scale-110 hover:shadow-lg active:scale-95" onClick={() => resetTransform()}>Reset</button>
            </div>

            <TransformComponent wrapperStyle={{ width: '100%', height: '100vh' }} contentStyle={{ justifySelf: 'center' }}>
              <div className="flex justify-center min-w-max">
                <div className="flex flex-col items-center space-y-6">
                  {!initialized ? (
                    <div className="animate-pulse space-y-6">
                      {/* Loading skeleton for main members */}
                      <div className="flex items-center space-x-2">
                        <div className="bg-white shadow-md p-2 rounded-lg w-36 h-28">
                          <div className="w-16 h-16 rounded-full bg-gray-300 mx-auto"></div>
                          <div className="h-4 bg-gray-300 rounded mt-2 w-20 mx-auto"></div>
                        </div>
                        <div className="w-4 h-0.5 bg-gray-300"></div>
                        <div className="bg-white shadow-md p-2 rounded-lg w-36 h-28">
                          <div className="w-16 h-16 rounded-full bg-gray-300 mx-auto"></div>
                          <div className="h-4 bg-gray-300 rounded mt-2 w-20 mx-auto"></div>
                        </div>
                      </div>
                      {/* Loading skeleton for children */}
                      <div className="w-0.5 h-8 bg-gray-300 mx-auto"></div>
                      <div className="flex space-x-8">
                        <div className="bg-white shadow-md p-2 rounded-lg w-36 h-28">
                          <div className="w-16 h-16 rounded-full bg-gray-300 mx-auto"></div>
                          <div className="h-4 bg-gray-300 rounded mt-2 w-20 mx-auto"></div>
                        </div>
                        <div className="bg-white shadow-md p-2 rounded-lg w-36 h-28">
                          <div className="w-16 h-16 rounded-full bg-gray-300 mx-auto"></div>
                          <div className="h-4 bg-gray-300 rounded mt-2 w-20 mx-auto"></div>
                        </div>
                        <div className="bg-white shadow-md p-2 rounded-lg w-36 h-28">
                          <div className="w-16 h-16 rounded-full bg-gray-300 mx-auto"></div>
                          <div className="h-4 bg-gray-300 rounded mt-2 w-20 mx-auto"></div>
                        </div>
                      </div>
                    </div>
                  ) : useDynamicTree && dynamicTree ? (
                    <FamilyMember
                      member={convertTreeNodeToFamilyMemberProps(dynamicTree)}
                      expandedChildIndex={expandedChildIndex}
                      setExpandedChildIndex={setExpandedChildIndex}
                    />
                  ) : useDynamicTree && !dynamicTree ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🌳</div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">No Relationships Found</h3>
                      <p className="text-gray-600 mb-4">
                        The selected person doesn't have any family relationships yet.
                      </p>
                      <p className="text-sm text-gray-500">
                        Go to the Admin panel to add family relationships, then come back to see the dynamic tree.
                      </p>
                    </div>
                  ) : (
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
