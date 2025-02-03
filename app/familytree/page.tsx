"use client";
import React, { useState } from "react";

// Sample Family Tree Data
const familyTreeData = {
  name: "Cynthia",
  children: [
    {
      name: "Damaris",
      children: [{ name: "Nicoletta" }, { name: "Christina" }],
    },
    {
      name: "Sharon",
      children: [{ name: "Victor" }, { name: "Jonathan" }, { name: "Samantha" }],
    },
    {
      name: "Vanessa",
      children: [{ name: "Raleigh" }, { name: "Lisa" }, { name: "Maurice" }],
    },
    {
      name: "Frances",
      children: [{ name: "Ronald" }, { name: "Anthony" }, { name: "Aristalia" }, { name: "John Paul" }],
    },
    {
      name: "Angela",
      children: [{ name: "Jessica" }, { name: "Justin" }, { name: "Chevone" }, { name: "Aubrey" }, { name: "Kintara" }, { name: "TJ" }],
    },
    {
      name: "Mario",
      children: [{ name: "Jahson" }, { name: "Javin" }, { name: "Jamari" }],
    },    
    {
      name: "Sarih",
      children: [{ name: "Chyna" }, { name: "Mya" }, { name: "Noah" }],
    },
  ],
};

// Define FamilyMemberProps type
type FamilyMemberProps = {
  name: string;
  children?: FamilyMemberProps[];
};

// Family Member Component
const FamilyMember = ({ member }: { member: FamilyMemberProps }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex flex-col items-center relative">
      {/* Profile Card */}
      <div className="bg-white shadow-md p-3 rounded-lg text-center w-32 relative">
        <div className="avatar">
          <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto"></div>
        </div>
        <p className="text-gray-800 text-sm font-semibold mt-2">{member.name}</p>

        {/* Toggle Button */}
        {member.children && (
          <button 
            className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "−" : "+"}
          </button>
        )}
      </div>

      {/* Children Profiles (Mini Circle View when Collapsed) */}
      {member.children && !isExpanded && (
        <div className="flex items-center gap-1 mt-2">
          {member.children.slice(0, 5).map((child, index) => (
            <div key={index} className="relative">
              <div className="h-[24px] w-[24px] bg-gray-300 border-2 border-white rounded-full overflow-hidden text-center">
                <span className="icon-[mdi--person-circle-outline]"></span>
              </div>
            </div>
          ))}
          {member.children.length > 5 && (
            <span className="flex items-center justify-center bg-white text-[11px] font-semibold border-2 border-gray-300 rounded-full h-[24px] w-[24px]">
              +{member.children.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Full Expanded Children View */}
      {isExpanded && (
        <div className="flex flex-col items-center mt-4">
          <div className="w-0.5 bg-gray-400 h-6"></div>
          <div className="flex flex-wrap justify-center gap-4">
            {member.children && member.children.map((child, index) => (
              <FamilyMember key={index} member={child} />
            ))}
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
          <FamilyMember member={familyTreeData} />
        </div>
      </div>
    </div>
  );
};

export default FamilyTree;
