"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  FamilyMember,
  FamilyRelationship,
  getAllFamilyMembers,
  getFamilyRelationships,
} from "@/hooks/dynamoDB";
import LoadSpinner from "./LoadSpinner";

const AdminRelationshipCheck: React.FC = () => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [relationships, setRelationships] = useState<FamilyRelationship[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);
  const [loadingRelationships, setLoadingRelationships] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchMembers = async () => {
      setLoadingMembers(true);
      setError("");
      try {
        const all = await getAllFamilyMembers();
        // Sort by name for easier selection
        const sorted = [...all].sort((a, b) =>
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
        );
        setMembers(sorted);
      } catch (e) {
        console.error("Error loading family members", e);
        setError("Error loading family members");
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, []);

  useEffect(() => {
    const fetchRelationships = async () => {
      if (!selectedMemberId) {
        setRelationships([]);
        return;
      }
      setLoadingRelationships(true);
      setError("");
      try {
        const rels = await getFamilyRelationships(selectedMemberId);
        setRelationships(rels);
      } catch (e) {
        console.error("Error loading relationships", e);
        setError("Error loading relationships");
      } finally {
        setLoadingRelationships(false);
      }
    };
    fetchRelationships();
  }, [selectedMemberId]);

  const relatedMemberIds = useMemo(() => {
    const ids = new Set<string>();
    relationships.forEach((rel) => {
      if (rel.person_a_id === selectedMemberId) ids.add(rel.person_b_id);
      else if (rel.person_b_id === selectedMemberId) ids.add(rel.person_a_id);
      else {
        // getFamilyRelationships already filters, but keep safe
      }
    });
    return ids;
  }, [relationships, selectedMemberId]);

  const selectedMember = useMemo(
    () => members.find((m) => m.family_member_id === selectedMemberId) || null,
    [members, selectedMemberId]
  );

  const missingRelationships = useMemo(() => {
    if (!selectedMemberId) return [] as FamilyMember[];
    return members.filter(
      (m) => m.family_member_id !== selectedMemberId && !relatedMemberIds.has(m.family_member_id)
    );
  }, [members, relatedMemberIds, selectedMemberId]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Relationship Coverage Checker</h2>

      {/* Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Family Member</label>
        <select
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          className="w-full bg-white p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">— Choose a person —</option>
          {loadingMembers ? (
            <option value="" disabled>
              Loading...
            </option>
          ) : (
            members.map((m) => (
              <option key={m.family_member_id} value={m.family_member_id}>
                {m.first_name} {m.last_name}
              </option>
            ))
          )}
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm">{error}</div>
      )}

      {/* Summary */}
      {selectedMemberId && (
        <div className="mb-4 text-sm text-gray-700">
          {loadingRelationships ? (
            <div className="flex items-center"><LoadSpinner size={18} /><span className="ml-2">Checking relationships…</span></div>
          ) : (
            <div>
              <span className="font-medium">{selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}` : "Selected member"}</span>
              {" is missing relationships with "}
              <span className="font-medium">{missingRelationships.length}</span>
              {" member"}
              {missingRelationships.length === 1 ? "" : "s"}.
            </div>
          )}
        </div>
      )}

      {/* Missing list */}
      {selectedMemberId && !loadingRelationships && (
        <div>
          {missingRelationships.length === 0 ? (
            <div className="p-4 rounded border border-green-200 bg-green-50 text-green-800 text-sm">
              All relationships are present for this member.
            </div>
          ) : (
            <div className="border rounded-lg">
              <div className="px-4 py-2 border-b text-sm text-gray-600 bg-gray-50">
                Members with no relationship defined to/from this person
              </div>
              <ul className="divide-y max-h-96 overflow-auto">
                {missingRelationships.map((m) => (
                  <li key={m.family_member_id} className="px-4 py-3 flex items-center justify-between">
                    <div className="text-gray-800">
                      {m.first_name} {m.last_name}
                    </div>
                    {/* Placeholder for quick action hook-up later (e.g., deep link to create form) */}
                    <div className="text-xs text-gray-500">No relationship recorded</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminRelationshipCheck;


