import { useEffect, useState } from 'react';
import { getFamilyRelationships, FamilyMember } from '../hooks/dynamoDB';

interface MemberRelationshipsProps {
  memberId: string;
  familyMembers: FamilyMember[];
}

export default function MemberRelationships({ memberId, familyMembers }: MemberRelationshipsProps) {
  const [relationships, setRelationships] = useState<Array<{
    source_id: string;
    target_id: string;
    relationship_type: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelationships = async () => {
      try {
        const memberRelationships = await getFamilyRelationships(memberId);
        setRelationships(memberRelationships);
      } catch (error) {
        console.error('Error fetching relationships:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelationships();
  }, [memberId]);

  if (loading) {
    return <div className="text-gray-500">Loading relationships...</div>;
  }

  if (relationships.length === 0) {
    return <div className="text-gray-500 text-sm">No relationships found</div>;
  }

  const currentMember = familyMembers.find(m => m.family_member_id === memberId);
  if (!currentMember) return null;

  return (
    <div className="space-y-1">
      {relationships
        .filter(rel => rel.source_id === memberId)
        .map((rel, index) => {
          const relatedMember = familyMembers.find(m => m.family_member_id === rel.target_id);
          if (!relatedMember) return null;

          const relationshipText = `${currentMember.first_name} is the ${rel.relationship_type} of ${relatedMember.first_name}`;

          return (
            <div key={index} className="text-gray-700 text-sm">
              • {relatedMember.first_name} {relatedMember.last_name}
              <span className="text-gray-500 ml-2">
                ({relationshipText})
              </span>
            </div>
          );
        })}
    </div>
  );
} 