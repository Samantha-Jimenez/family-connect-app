'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import Image from 'next/image';
import { savePhotoToDB, getAllFamilyMembers } from '@/hooks/dynamoDB';
import { getCurrentUser } from 'aws-amplify/auth';
import Select from 'react-select';
import { useToast } from '@/context/ToastContext';

interface PhotoUploadProps {
  onUploadComplete: () => void;
}

interface FamilyMember {
  family_member_id: string;
  first_name: string;
  last_name: string;
}

interface UserOption {
  value: string;
  label: string;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ onUploadComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [location, setLocation] = useState({
    country: '',
    state: '',
    city: '',
    neighborhood: ''
  });
  const [description, setDescription] = useState('');
  const [dateTaken, setDateTaken] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const { showToast } = useToast();

  // Transform familyMembers into UserOption format for react-select
  const familyMemberOptions: UserOption[] = familyMembers.map((member) => ({
    value: member.family_member_id,
    label: `${member.first_name} ${member.last_name}`
  }));

  useEffect(() => {
    const loadFamilyMembers = async () => {
      try {
        const members = await getAllFamilyMembers();
        setFamilyMembers(members);
      } catch (error) {
        console.error('Error loading family members:', error);
      }
    };
    loadFamilyMembers();
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Create a preview URL for the selected file
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        if (e.target?.result) {
          setPreviewUrl(e.target.result as string);
        }
      };
      fileReader.readAsDataURL(file);
    }
  };

  // Reset preview when form is submitted or on component unmount
  useEffect(() => {
    return () => {
      // Clean up the preview URL when component unmounts
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      // Get the current user ID
      const user = await getCurrentUser();
      if (!user?.userId) {
        throw new Error("User not authenticated");
      }

      // First upload to S3
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('location', JSON.stringify(location));
      formData.append('description', description);
      formData.append('dateTaken', dateTaken);
      
      // Include both IDs and names in the people tagged data
      const taggedPeople = selectedUsers.map(user => ({
        id: user.value,
        name: user.label
      }));
      formData.append('peopleTagged', JSON.stringify(taggedPeople));
      formData.append('uploadedBy', user.userId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Upload result:', result); // Debug log
      
      if (!result.key) {
        console.error('Upload response missing key:', result);
        throw new Error('Upload response missing key');
      }

      const s3Url = `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_PROJECT_REGION}.amazonaws.com/${result.key}`;
      console.log('Generated S3 URL:', s3Url); // Debug log

      // Save to DynamoDB
      await savePhotoToDB({
        photo_id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        s3_key: result.key,
        uploaded_by: user.userId,
        upload_date: new Date().toISOString(),
        description,
        location,
        date_taken: dateTaken,
        people_tagged: taggedPeople,
      });

      // Reset form and preview
      setSelectedFile(null);
      setPreviewUrl(null);
      setLocation({ country: '', state: '', city: '', neighborhood: '' });
      setDescription('');
      setDateTaken('');
      setSelectedUsers([]);
      
      // Add success toast
      showToast('Photo uploaded successfully!', 'success');
      
      // Call onUploadComplete immediately
      onUploadComplete();

    } catch (error) {
      console.error('Upload error:', error);
      // Add error toast
      showToast(error instanceof Error ? error.message : 'Failed to upload photo', 'error');
      setError(error instanceof Error ? error.message : 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Photo
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            dark:file:bg-gray-700 dark:file:text-gray-200"
        />
      </div>

      {previewUrl && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Photo Preview:</h3>
          <div className="relative w-full h-[300px] mt-2">
            <Image
              src={previewUrl}
              alt="Selected photo preview"
              fill
              className="object-contain rounded-lg"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Location Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Country
            </label>
            <input
              type="text"
              value={location.country}
              onChange={(e) => setLocation({ ...location, country: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              State/Province
            </label>
            <input
              type="text"
              value={location.state}
              onChange={(e) => setLocation({ ...location, state: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              City
            </label>
            <input
              type="text"
              value={location.city}
              onChange={(e) => setLocation({ ...location, city: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Neighborhood
            </label>
            <input
              type="text"
              value={location.neighborhood}
              onChange={(e) => setLocation({ ...location, neighborhood: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
          placeholder="Enter photo description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Date Taken
        </label>
        <input
          type="date"
          value={dateTaken}
          onChange={(e) => setDateTaken(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Tag People
        </label>
        <Select
          isMulti
          options={familyMemberOptions}
          value={selectedUsers}
          onChange={(selected) => setSelectedUsers(selected as UserOption[])}
          className="mt-1"
          classNamePrefix="select"
          placeholder="Select family members in this photo..."
          noOptionsMessage={() => "No family members found"}
          isLoading={familyMembers.length === 0}
          theme={(theme) => ({
            ...theme,
            colors: {
              ...theme.colors,
              primary: '#3b82f6',
              primary25: '#bfdbfe',
              neutral0: 'var(--bg-color, white)',
              neutral80: 'var(--text-color, black)',
            },
          })}
        />
      </div>

      <button
        type="submit"
        disabled={!selectedFile || isUploading}
        className={`w-full px-4 py-2 text-white rounded-md ${
          isUploading || !selectedFile
            ? 'bg-blue-300 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {isUploading ? 'Uploading...' : 'Upload Photo'}
      </button>

      {uploadUrl && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Uploaded Photo:</h3>
          <div className="relative w-full h-[300px]">
            <Image
              src={uploadUrl}
              alt="Uploaded photo"
              fill
              className="object-contain rounded-lg"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </div>
      )}
    </form>
  );
};

export default PhotoUpload;
