"use client";
import React, { useEffect, useState } from 'react';
import RSVP from './RSVP';
import PetsCard from '@/components/PetsCard';
import LanguagesCard from '@/components/LanguagesCard';
import { getFamilyRelationships, getAllFamilyMembers, FamilyRelationship } from '@/hooks/dynamoDB';
import Link from 'next/link';
import LoadSpinner from '@/components/LoadSpinner';

interface FamilyMember {
  family_member_id: string;
  first_name: string;
  last_name: string;
  // add more fields if needed
}

const ProfileOverview = ({ userId }: { userId: string }) => {
  const [relationships, setRelationships] = useState<FamilyRelationship[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [rels, members] = await Promise.all([
          getFamilyRelationships(userId),
          getAllFamilyMembers(),
        ]);
        setRelationships(rels);
        setFamilyMembers(members);
      } catch (e) {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  // Find direct relatives (where user is person_a or person_b)
  const nuclearTypes = ['parent', 'child', 'sibling'];
  const directRelatives = relationships
    .filter(rel => nuclearTypes.includes(rel.relationship_type) && (rel.person_b_id === userId))
    .map(rel => {
      // Determine which person is the relative (not the current user)
      const relativeId = rel.person_a_id === userId ? rel.person_b_id : rel.person_a_id;
      const relative = familyMembers.find(m => m.family_member_id === relativeId);
      
      if (!relative) return null;
      
      // Determine the relationship direction from the user's perspective
      const relationshipFromUserPerspective = rel.person_a_id === userId 
        ? rel.relationship_type 
        : inverseRelationship(rel.relationship_type);
      
      return {
        ...rel,
        relativeName: `${relative.first_name} ${relative.last_name}`,
        relativeId: relative.family_member_id,
        direction: 'is their',
        relationship: rel.relationship_type,
      };
    })
    .filter(Boolean);

  function inverseRelationship(type: string) {
    // You can expand this mapping as needed
    switch (type) {
      case 'parent': return 'child';
      case 'child': return 'parent';
      case 'sibling': return 'sibling';
      case 'spouse': return 'spouse';
      default: return type;
    }
  }

  console.log('directRelatives', directRelatives);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* <RSVP userId={userId}/> */}
      <div className="col-span-1 md:col-span-1 flex flex-col gap-4">
        <PetsCard userId={userId}/>
        <LanguagesCard userId={userId}/>
      </div>

      {/* ADD MORE COMPONENTS HERE */}
      <div className="card bg-yellow-300/5 text-black shadow-lg p-4 col-span-1 md:col-span-1 md:col-start-2 h-min">
        <h2 className="text-xl">Family Tree</h2>
        <p className="mt-2">Nuclear family connections</p>
        {loading ? (
          <div className="flex justify-center items-center py-6">
            <LoadSpinner size={48} />
          </div>
        ) : directRelatives.length === 0 ? (
          <div className="text-gray-500 text-sm">No direct relatives found.</div>
        ) : (
          <ul className="mt-4 space-y-1">
            {directRelatives.map((rel, idx) => (
              <li key={rel!.relativeId + rel!.relationship_type + idx} className="text-gray-800 text-sm">
                • {rel!.relativeName}
                <span className="text-gray-500 ml-2">
                  ({rel!.direction} {rel!.relationship})
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/familytree">
          <button className="btn btn-sm btn-outline mt-4 bg-[#717568] text-white border-0 w-full hover:bg-[#717568]/80">Family Tree</button>
        </Link>
      </div>
    </div>
  );
};

export default ProfileOverview;