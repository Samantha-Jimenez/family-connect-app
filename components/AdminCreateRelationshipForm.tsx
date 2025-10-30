import React from 'react'
import { FamilyMember, RelationshipType } from "@/hooks/dynamoDB";

const AdminCreateRelationshipForm = ({ familyMembers, handleCreateRelationship, selectedSourceMemberId, setSelectedSourceMemberId, selectedTargetMemberId, setSelectedTargetMemberId, relationshipType, setRelationshipType }: { familyMembers: FamilyMember[], handleCreateRelationship: (e: React.FormEvent<HTMLFormElement>) => void, selectedSourceMemberId: string, setSelectedSourceMemberId: (value: string) => void, selectedTargetMemberId: string, setSelectedTargetMemberId: (value: string) => void, relationshipType: RelationshipType, setRelationshipType: (value: RelationshipType) => void }) => {
  return (
    <div>
      <div className="mt-8 bg-white shadow-lg p-8 rounded-lg mx-auto space-y-4">
        <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">Create Relationship</h2>
        <form onSubmit={handleCreateRelationship} className="flex flex-col md:flex-row gap-6">
          <div className="relative z-0 w-full mb-5 group">
            <select
              value={selectedSourceMemberId || ''}
              onChange={(e) => setSelectedSourceMemberId(e.target.value)}
              className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
              required
            >
              <option value="" disabled>Select a member</option>
              {familyMembers.map(member => (
                <option key={member.family_member_id} value={member.family_member_id}>
                  {member.first_name} {member.last_name}
                </option>
              ))}
            </select>
            <label className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 whitespace-nowrap">
              Select Source Family Member
            </label>
          </div>

          <div className="relative z-0 w-full mb-5 group">
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
              className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
              required
            >
              <option value="parent">Parent</option>
              <option value="child">Child</option>
              <option value="spouse">Spouse</option>
              <option value="sibling">Sibling</option>
              <option value="grandparent">Grandparent</option>
              <option value="grandchild">Grandchild</option>
              <option value="aunt">Aunt</option>
              <option value="uncle">Uncle</option>
              <option value="nephew">Nephew</option>
              <option value="niece">Niece</option>
              <option value="cousin">Cousin</option>
              <option value="great_grandparent">Great Grandparent</option>
              <option value="great_grandchild">Great Grandchild</option>
              <option value="grand_aunt">Grand Aunt</option>
              <option value="grand_uncle">Grand Uncle</option>
              <option value="grand_niece">Grand Niece</option>
              <option value="grand_nephew">Grand Nephew</option>
              <option value="great_grand_aunt">Great Grand Aunt</option>
              <option value="great_grand_uncle">Great Grand Uncle</option>
              <option value="great_grand_niece">Great Grand Niece</option>
              <option value="great_grand_nephew">Great Grand Nephew</option>
              {/* Add more options if needed */}
            </select>
            <label className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 whitespace-nowrap">
              Select Relationship Type
            </label>
          </div>

          <div className="relative z-0 w-full mb-5 group">
            <select
              value={selectedTargetMemberId || ''}
              onChange={(e) => setSelectedTargetMemberId(e.target.value)}
              className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
              required
            >
              <option value="" disabled>Select a member</option>
              {familyMembers.map(member => (
                <option key={member.family_member_id} value={member.family_member_id}>
                  {member.first_name} {member.last_name}
                </option>
              ))}
            </select>
            <label className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 whitespace-nowrap">
              Select Target Family Member
            </label>
          </div>

          <button
            type="submit"
            className="text-white bg-yellow-800/80 hover:bg-yellow-800/90 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full px-5 py-2.5 text-center max-h-min whitespace-nowrap"
          >
            Create Relationship
          </button>
        </form>
      </div>

    </div>
  )
}

export default AdminCreateRelationshipForm