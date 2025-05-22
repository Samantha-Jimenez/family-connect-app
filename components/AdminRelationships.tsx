import React from 'react'
import AdminCreateRelationshipForm from './AdminCreateRelationshipForm'
import { RelationshipType } from "@/hooks/dynamoDB";
import { FamilyMember } from "@/hooks/dynamoDB";
import MemberRelationships from './MemberRelationships';

const AdminRelationships = ({ familyMembers, handleCreateRelationship, selectedSourceMemberId, setSelectedSourceMemberId, selectedTargetMemberId, setSelectedTargetMemberId, relationshipType, setRelationshipType }: { familyMembers: FamilyMember[], handleCreateRelationship: (e: React.FormEvent<HTMLFormElement>) => void, selectedSourceMemberId: string, setSelectedSourceMemberId: (value: string) => void, selectedTargetMemberId: string, setSelectedTargetMemberId: (value: string) => void, relationshipType: RelationshipType, setRelationshipType: (value: RelationshipType) => void }) => {
  return (
    <div>
        <AdminCreateRelationshipForm
            familyMembers={familyMembers}
            handleCreateRelationship={handleCreateRelationship}
            selectedSourceMemberId={selectedSourceMemberId}
            setSelectedSourceMemberId={setSelectedSourceMemberId}
            selectedTargetMemberId={selectedTargetMemberId}
            setSelectedTargetMemberId={setSelectedTargetMemberId}
            relationshipType={relationshipType}
            setRelationshipType={setRelationshipType}
          />

        <div className="mt-8">
          <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">Relationships</h1>
          <div className="space-y-4">
            {familyMembers.map(member => (
              <div key={member.family_member_id} className="bg-white p-2 rounded-lg shadow">
                <h2 className="font-semibold mb-2">
                  {member.first_name} {member.last_name}
                </h2>
                <div className="ml-4">
                  <MemberRelationships memberId={member.family_member_id} familyMembers={familyMembers} />
                </div>
              </div>
            ))}
          </div>
        </div>
    </div>
  )
}

export default AdminRelationships