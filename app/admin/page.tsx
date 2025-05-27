"use client";
import React, { useEffect, useState } from 'react';
import { useAuthenticator } from "@aws-amplify/ui-react";
import { addFamilyMember, getAllFamilyMembers, updateFamilyMember, addFamilyRelationship, RelationshipType } from "@/hooks/dynamoDB";
import { FamilyMember } from "@/hooks/dynamoDB";
import { useToast } from '@/context/ToastContext';
import AdminMembers from '@/components/AdminMembers';
import AdminRelationships from '@/components/AdminRelationships';

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
  death_date: '',
};

type FormDataKey = keyof typeof initialFormData;

type Tab = 'members' | 'relationships';

const AdminPage = () => {
  const { user } = useAuthenticator();
  const { showToast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
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
  const [activeTab, setActiveTab] = useState<Tab>('members');

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
      showToast('Family member added successfully!', 'success');
      setFormData(initialFormData);
      setSelectedImage(null);
      setImagePreview(null);
      setUploadProgress(0);
      fetchFamilyMembers();
    } catch (error) {
      showToast('Error adding family member.', 'error');
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
        death_date: editFormData.death_date ?? '',
      });
      showToast('Family member updated successfully!', 'success');
      setEditingMemberId(null);
      setEditSelectedImage(null);
      setEditImagePreview(null);
      setEditUploadProgress(0);
      fetchFamilyMembers();
    } catch (error) {
      showToast('Error updating family member.', 'error');
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
      setSelectedSourceMemberId('');
      setSelectedTargetMemberId('');
      setRelationshipType('parent');
      showToast('Relationship created successfully!', 'success');
    } catch (error) {
      showToast('Error creating relationship.', 'error');
      console.error("Error creating relationship:", error);
    }
  };

  const handleClearImage = () => {
    setImagePreview(null);
    setSelectedImage(null);
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-4xl font-bold text-center mb-6 text-gray-800">Admin Page</h1>
      <div className="col-span-1 sm:col-span-2">
        <div data-theme="light" className="tabs tabs-bordered bg-white rounded-lg shadow-lg justify-self-center w-max m-auto">
          <a 
            className={`tab tab-lg text-sm poppins-light ${activeTab === 'members' ? 'tab-active bg-yellow-800/80 rounded-lg text-white hover:text-white' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            Members
          </a>
          <a 
            className={`tab tab-lg text-sm poppins-light ${activeTab === 'relationships' ? 'tab-active bg-yellow-800/80 rounded-lg text-white hover:text-white' : ''}`}
            onClick={() => setActiveTab('relationships')}
          >
            Relationships
          </a>
        </div>
        <div className="mt-4">
          {activeTab === 'members' && <AdminMembers familyMembers={familyMembers} handleAddFamilyMember={handleAddFamilyMember} formData={formData} handleInputChange={handleInputChange} imagePreview={imagePreview} handleImageChange={handleImageChange} isUploading={isUploading} uploadProgress={uploadProgress} handleClearImage={handleClearImage} editingMemberId={editingMemberId} setEditingMemberId={setEditingMemberId} editFormData={editFormData} setEditFormData={setEditFormData} handleEditInputChange={handleEditInputChange} handleUpdateMember={handleUpdateMember} handleEditImageChange={handleEditImageChange} editImagePreview={editImagePreview} editIsUploading={editIsUploading} editUploadProgress={editUploadProgress} />}
          {activeTab === 'relationships' && <AdminRelationships familyMembers={familyMembers} handleCreateRelationship={handleCreateRelationship} selectedSourceMemberId={selectedSourceMemberId} setSelectedSourceMemberId={setSelectedSourceMemberId} selectedTargetMemberId={selectedTargetMemberId} setSelectedTargetMemberId={setSelectedTargetMemberId} relationshipType={relationshipType} setRelationshipType={setRelationshipType} />}
        </div>
      </div>

    </div>
  );
};

export default AdminPage; 