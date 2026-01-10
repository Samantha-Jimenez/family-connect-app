"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  FamilyMember,
  FamilyRelationship,
  getAllFamilyMembers,
  getFamilyRelationships,
} from "@/hooks/dynamoDB";
import LoadSpinner from "./LoadSpinner";
import { DEMO_FAMILY_GROUP, REAL_FAMILY_GROUP } from "@/utils/demoConfig";
import { getCurrentUser } from "aws-amplify/auth";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const AdminRelationshipCheck: React.FC = () => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [allFamilyMembers, setAllFamilyMembers] = useState<FamilyMember[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [relationships, setRelationships] = useState<FamilyRelationship[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);
  const [loadingRelationships, setLoadingRelationships] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Fetch all family members once on mount
  useEffect(() => {
    const fetchAllMembers = async () => {
      setLoadingMembers(true);
      setError("");
      try {
        const user = await getCurrentUser();
        // Fetch all family members (both real and demo) to enable toggling
        const all = await getAllFamilyMembers(user?.userId, true);
        // Sort by name for easier selection
        const sorted = [...all].sort((a, b) =>
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
        );
        setAllFamilyMembers(sorted);
      } catch (e) {
        console.error("Error loading family members", e);
        setError("Error loading family members");
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchAllMembers();
  }, []);

  // Filter family members based on toggle state
  useEffect(() => {
    const filteredMembers = allFamilyMembers.filter(member => {
      const memberGroup = member.family_group || REAL_FAMILY_GROUP;
      return isDemoMode ? memberGroup === DEMO_FAMILY_GROUP : memberGroup === REAL_FAMILY_GROUP;
    });
    setMembers(filteredMembers);
    
    // Clear selection if selected member doesn't belong to current group
    setSelectedMemberId(prev => {
      if (prev) {
        const selectedMember = allFamilyMembers.find(m => m.family_member_id === prev);
        if (selectedMember) {
          const memberGroup = selectedMember.family_group || REAL_FAMILY_GROUP;
          const currentGroup = isDemoMode ? DEMO_FAMILY_GROUP : REAL_FAMILY_GROUP;
          return memberGroup === currentGroup ? prev : '';
        }
      }
      return prev;
    });
  }, [isDemoMode, allFamilyMembers]);

  useEffect(() => {
    const fetchRelationships = async () => {
      if (!selectedMemberId) {
        setRelationships([]);
        return;
      }
      setLoadingRelationships(true);
      setError("");
      try {
        // Get all relationships directly from DynamoDB to avoid family group filtering
        // Then filter based on the current toggle state (demo vs real)
        const dynamoDB = new DynamoDBClient({ 
          region: process.env.NEXT_PUBLIC_AWS_PROJECT_REGION,
          credentials: {
            accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
          }
        });

        const params = {
          TableName: "Relationships",
          FilterExpression: "source_id = :id OR target_id = :id",
          ExpressionAttributeValues: {
            ":id": { S: selectedMemberId }
          }
        };

        const command = new ScanCommand(params);
        const response = await dynamoDB.send(command);

        if (!response.Items) {
          setRelationships([]);
          return;
        }

        // Map DynamoDB items to FamilyRelationship format
        const allRelationships: FamilyRelationship[] = response.Items.map(item => ({
          relationship_id: item.relationship_id?.S || '',
          person_a_id: item.source_id?.S || '',
          person_b_id: item.target_id?.S || '',
          relationship_type: (item.relationship_type?.S || 'sibling') as any,
          relationship_subtype: item.relationship_subtype?.S || '',
          start_date: item.start_date?.S || '',
          end_date: item.end_date?.S || '',
          is_active: item.is_active?.BOOL ?? true,
          notes: item.notes?.S || '',
          created_date: item.created_date?.S || '',
          created_by: item.created_by?.S || ''
        }));
        
        // Filter relationships to only include those where both people are in the current toggle group
        // This ensures demo relationships show when toggle is on demo, and real relationships show when toggle is on real
        const currentGroupMemberIds = new Set(members.map(m => m.family_member_id));
        const filteredRels = allRelationships.filter(rel => 
          currentGroupMemberIds.has(rel.person_a_id) && currentGroupMemberIds.has(rel.person_b_id)
        );
        
        setRelationships(filteredRels);
      } catch (e) {
        console.error("Error loading relationships", e);
        setError("Error loading relationships");
        // Fallback to using getFamilyRelationships if direct DynamoDB fetch fails
        try {
          const rels = await getFamilyRelationships(selectedMemberId);
          const currentGroupMemberIds = new Set(members.map(m => m.family_member_id));
          const filteredRels = rels.filter(rel => 
            currentGroupMemberIds.has(rel.person_a_id) && currentGroupMemberIds.has(rel.person_b_id)
          );
          setRelationships(filteredRels);
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
        }
      } finally {
        setLoadingRelationships(false);
      }
    };
    fetchRelationships();
  }, [selectedMemberId, members]);

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

      {/* Toggle between Real and Demo Family Members */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Family Group:</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsDemoMode(false);
              setSelectedMemberId("");
            }}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              !isDemoMode
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Real
          </button>
          <button
            type="button"
            onClick={() => {
              setIsDemoMode(true);
              setSelectedMemberId("");
            }}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              isDemoMode
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Demo
          </button>
        </div>
      </div>

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


