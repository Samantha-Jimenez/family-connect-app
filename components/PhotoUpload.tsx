'use client';

import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import Image from 'next/image';
import { savePhotoToDB, getAllFamilyMembers } from '@/hooks/dynamoDB';
import { getCurrentUser } from 'aws-amplify/auth';
import Select from 'react-select';
import { useToast } from '@/context/ToastContext';
import LoadSpinner from '@/components/LoadSpinner';

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
  const [dateYear, setDateYear] = useState('');
  const [dateMonth, setDateMonth] = useState('');
  const [dateDay, setDateDay] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Transform familyMembers into UserOption format for react-select
  const familyMemberOptions: UserOption[] = familyMembers.map((member) => ({
    value: member.family_member_id,
    label: `${member.first_name} ${member.last_name}`
  }));

  useEffect(() => {
    const loadFamilyMembers = async () => {
      try {
        const user = await getCurrentUser();
        const members = await getAllFamilyMembers(user?.userId);
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

      // Construct date string from separate fields
      let dateTaken = '';
      if (dateYear) {
        dateTaken = dateYear;
        if (dateMonth) {
          dateTaken += `-${dateMonth.padStart(2, '0')}`;
          if (dateDay) {
            dateTaken += `-${dateDay.padStart(2, '0')}`;
          }
        }
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
        metadata: {
          description,
          location,
          date_taken: dateTaken,
          people_tagged: taggedPeople,
        },
        album_ids: [],
        url: s3Url,
        lastModified: new Date().toISOString(),
      });

      // Reset form and preview
      setSelectedFile(null);
      setPreviewUrl(null);
      setLocation({ country: '', state: '', city: '', neighborhood: '' });
      setDescription('');
      setDateYear('');
      setDateMonth('');
      setDateDay('');
      setSelectedUsers([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
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
      <div className="flex items-center gap-2 opacity-0 animate-[fadeIn_0.4s_ease-in_forwards]" style={{ animationDelay: '0.2s' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="py-4 mt-1 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-sand-beige/40 file:text-carrot-orange
            hover:file:bg-golden-sand/40
            dark:file:bg-gray-700 dark:file:text-gray-200"
        />
        {previewUrl && (
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setPreviewUrl(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="ml-2 px-3 py-1 bg-terracotta-red/20 text-terracotta-red rounded hover:bg-terracotta-red hover:text-white poppins-semibold rounded-full font-bold text-sm"
          >
            Clear
          </button>
        )}
      </div>

      {previewUrl && (
        <div className="mt-4 opacity-0 animate-[fadeIn_0.4s_ease-in_forwards]" style={{ animationDelay: '0.3s' }}>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Photo Preview</h3>
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

      <div className="space-y-4 opacity-0 animate-[fadeIn_0.4s_ease-in_forwards]" style={{ animationDelay: '0.4s' }}>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Photo Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">
              Country
            </label>
            <input
              type="text"
              value={location.country}
              onChange={(e) => setLocation({ ...location, country: e.target.value })}
              className="mt-1 block w-full rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"
              placeholder="Country"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500">
              State/Province
            </label>
            <input
              type="text"
              value={location.state}
              onChange={(e) => setLocation({ ...location, state: e.target.value })}
              className="mt-1 block w-full rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"
              placeholder="State/Province"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500">
              City
            </label>
            <input
              type="text"
              value={location.city}
              onChange={(e) => setLocation({ ...location, city: e.target.value })}
              className="mt-1 block w-full rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"
              placeholder="City"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500">
              Neighborhood
            </label>
            <input
              type="text"
              value={location.neighborhood}
              onChange={(e) => setLocation({ ...location, neighborhood: e.target.value })}
              className="mt-1 block w-full rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"
              placeholder="Neighborhood"
            />
          </div>
        </div>
      </div>

      <div className="opacity-0 animate-[fadeIn_0.4s_ease-in_forwards]" style={{ animationDelay: '0.5s' }}>
        <label className="block text-sm font-medium text-gray-500">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 placeholder:poppins-extralight placeholder:font-weight-200 transition-colors"
          placeholder="Enter photo description"
        />
      </div>

      <div className="opacity-0 animate-[fadeIn_0.4s_ease-in_forwards]" style={{ animationDelay: '0.6s' }}>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Date Taken
        </label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Year
            </label>
            <input
              type="number"
              min="1800"
              max={new Date().getFullYear()}
              value={dateYear}
              onChange={(e) => {
                const year = e.target.value;
                const currentYear = new Date().getFullYear();
                
                // Prevent future years
                if (year && parseInt(year) > currentYear) {
                  return; // Don't update the state
                }
                
                setDateYear(year);
                // Clear month and day if year is invalid or removed
                if (!year || year.length !== 4) {
                  setDateMonth('');
                  setDateDay('');
                }
              }}
              className={`block w-full rounded-md border-[1.5px] focus:outline-none focus:ring-1 bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors ${
                dateYear && dateYear.length < 4
                  ? 'focus:border-yellow-500 focus:ring-yellow-500 hover:border-red-600'
                  : 'border-gray-300 focus:border-[#C8D5B9] focus:ring-[#5CAB68] hover:border-[#D2FF28]'
              }`}
              placeholder="YYYY"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Month
            </label>
            <Select
              options={[
                { value: '1', label: 'January' },
                { value: '2', label: 'February' },
                { value: '3', label: 'March' },
                { value: '4', label: 'April' },
                { value: '5', label: 'May' },
                { value: '6', label: 'June' },
                { value: '7', label: 'July' },
                { value: '8', label: 'August' },
                { value: '9', label: 'September' },
                { value: '10', label: 'October' },
                { value: '11', label: 'November' },
                { value: '12', label: 'December' }
              ]}
              value={dateMonth ? { value: dateMonth, label: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][parseInt(dateMonth) - 1] } : null}
              onChange={(selected) => {
                const monthValue = selected ? selected.value : '';
                setDateMonth(monthValue);
                // Clear day if month is removed
                if (!monthValue) {
                  setDateDay('');
                }
              }}
              isDisabled={dateYear.length !== 4}
              className="text-black poppins-light"
              classNamePrefix="select"
              placeholder="Select month"
              isClearable
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              menuPlacement="bottom"
              styles={{
                placeholder: (base) => ({
                  ...base,
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 300,
                  color: '#9BA3AF',
                }),
                menu: (provided) => ({
                  ...provided,
                  zIndex: 9999,
                }),
                menuPortal: (provided) => ({
                  ...provided,
                  zIndex: 9999,
                }),
                control: (base: any, state: any) => ({
                  ...base,
                  borderWidth: '1.5px',
                  borderColor: state.isFocused
                    ? '#C8D5B9'
                    : state.menuIsOpen
                    ? '#D2FF28'
                    : '#d1d5db',
                  boxShadow: state.isFocused ? '0 0 0 1px #5CAB68' : 'none',
                  '&:hover': {
                    borderColor: '#D2FF28',
                  },
                  height: '2.7rem',
                }),
                option: (provided: any, state: any) => ({
                  ...provided,
                  backgroundColor: state.isFocused ? '#E8D4B8' : 'transparent',
                  color: state.isFocused ? '#000' : '#000',
                  '&:active': {
                    backgroundColor: '#F4C47A',
                    color: '#fff',
                  },
                }),
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Day
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              value={dateDay}
              onChange={(e) => {
                const day = e.target.value;
                
                // Only allow numeric input
                if (day && !/^\d*$/.test(day)) {
                  return;
                }
                
                // Allow single "0" (for typing 01-09), but validate complete numbers
                if (day.length === 2) {
                  const dayNum = parseInt(day);
                  if (dayNum < 1 || dayNum > 31) {
                    return; // Don't update if invalid 2-digit number
                  }
                }
                
                setDateDay(day);
              }}
              onBlur={() => {
                // Auto-populate leading zero if single digit
                if (dateDay && dateDay.length === 1) {
                  setDateDay(dateDay.padStart(2, '0'));
                }
              }}
              disabled={!dateMonth}
              className={`block w-full rounded-md border-[1.5px] focus:outline-none focus:ring-1 bg-white p-2 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed disabled:hover:border-gray-300 ${
                dateDay && dateDay.length === 1
                  ? 'focus:border-yellow-500 focus:ring-yellow-500 hover:border-red-600'
                  : 'border-gray-300 focus:border-[#C8D5B9] focus:ring-[#5CAB68] hover:border-[#D2FF28]'
              }`}
              placeholder="DD"
            />
          </div>
        </div>
      </div>

      <div className="opacity-0 animate-[fadeIn_0.4s_ease-in_forwards]" style={{ animationDelay: '0.7s' }}>
        <label className="block text-sm font-medium text-gray-400">
          Tag People
        </label>
        <Select
          isMulti
          options={familyMemberOptions}
          value={selectedUsers}
          onChange={(selected) => setSelectedUsers(selected as UserOption[])}
          className="mt-1 text-black poppins-light"
          classNamePrefix="select"
          placeholder="Tag family members in photo..."
          noOptionsMessage={() => "No family members found"}
          isLoading={familyMembers.length === 0}
          menuPortalTarget={document.body}
          // menuPosition="fixed"
          menuPlacement="bottom"
          styles={{
            placeholder: (base) => ({
              ...base,
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 300,
              color: '#9BA3AF',
            }),
            menu: (provided) => ({
              ...provided,
              zIndex: 9999,
            }),
            menuPortal: (provided) => ({
              ...provided,
              zIndex: 9999,
            }),
            control: (base: any, state: any) => ({
              ...base,
              borderWidth: '1.5px',
              borderColor: state.isFocused
                ? '#C8D5B9' // 🌿 focused border
                : state.menuIsOpen
                ? '#D2FF28' // open menu border
                : '', // default border
              boxShadow: state.isFocused ? '0 0 0 1px #5CAB68' : 'none',
              '&:hover': {
                borderColor: '#D2FF28', // hover border
              },
            }),
            option: (provided: any, state: any) => ({
              ...provided,
              backgroundColor: state.isFocused ? '#E8D4B8' : 'transparent',
              color: state.isFocused ? '#000' : '#000',
              '&:active': {
                backgroundColor: '#F4C47A',
                color: '#fff',
              },
            }),
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!selectedFile || isUploading}
        className={`w-full px-4 py-2 text-white rounded-md poppins-light opacity-0 animate-[fadeIn_0.4s_ease-in_forwards] flex items-center justify-center gap-2 ${
          isUploading || !selectedFile
            ? 'bg-tea-green cursor-not-allowed'
            : 'bg-plantain-green hover:bg-dark-spring-green'
        }`}
        style={{ animationDelay: '0.8s' }}
      >
        {isUploading ? (
          <>
            <LoadSpinner size={20} />
            <span>Uploading...</span>
          </>
        ) : (
          'Upload Photo'
        )}
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
