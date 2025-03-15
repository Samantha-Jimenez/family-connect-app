"use client";
import React, { useEffect, useState } from 'react';
import { useAuthenticator } from "@aws-amplify/ui-react";
import { addFamilyMember, getAllFamilyMembers, updateFamilyMember, addFamilyRelationship, RelationshipType } from "@/hooks/dynamoDB";
import { FamilyMember } from "@/hooks/dynamoDB";

const initialFormData = {
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  bio: '',
  phoneNumber: '',
  birthday: '',
  profilePhoto: '',
  city: '',
  state: '',
};

type FormDataKey = keyof typeof initialFormData;

const AdminPage = () => {
  const { user } = useAuthenticator();
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [message, setMessage] = useState('');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState(initialFormData);
  const [selectedSourceMemberId, setSelectedSourceMemberId] = useState<string | null>(null);
  const [selectedTargetMemberId, setSelectedTargetMemberId] = useState<string | null>(null);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('parent');

  useEffect(() => {
    if (user && user.userId === "f16b1510-0001-705f-8680-28689883e706") {
      setIsAdmin(true);
      fetchFamilyMembers();
    }
  }, [user]);

  const fetchFamilyMembers = async () => {
    try {
      const members = await getAllFamilyMembers();
      setFamilyMembers(members);
    } catch (error) {
      console.error("Error fetching family members:", error);
    }
  };

  if (!isAdmin) {
    return <div className="text-center text-red-500">Access Denied</div>;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name as FormDataKey]: value }));
  };

  const handleAddFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addFamilyMember(formData);
      setMessage('Family member added successfully!');
      setFormData(initialFormData);
      fetchFamilyMembers(); // Refresh the list
    } catch (error) {
      setMessage('Error adding family member.');
      console.error("Error adding family member:", error);
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prevState => ({ ...prevState, [name as FormDataKey]: value }));
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateFamilyMember(editingMemberId!, editFormData);
      setMessage('Family member updated successfully!');
      setEditingMemberId(null);
      fetchFamilyMembers(); // Refresh the list
    } catch (error) {
      setMessage('Error updating family member.');
      console.error("Error updating family member:", error);
    }
  };

  const handleCreateRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(selectedSourceMemberId, selectedTargetMemberId, relationshipType, "selectedSourceMemberId, selectedTargetMemberId, relationshipType");
    if (!selectedSourceMemberId || !selectedTargetMemberId) {
      setMessage('Please select both family members and a relationship type.');
      return;
    }
    try {
      await addFamilyRelationship(selectedSourceMemberId, selectedTargetMemberId, relationshipType);
      setMessage('Relationship added successfully!');
    } catch (error) {
      setMessage('Error adding relationship.');
      console.error("Error adding relationship:", error);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-4xl font-bold text-center mb-6 text-gray-800">Admin Page</h1>
      <div className="bg-white shadow-lg p-8 rounded-lg max-w-lg mx-auto">
        <form onSubmit={handleAddFamilyMember} className="space-y-4">
          {[
            { label: 'First Name', name: 'firstName', type: 'text' },
            { label: 'Last Name', name: 'lastName', type: 'text' },
            { label: 'Email', name: 'email', type: 'email' },
            { label: 'Username', name: 'username', type: 'text' },
            { label: 'Bio', name: 'bio', type: 'text' },
            { label: 'Phone Number', name: 'phoneNumber', type: 'text' },
            { label: 'Birthday', name: 'birthday', type: 'date' },
            { label: 'Profile Photo URL', name: 'profilePhoto', type: 'text' },
            { label: 'City', name: 'city', type: 'text' },
            { label: 'State', name: 'state', type: 'text' },
          ].map(({ label, name, type }) => (
            <div key={name} className="form-control">
              <label className="label">
                <span className="label-text text-gray-700">{label}</span>
              </label>
              <input
                type={type}
                name={name}
                value={formData[name as FormDataKey]}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                required={name === 'firstName' || name === 'lastName'}
              />
            </div>
          ))}
          <button type="submit" className="btn btn-primary w-full">Add Family Member</button>
        </form>
        {message && <p className="mt-4 text-green-500">{message}</p>}
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">Family Members</h2>
        <div className="overflow-x-auto">
          <table className="table w-full bg-white shadow-md rounded-lg">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-gray-700">First Name</th>
                <th className="px-4 py-2 text-left text-gray-700">Last Name</th>
                <th className="px-4 py-2 text-left text-gray-700">Email</th>
                <th className="px-4 py-2 text-left text-gray-700">Username</th>
                <th className="px-4 py-2 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {familyMembers.map(member => (
                <React.Fragment key={member.family_member_id}>
                  <tr
                    className="hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      if (editingMemberId === member.family_member_id) {
                        setEditingMemberId(null);
                      } else {
                        setEditingMemberId(member.family_member_id);
                        setEditFormData({
                          firstName: member.first_name,
                          lastName: member.last_name,
                          email: member.email,
                          username: member.username,
                          bio: member.bio,
                          phoneNumber: member.phone_number,
                          birthday: member.birthday,
                          profilePhoto: member.profile_photo,
                          city: member.city,
                          state: member.state,
                        });
                      }
                    }}
                  >
                    <td className="border-t px-4 py-2 text-gray-800">{member.first_name}</td>
                    <td className="border-t px-4 py-2 text-gray-800">{member.last_name}</td>
                    <td className="border-t px-4 py-2 text-gray-800">{member.email}</td>
                    <td className="border-t px-4 py-2 text-gray-800">{member.username}</td>
                    <td className="border-t px-4 py-2 text-gray-800">
                      <a href={`/profile/${member.family_member_id}`} className="btn btn-secondary">
                        View Profile
                      </a>
                    </td>
                  </tr>
                  {editingMemberId === member.family_member_id && (
                    <tr>
                      <td colSpan={5}>
                        <form onSubmit={handleUpdateMember} className="p-4 bg-gray-100 rounded-lg">
                          {Object.entries(editFormData).map(([key, value]) => (
                            <div key={key} className="mb-2">
                              <label className="block text-sm font-medium text-gray-700">{key}</label>
                              <input
                                type="text"
                                name={key}
                                value={value}
                                onChange={handleEditInputChange}
                                className="input input-bordered w-full"
                              />
                            </div>
                          ))}
                          <button type="submit" className="btn btn-primary mt-2">Update</button>
                        </form>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">Create Relationship</h2>
        <form onSubmit={handleCreateRelationship} className="bg-white shadow-lg p-8 rounded-lg max-w-lg mx-auto space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text text-gray-700">Select Source Family Member</span>
            </label>
            <select
              value={selectedSourceMemberId || ''}
              onChange={(e) => setSelectedSourceMemberId(e.target.value)}
              className="select select-bordered w-full"
            >
              <option value="" disabled>Select a member</option>
              {familyMembers.map(member => (
                <option key={member.family_member_id} value={member.family_member_id}>
                  {member.first_name} {member.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-gray-700">Select Relationship Type</span>
            </label>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
              className="select select-bordered w-full"
            >
              <option value="parent">Parent</option>
              <option value="child">Child</option>
              <option value="spouse">Spouse</option>
              {/* Add more options if needed */}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-gray-700">Select Target Family Member</span>
            </label>
            <select
              value={selectedTargetMemberId || ''}
              onChange={(e) => setSelectedTargetMemberId(e.target.value)}
              className="select select-bordered w-full"
            >
              <option value="" disabled>Select a member</option>
              {familyMembers.map(member => (
                <option key={member.family_member_id} value={member.family_member_id}>
                  {member.first_name} {member.last_name}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary w-full">Create Relationship</button>
        </form>
      </div>
    </div>
  );
};

export default AdminPage; 