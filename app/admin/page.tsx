"use client";
import React, { useEffect, useState } from 'react';
import { useAuthenticator } from "@aws-amplify/ui-react";
import { addFamilyMember, getAllFamilyMembers, updateFamilyMember, addFamilyRelationship, RelationshipType } from "@/hooks/dynamoDB";
import { FamilyMember } from "@/hooks/dynamoDB";
import { useToast } from '@/context/ToastContext';
import AdminMembers from '@/components/AdminMembers';
import AdminRelationships from '@/components/AdminRelationships';
import EnhancedRelationshipForm from '@/components/EnhancedRelationshipForm';
import EnhancedMemberRelationships from '@/components/EnhancedMemberRelationships';
import AdminRelationshipCheck from '@/components/AdminRelationshipCheck';
import { DEMO_FAMILY_GROUP, REAL_FAMILY_GROUP } from '@/utils/demoConfig';

const initialFormData = {
  firstName: '',
  lastName: '',
  middleName: '',
  nickName: '',
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

type Tab = 'members' | 'relationships' | 'enhanced-relationships' | 'relationship-check';

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
  const [relationshipRefreshKey, setRelationshipRefreshKey] = useState<number>(Date.now());
  const [sortField, setSortField] = useState<keyof FamilyMember | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isDemoMember, setIsDemoMember] = useState(false);
  const [isDemoRelationshipsMode, setIsDemoRelationshipsMode] = useState(false);

  const sortedFamilyMembers = React.useMemo(() => {
    if (!sortField) return familyMembers;
    
    return [...familyMembers].sort((a, b) => {
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [familyMembers, sortField, sortDirection]);

  useEffect(() => {
    if (user && user.userId === "f16b1510-0001-705f-8680-28689883e706") {
      setIsAdmin(true);
      fetchFamilyMembers();
    }
  }, [user]);

  const fetchFamilyMembers = async () => {
    try {
      // Fetch all members (both real and demo) for admin view
      const members = await getAllFamilyMembers(undefined, true);
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
      const familyGroup = isDemoMember ? DEMO_FAMILY_GROUP : REAL_FAMILY_GROUP;
      await addFamilyMember({ ...formData, profile_photo: profilePhotoKey, family_group: familyGroup });
      showToast('Family member added successfully!', 'success');
      setFormData(initialFormData);
      setSelectedImage(null);
      setImagePreview(null);
      setUploadProgress(0);
      setIsDemoMember(false);
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

  const handleSort = (field: keyof FamilyMember) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-4xl font-bold text-center mb-6 text-gray-800">Admin Page</h1>
      <div className="text-center mb-6">
        <a
          href="/admin/demo-data"
          className="btn bg-[#EA9010] hover:bg-[#F4C47A] hover:text-gray-600 border-none text-white btn-sm"
        >
          Manage Demo Data
        </a>
      </div>
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
          <a 
            className={`tab tab-lg text-sm poppins-light ${activeTab === 'enhanced-relationships' ? 'tab-active bg-yellow-800/80 rounded-lg text-white hover:text-white' : ''}`}
            onClick={() => setActiveTab('enhanced-relationships')}
          >
            Enhanced Relationships
          </a>
          <a 
            className={`tab tab-lg text-sm poppins-light ${activeTab === 'relationship-check' ? 'tab-active bg-yellow-800/80 rounded-lg text-white hover:text-white' : ''}`}
            onClick={() => setActiveTab('relationship-check')}
          >
            Relationship Check
          </a>
        </div>
        <div className="mt-4">
          {activeTab === 'members' && <AdminMembers familyMembers={sortedFamilyMembers} handleAddFamilyMember={handleAddFamilyMember} formData={formData} handleInputChange={handleInputChange} imagePreview={imagePreview} handleImageChange={handleImageChange} isUploading={isUploading} uploadProgress={uploadProgress} handleClearImage={handleClearImage} editingMemberId={editingMemberId} setEditingMemberId={setEditingMemberId} editFormData={editFormData} setEditFormData={setEditFormData} handleEditInputChange={handleEditInputChange} handleUpdateMember={handleUpdateMember} handleEditImageChange={handleEditImageChange} editImagePreview={editImagePreview} editIsUploading={editIsUploading} editUploadProgress={editUploadProgress} sortField={sortField} sortDirection={sortDirection} handleSort={handleSort} isDemoMember={isDemoMember} setIsDemoMember={setIsDemoMember} />}
          {activeTab === 'relationships' && <AdminRelationships familyMembers={familyMembers} handleCreateRelationship={handleCreateRelationship} selectedSourceMemberId={selectedSourceMemberId} setSelectedSourceMemberId={setSelectedSourceMemberId} selectedTargetMemberId={selectedTargetMemberId} setSelectedTargetMemberId={setSelectedTargetMemberId} relationshipType={relationshipType} setRelationshipType={setRelationshipType} />}
          {activeTab === 'enhanced-relationships' && (
            <div className="space-y-8">
              <EnhancedRelationshipForm 
                onRelationshipCreated={() => {
                  showToast('Relationship created successfully!', 'success');
                  fetchFamilyMembers(); // Refresh the family members list
                  // Force refresh of relationship components by updating a refresh key
                  setRelationshipRefreshKey(Date.now());
                }}
                showToast={showToast}
              />
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Family Member Relationships</h2>
                
                {/* Toggle between Real and Demo Family Members */}
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Family Group:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDemoRelationshipsMode(false)}
                      className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                        !isDemoRelationshipsMode
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Real
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDemoRelationshipsMode(true)}
                      className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                        isDemoRelationshipsMode
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Demo
                    </button>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {familyMembers
                    .filter(member => {
                      const memberGroup = member.family_group || REAL_FAMILY_GROUP;
                      return isDemoRelationshipsMode 
                        ? memberGroup === DEMO_FAMILY_GROUP 
                        : memberGroup === REAL_FAMILY_GROUP;
                    })
                    .map((member) => (
                      <div key={member.family_member_id} className="border rounded-lg p-4">
                        <EnhancedMemberRelationships
                          key={`${member.family_member_id}-${relationshipRefreshKey}`}
                          memberId={member.family_member_id}
                          familyMembers={familyMembers.filter(m => {
                            const mGroup = m.family_group || REAL_FAMILY_GROUP;
                            return isDemoRelationshipsMode 
                              ? mGroup === DEMO_FAMILY_GROUP 
                              : mGroup === REAL_FAMILY_GROUP;
                          })}
                          onRelationshipRemoved={() => {
                            showToast('Relationship removed successfully', 'success');
                          }}
                          showToast={showToast}
                        />
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'relationship-check' && <AdminRelationshipCheck />}
        </div>
      </div>

    </div>
  );
};

export default AdminPage; 