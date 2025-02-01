import React from "react";

const familyTreeData = {
  name: "Cynthia",
  children: [
    {
      name: "Damaris",
      children: [
        { name: "Nicoletta" },
        { name: "Christina" },
      ],
    },
    {
      name: "Sharon",
      children: [
        { name: "Victor" },
        { name: "Jonathan" },
        { name: "Samantha" },
      ],
    },
    {
      name: "Vanessa",
      children: [
        { name: "Raleigh" },
        { name: "Lisa" },
        { name: "Maurice" },
      ],
    },
    {
      name: "Brenda",
      children: [
        { name: "Lisa" },
        { name: "Tina" },
      ],
    },
    {
      name: "Frances",
      children: [
        { name: "Ronald" },
        { name: "Anthony" },
        { name: "Aristalia" },
        { name: "John Paul" },
      ],
    },
    {
      name: "Mario 'Tony'",
      children: [
        { name: "Jahson" },
        { name: "Javin" },
        { name: "Jamari" },
      ],
    },
    {
      name: "Angela",
      children: [
        { name: "Jessica" },
        { name: "Justin" },
        { name: "Chevone" },
        { name: "Aubrey" },
        { name: "Kintara" },
        { name: "TJ" },
      ],
    },
    {
      name: "Sarih",
      children: [
        { name: "Chyna" },
        { name: "Mya" },
        { name: "Noah" },
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
          <span className="icon-[mdi--person-circle-outline] w-16 h-16"></span>
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
      <div className="flex justify-center">
        <div className="flex flex-col md:flex-row md:items-start">
          <FamilyMember member={familyTreeData} />
        </div>
      </div>
    </div>
  );
};

export default FamilyTree;
