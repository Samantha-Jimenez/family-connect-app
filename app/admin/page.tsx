"use client";
import React, { useEffect, useState } from 'react';
import { useAuthenticator } from "@aws-amplify/ui-react";
import { addFamilyMember, getAllFamilyMembers, updateFamilyMember, addFamilyRelationship, RelationshipType } from "@/hooks/dynamoDB";
import { FamilyMember } from "@/hooks/dynamoDB";
import { getFullImageUrl } from '@/utils/imageUtils';
import AdminCreateRelationshipForm from '@/components/AdminCreateRelationshipForm';
import AdminCreateFamilyMemberForm from '@/components/AdminCreateFamilyMemberForm';
import MemberRelationships from '@/components/MemberRelationships';

const initialFormData = {
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  bio: '',
  phoneNumber: '',
  birthday: '',
  birth_city: '',
  birth_state: '',
  profile_photo: '',
  current_city: '',
  current_state: '',
};

type FormDataKey = keyof typeof initialFormData;

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const AdminPage = () => {
  const { user } = useAuthenticator();
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [message, setMessage] = useState('');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState(initialFormData);
  const [selectedSourceMemberId, setSelectedSourceMemberId] = useState<string>('');
  const [selectedTargetMemberId, setSelectedTargetMemberId] = useState<string>('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('parent');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [editSelectedImage, setEditSelectedImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editUploadProgress, setEditUploadProgress] = useState(0);
  const [editIsUploading, setEditIsUploading] = useState(false);

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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name as FormDataKey]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 90;
          setUploadProgress(Math.round(progress));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            setUploadProgress(100);
            setIsUploading(false);
            resolve(response.key);
          } catch (error) {
            setIsUploading(false);
            reject(new Error('Invalid response format'));
          }
        } else {
          setIsUploading(false);
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        setIsUploading(false);
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });
  };

  const handleAddFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let profilePhotoKey = formData.profile_photo;
      if (selectedImage) {
        profilePhotoKey = await uploadImage(selectedImage);
      }
      await addFamilyMember({ ...formData, profile_photo: profilePhotoKey });
      setMessage('Family member added successfully!');
      setFormData(initialFormData);
      setSelectedImage(null);
      setImagePreview(null);
      setUploadProgress(0);
      fetchFamilyMembers(); // Refresh the list
    } catch (error) {
      setMessage('Error adding family member.');
      console.error("Error adding family member:", error);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEditInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditFormData(prevState => ({ ...prevState, [name as FormDataKey]: value }));
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditSelectedImage(file);
      setEditImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadEditImage = async (file: File): Promise<string> => {
    setEditIsUploading(true);
    setEditUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 90;
          setEditUploadProgress(Math.round(progress));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            setEditUploadProgress(100);
            setEditIsUploading(false);
            resolve(response.key);
          } catch (error) {
            setEditIsUploading(false);
            reject(new Error('Invalid response format'));
          }
        } else {
          setEditIsUploading(false);
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        setEditIsUploading(false);
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let profilePhotoKey = editFormData.profile_photo;
      if (editSelectedImage) {
        profilePhotoKey = await uploadEditImage(editSelectedImage);
      }
      await updateFamilyMember(editingMemberId!, {
        ...editFormData,
        profile_photo: profilePhotoKey ?? '',
      });
      setMessage('Family member updated successfully!');
      setEditingMemberId(null);
      setEditSelectedImage(null);
      setEditImagePreview(null);
      setEditUploadProgress(0);
      fetchFamilyMembers(); // Refresh the list
    } catch (error) {
      setMessage('Error updating family member.');
      console.error("Error updating family member:", error);
      setEditIsUploading(false);
      setEditUploadProgress(0);
    }
  };

  const handleCreateRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addFamilyRelationship(
        selectedSourceMemberId,
        selectedTargetMemberId,
        relationshipType
      );
      // Clear the form after successful creation
      setSelectedSourceMemberId('');
      setSelectedTargetMemberId('');
      setRelationshipType('parent');
      setMessage('Relationship created successfully!');
    } catch (error) {
      setMessage('Error creating relationship.');
      console.error("Error creating relationship:", error);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-4xl font-bold text-center mb-6 text-gray-800">Admin Page</h1>
      <div className="flex flex-col md:flex-row gap-8 justify-center items-start">
        <div className="w-full md:w-1/2">
          <AdminCreateFamilyMemberForm
            handleAddFamilyMember={handleAddFamilyMember}
            formData={formData}
            handleInputChange={handleInputChange}
            imagePreview={imagePreview}
            handleImageChange={handleImageChange}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />
          {message && <p className="mt-4 text-green-500">{message}</p>}
        </div>
        <div className="w-full md:w-1/2">
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
        </div>
      </div>

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
                          birth_city: member.birth_city,
                          birth_state: member.birth_state,
                          profile_photo: member.profile_photo,
                          current_city: member.current_city,
                          current_state: member.current_state,
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
                          <div className="grid md:grid-cols-2 md:gap-6">
                            <div className="relative z-0 w-full mb-5 group">
                              <input
                                type="text"
                                name="firstName"
                                id="edit_first_name"
                                value={editFormData.firstName}
                                onChange={handleEditInputChange}
                                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                placeholder=" "
                                required
                              />
                              <label htmlFor="edit_first_name" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">First name</label>
                            </div>
                            <div className="relative z-0 w-full mb-5 group">
                              <input
                                type="text"
                                name="lastName"
                                id="edit_last_name"
                                value={editFormData.lastName}
                                onChange={handleEditInputChange}
                                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                placeholder=" "
                                required
                              />
                              <label htmlFor="edit_last_name" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Last name</label>
                            </div>
                          </div>
                          <div className="grid md:grid-cols-2 md:gap-6">
                            <div className="relative z-0 w-full mb-5 group">
                              <input
                                type="text"
                                name="birth_city"
                                id="edit_birth_city"
                                value={editFormData.birth_city}
                                onChange={handleEditInputChange}
                                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                placeholder=" "
                              />
                              <label htmlFor="edit_birth_city" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Birth City/Town</label>
                            </div>
                            <div className="relative z-0 w-full mb-5 group">
                              <select
                                name="birth_state"
                                id="edit_birth_state"
                                value={editFormData.birth_state}
                                onChange={handleEditInputChange}
                                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                              >
                                <option value="">Select Birth State</option>
                                {US_STATES.map(state => (
                                  <option key={state} value={state}>{state}</option>
                                ))}
                              </select>
                              <label htmlFor="edit_birth_state" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Birth State</label>
                            </div>
                          </div>
                          <div className="relative z-0 w-full mb-5 group">
                            <input
                              type="text"
                              name="username"
                              id="edit_username"
                              value={editFormData.username}
                              onChange={handleEditInputChange}
                              className="block py-2.5 px-0 w-full text-sm bg-transparent border-0 border-b-2 border-gray-300 appearance-none text-black focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                              placeholder=" "
                            />
                            <label htmlFor="edit_username" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Username</label>
                          </div>
                          <div className="relative z-0 w-full mb-5 group">
                            <input
                              type="email"
                              name="email"
                              id="edit_email"
                              value={editFormData.email}
                              onChange={handleEditInputChange}
                              className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                              placeholder=" "
                            />
                            <label htmlFor="edit_email" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Email address</label>
                          </div>
                          <div className="grid md:grid-cols-2 md:gap-6">
                            <div className="relative z-0 w-full mb-5 group">
                              <input
                                type="date"
                                name="birthday"
                                id="edit_birthday"
                                value={editFormData.birthday}
                                onChange={handleEditInputChange}
                                className="block py-2.5 px-0 w-full text-sm bg-transparent border-0 border-b-2 border-gray-300 appearance-none text-black focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                placeholder=" "
                              />
                              <label htmlFor="edit_birthday" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Birthday (MM/DD/YYYY)</label>
                            </div>
                            <div className="relative z-0 w-full mb-5 group">
                              <input
                                type="tel"
                                name="phoneNumber"
                                id="edit_phone"
                                value={editFormData.phoneNumber}
                                onChange={handleEditInputChange}
                                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                placeholder=" "
                              />
                              <label htmlFor="edit_phone" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Phone number</label>
                            </div>
                          </div>
                          <div className="relative z-0 w-full mb-5 group">
                            <input
                              type="text"
                              name="bio"
                              id="edit_bio"
                              value={editFormData.bio}
                              onChange={handleEditInputChange}
                              className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                              placeholder=" "
                            />
                            <label htmlFor="edit_bio" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Bio</label>
                          </div>
                          <div className="grid md:grid-cols-2 md:gap-6">
                            <div className="relative z-0 w-full mb-5 group">
                              <input
                                type="text"
                                name="current_city"
                                id="edit_current_city"
                                value={editFormData.current_city}
                                onChange={handleEditInputChange}
                                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                placeholder=" "
                              />
                              <label htmlFor="edit_current_city" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Current City/Town</label>
                            </div>
                            <div className="relative z-0 w-full mb-5 group">
                              <select
                                name="current_state"
                                id="edit_current_state"
                                value={editFormData.current_state}
                                onChange={handleEditInputChange}
                                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                              >
                                <option value="">Select Current State</option>
                                {US_STATES.map(state => (
                                  <option key={state} value={state}>{state}</option>
                                ))}
                              </select>
                              <label htmlFor="edit_current_state" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">State</label>
                            </div>
                          </div>
                          <div className="relative z-0 w-full mb-5 group">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                            <div className="flex flex-col items-center gap-2 w-full">
                              <div className="avatar">
                                <div className="w-24 h-24 rounded-full">
                                  {editImagePreview ? (
                                    <img
                                      src={editImagePreview}
                                      alt="Profile preview"
                                      className="rounded-full object-cover w-24 h-24"
                                    />
                                  ) : editFormData.profile_photo ? (
                                    <img
                                      src={getFullImageUrl(editFormData.profile_photo)}
                                      alt="Current profile"
                                      className="rounded-full object-cover w-24 h-24"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                                      <span className="icon-[mdi--account] text-4xl text-gray-400" />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleEditImageChange}
                                className="file-input file-input-bordered w-full"
                                disabled={editIsUploading}
                              />
                              {editIsUploading && (
                                <div className="w-full">
                                  <progress
                                    className="progress progress-success w-full"
                                    value={editUploadProgress}
                                    max="100"
                                  ></progress>
                                  <p className="text-center text-sm text-gray-600 mt-1">
                                    {editUploadProgress}%
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <button type="submit" className="text-white bg-[#914F2F] hover:bg-[#914F2F]/90 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full px-5 py-2.5 text-center mt-2">
                            Update
                          </button>
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
    </div>
  );
};

export default AdminPage; 