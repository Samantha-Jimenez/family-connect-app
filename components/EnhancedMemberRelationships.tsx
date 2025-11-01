"use client";
import React, { useState, useEffect } from 'react';
import { 
  FamilyMember, 
  FamilyRelationship, 
  getFamilyRelationships, 
  getAllFamilyMembers,
  removeFamilyRelationship 
} from '@/hooks/dynamoDB';
import LoadSpinner from './LoadSpinner';

interface EnhancedMemberRelationshipsProps {
  memberId: string;
  familyMembers: FamilyMember[];
  onRelationshipRemoved?: () => void;
  showToast?: (message: string, type: 'success' | 'error') => void;
}

interface GroupedRelationships {
  [key: string]: Array<{
    relationship: FamilyRelationship;
    person: FamilyMember;
  }>;
}

export default function EnhancedMemberRelationships({ 
  memberId, 
  familyMembers, 
  onRelationshipRemoved,
  showToast 
}: EnhancedMemberRelationshipsProps) {
  const [relationships, setRelationships] = useState<FamilyRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedRelationships, setGroupedRelationships] = useState<GroupedRelationships>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchRelationships = async () => {
      try {
        const memberRelationships = await getFamilyRelationships(memberId);
        setRelationships(memberRelationships);
      } catch (error) {
        console.error('Error fetching relationships:', error);
        showToast?.('Error loading relationships', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchRelationships();
  }, [memberId, showToast]);

  useEffect(() => {
    // Group relationships by type
    const grouped: GroupedRelationships = {};
    
    relationships.forEach(rel => {
      // Only show relationships where this member is the source (to avoid duplicates)
      if (rel.person_a_id === memberId) {
        const relatedPerson = familyMembers.find(m => m.family_member_id === rel.person_b_id);
        if (relatedPerson) {
          const relationshipType = rel.relationship_type;
          if (!grouped[relationshipType]) {
            grouped[relationshipType] = [];
          }
          grouped[relationshipType].push({
            relationship: rel,
            person: relatedPerson
          });
        }
      }
    });

    setGroupedRelationships(grouped);
  }, [relationships, familyMembers, memberId]);

  const handleRemoveRelationship = async (relationship: FamilyRelationship) => {
    try {
      await removeFamilyRelationship(relationship.relationship_id);
      showToast?.('Relationship removed successfully', 'success');
      onRelationshipRemoved?.();
      
      // Refresh relationships
      const memberRelationships = await getFamilyRelationships(memberId);
      setRelationships(memberRelationships);
    } catch (error) {
      console.error('Error removing relationship:', error);
      showToast?.('Error removing relationship', 'error');
    }
  };

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const formatRelationshipType = (type: string): string => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRelationshipIcon = (type: string): string => {
    switch (type) {
      case 'parent': return '👨‍👩‍👧‍👦';
      case 'child': return '👶';
      case 'sibling': return '👫';
      case 'spouse': return '💕';
      case 'grandparent': return '👴';
      case 'grandchild': return '👶';
      case 'aunt': return '👩';
      case 'uncle': return '👨';
      case 'cousin': return '👥';
      case 'uncle_in_law': return '👨';
      case 'aunt_in_law': return '👩';
      case 'niece_in_law': return '👧';
      case 'nephew_in_law': return '👦';
      default: return '👤';
    }
  };

  const getRelationshipColor = (type: string): string => {
    switch (type) {
      case 'parent':
      case 'child': return 'bg-blue-100 text-blue-800';
      case 'sibling': return 'bg-green-100 text-green-800';
      case 'spouse': return 'bg-pink-100 text-pink-800';
      case 'grandparent':
      case 'grandchild': return 'bg-purple-100 text-purple-800';
      case 'aunt':
      case 'uncle':
      case 'uncle_in_law':
      case 'aunt_in_law':
      case 'niece_in_law':
      case 'nephew_in_law': return 'bg-yellow-100 text-yellow-800';
      case 'cousin': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <LoadSpinner size={32} />
      </div>
    );
  }

  if (relationships.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center py-4">
        No relationships found. Add some family connections!
      </div>
    );
  }

  const currentMember = familyMembers.find(m => m.family_member_id === memberId);
  if (!currentMember) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Relationships for {currentMember.first_name} {currentMember.last_name}
      </h3>
      
      {Object.entries(groupedRelationships).map(([relationshipType, relationshipList]) => (
        <div key={relationshipType} className="border rounded-lg overflow-hidden">
          <button
            onClick={() => toggleGroup(relationshipType)}
            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <span className="text-lg">{getRelationshipIcon(relationshipType)}</span>
              <span className="font-medium text-gray-800">
                {formatRelationshipType(relationshipType)}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRelationshipColor(relationshipType)}`}>
                {relationshipList.length}
              </span>
            </div>
            <span className="text-gray-500">
              {expandedGroups.has(relationshipType) ? '▼' : '▶'}
            </span>
          </button>
          
          {expandedGroups.has(relationshipType) && (
            <div className="border-t bg-white">
              {relationshipList.map(({ relationship, person }) => (
                <div key={relationship.relationship_id} className="px-4 py-3 border-b last:border-b-0 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {person.profile_photo ? (
                        <img
                          src={person.profile_photo}
                          alt={`${person.first_name} ${person.last_name}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-500 text-sm">
                          {person.first_name.charAt(0)}{person.last_name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {person.first_name} {person.last_name}
                      </div>
                      {relationship.relationship_subtype && (
                        <div className="text-sm text-gray-500">
                          {relationship.relationship_subtype}
                        </div>
                      )}
                      {relationship.start_date && (
                        <div className="text-xs text-gray-400">
                          Since {new Date(relationship.start_date).toLocaleDateString()}
                        </div>
                      )}
                      {relationship.notes && (
                        <div className="text-sm text-gray-600 mt-1">
                          {relationship.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleRemoveRelationship(relationship)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      
      {Object.keys(groupedRelationships).length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">👥</div>
          <p>No relationships found</p>
          <p className="text-sm">Add family connections to see them here</p>
        </div>
      )}
    </div>
  );
}
