import React from "react";
import Image from "next/image";

const familyTreeData = {
  name: "Grandparent",
  children: [
    {
      name: "Parent 1",
      children: [
        { name: "Child 1" },
        { name: "Child 2" },
      ],
    },
    {
      name: "Parent 2",
      children: [
        { name: "Child 3" },
        { name: "Child 4" },
      ],
    },
  ],
};

type FamilyMemberProps = {
  name: string;
  children?: FamilyMemberProps[];
};

const FamilyMember = ({ member }: { member: FamilyMemberProps }) => {
  return (
    <div className="flex flex-col items-center relative">
      {/* Profile Card */}
      <div className="bg-white shadow-lg p-4 rounded-lg text-center w-36">
        <div className="avatar">
          <div className="w-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
            <Image src={`https://api.dicebear.com/7.x/identicon/svg?seed=${member.name}`} alt={member.name} width={64} height={64} />
          </div>
        </div>
        <p className="font-bold text-gray-800 mt-2">{member.name}</p>
      </div>

      {/* Connectors */}
      {member.children && (
        <div className="flex flex-col items-center mt-4">
          <div className="w-0.5 bg-gray-400 h-8"></div>
          <div className="flex flex-wrap justify-center gap-4">
            {member.children && member.children.map((child: FamilyMemberProps, index: number) => (
              <div key={index} className="relative">
                <FamilyMember member={child} />
                {member.children && index !== member.children.length - 1 && (
                  <div className="hidden md:block absolute left-full top-1/2 w-8 border-t border-gray-400"></div>
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
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-4xl font-bold text-center mb-6 text-card-header">Our Family Tree</h1>
      <div className="overflow-x-auto flex justify-center">
        <div className="flex flex-col md:flex-row md:items-start">
          <FamilyMember member={familyTreeData} />
        </div>
      </div>
    </div>
  );
};

export default FamilyTree;
