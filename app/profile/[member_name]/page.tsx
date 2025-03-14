"use client"
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";
import { useEffect, useState } from 'react';
import { getUserData } from "@/hooks/dynamoDB";
import ProfileUserInfoCard from "@/components/ProfileUserInfoCard";
import { usePathname } from 'next/navigation';
import { fetchUserAttributes } from "aws-amplify/auth";
import UpcomingEvents from "@/components/UpcomingEvents";
import { familyTreeData, FamilyMemberProps } from '../../familytree/page';

interface UserData {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  bio: string;
  phone_number: string;
  birthday: string;
}

const findMemberByName = (name: string, member: FamilyMemberProps): FamilyMemberProps | null => {
  if (member.name.toLowerCase().replace(/\s+/g, '-') === name) {
    return member;
  }
  for (const child of member.children || []) {
    const found = findMemberByName(name, child);
    if (found) return found;
  }
  for (const spouse of member.previousSpouses || []) {
    for (const child of spouse.children) {
      const found = findMemberByName(name, child);
      if (found) return found;
    }
  }
  return null;
};

const ProfilePage = () => {
  const pathname = usePathname();
  const memberName = pathname.split('/').pop();

  const member = findMemberByName(memberName as string, familyTreeData);

  if (!member) {
    return <div>Member not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-4xl font-bold text-center mb-6 text-gray-800">{member.name}'s Profile</h1>
      <div className="bg-white shadow-md p-6 rounded-lg">
        <p className="text-gray-800 text-lg">Name: {member.name}</p>
        {member.spouse && <p className="text-gray-800 text-lg">Spouse: {member.spouse}</p>}
        {member.previousSpouses && member.previousSpouses.length > 0 && (
          <div>
            <p className="text-gray-800 text-lg">Previous Spouses:</p>
            <ul>
              {member.previousSpouses.map((spouse, index) => (
                <li key={index} className="text-gray-700">{spouse.name}</li>
              ))}
            </ul>
          </div>
        )}
        {member.children && member.children.length > 0 && (
          <div>
            <p className="text-gray-800 text-lg">Children:</p>
            <ul>
              {member.children.map((child, index) => (
                <li key={index} className="text-gray-700">{child.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;