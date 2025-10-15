"use client";
import React, { useEffect, useState } from 'react';
import RSVP from './RSVP';
import { getFamilyRelationships, getAllFamilyMembers } from '@/hooks/dynamoDB';
import Link from 'next/link';

interface Relationship {
  source_id: string;
  target_id: string;
  relationship_type: string;
}

interface FamilyMember {
  family_member_id: string;
  first_name: string;
  last_name: string;
  // add more fields if needed
}

const ProfileOverview = ({ userId }: { userId: string }) => {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
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

  // Find direct relatives (where user is source or target)
  const nuclearTypes = ['parent', 'child', 'sibling'];
  const directRelatives = relationships
    .filter(rel => nuclearTypes.includes(rel.relationship_type) && rel.target_id === userId)
    .map(rel => {
      const relative = familyMembers.find(m => m.family_member_id === rel.source_id);
      return relative
        ? {
            ...rel,
            relativeName: `${relative.first_name} ${relative.last_name}`,
            relativeId: relative.family_member_id,
            direction: 'is their',
            relationship: rel.relationship_type,
          }
        : null;
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
      <RSVP userId={userId}/>

      {/* ADD MORE COMPONENTS HERE */}
      <div className="card bg-yellow-300/5 text-black shadow-lg p-6 col-span-1 col-start-1 md:col-start-2 h-min">
        <h2 className="text-xl">Family Tree</h2>
        <p className="mt-2">Nuclear family connections</p>
        {loading ? (
          <div className="text-gray-500">Loading relatives...</div>
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