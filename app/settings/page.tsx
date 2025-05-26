"use client"
import React, { useState, useEffect, useRef } from 'react';
import { saveUserToDB, getUserData } from '@/hooks/dynamoDB';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchUserAttributes } from '@aws-amplify/auth';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getFullImageUrl } from '@/utils/imageUtils';
import { useToast } from '@/context/ToastContext';
import { useUser } from '@/context/UserContext';

interface UserData {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  bio: string;
  phone_number: string;
  birthday: string;
  birth_city: string;
  birth_state: string;
  profile_photo?: string;
  current_city?: string;
  current_state?: string;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const Settings = () => {
  const { authStatus } = useAuth();
  const { user } = useAuthenticator((context) => [context.user]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const router = useRouter();
  const { showToast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const { refreshUserData } = useUser();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const data = await getUserData(user.userId);
      if (data) {
        setUserData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: authEmail || '',
          username: authUsername || '',
          bio: data.bio || '',
          phone_number: data.phone_number || '',
          birthday: data.birthday || '',
          birth_city: data.birth_city || '',
          birth_state: data.birth_state || '',
          profile_photo: data.profile_photo || undefined,
          current_city: data.current_city || undefined,
          current_state: data.current_state || undefined,
        });
      } else {
        setUserData({
          first_name: '',
          last_name: '',
          email: authEmail || '',
          username: authUsername || '',
          bio: '',
          phone_number: '',
          birthday: '',
          birth_city: '',
          birth_state: '',
          profile_photo: undefined,
          current_city: undefined,
          current_state: undefined,
        });
      }
    };

    fetchUserData();
  }, [user, authEmail, authUsername]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userInfo = await fetchUserAttributes();
        const email = userInfo?.email;
        setAuthEmail(email || '');
        setAuthUsername(user.username || '');
      } catch (error) {
        console.error('Error fetching user attributes:', error);
      }
    };

    fetchUserData();
  }, [user]);

  if (authStatus !== 'authenticated') {
    return null;
  }

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format the number as user types
    let formattedNumber = '';
    if (phoneNumber.length === 0) {
      formattedNumber = '';
    } else if (phoneNumber.length <= 3) {
      formattedNumber = `(${phoneNumber}`;
    } else if (phoneNumber.length <= 6) {
      formattedNumber = `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      formattedNumber = `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
    
    return formattedNumber;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (userData) {
      const fieldName = e.target.name.replace('floating_', ''); // Remove 'floating_' prefix

      // Check if the field is part of a nested object
      if (fieldName.includes('.')) {
        const [parentField, childField] = fieldName.split('.');
        const parentData = userData[parentField as keyof UserData];

        // Ensure parentData is an object before spreading
        if (typeof parentData === 'object' && parentData !== null) {
          const updatedData = {
            ...userData,
            [parentField]: {
              ...(typeof parentData === 'object' && parentData !== null ? parentData : {}),
              [childField]: e.target.value,
            },
          };
          setUserData(updatedData);
        }
      } else {
        // Special handling for phone number formatting
        if (fieldName === 'phone') {
          const formattedNumber = formatPhoneNumber(e.target.value);
          setUserData({
            ...userData,
            phone_number: formattedNumber,
          });
          return;
        }

        setUserData({
          ...userData,
          [fieldName]: e.target.value,
        });
      }
    }
    if (e.target.name === 'floating_email') {
      setAuthEmail(e.target.value);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePhotoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (selectedImage) {
      try {
        setIsUploading(true);
        setUploadProgress(0);
        
        const formData = new FormData();
        formData.append('file', selectedImage);

        // Create a promise that wraps XMLHttpRequest to handle upload progress
        const uploadWithProgress = new Promise<{ key: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              // Limit progress to 90% during upload, reserving the last 10% for processing
              const progress = (event.loaded / event.total) * 90;
              setUploadProgress(Math.round(progress));
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (error) {
                reject(new Error('Invalid response format'));
              }
            } else {
              reject(new Error(`Upload failed with status: ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Upload failed'));
          });

          xhr.open('POST', '/api/upload');
          xhr.send(formData);
        });

        const result = await uploadWithProgress;
        
        if (!result.key) {
          throw new Error('Upload response missing key');
        }

        // Set to 95% while saving to DynamoDB
        setUploadProgress(95);
        
        // Save to DynamoDB
        await saveUserToDB(
          userData?.first_name || '',
          userData?.last_name || '',
          userData?.email || '',
          userData?.username || '',
          userData?.bio || '',
          userData?.phone_number || '',
          userData?.birthday || '',
          userData?.birth_city || '',
          userData?.birth_state || '',
          result.key,
          userData?.current_city || '',
          userData?.current_state || ''
        );

        // Complete the progress
        setUploadProgress(100);

        // Update local state with the new photo URL
        const newPhotoUrl = getFullImageUrl(result.key);
        setUserData(prev => prev ? {
          ...prev,
          profile_photo: result.key
        } : null);

        // Clear the selected image state
        setSelectedImage(null);
        setImagePreview(null);
        
        showToast('Profile photo updated successfully!', 'success');
        
        // Reset upload state after a short delay
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
          window.location.reload();
        }, 1000); // Reduced delay to 1 second
        
      } catch (error) {
        console.error('Error uploading image:', error);
        showToast('Failed to update profile photo. Please try again.', 'error');
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      let profilePhotoUrl = userData?.profile_photo;
      
      const formData = new FormData(e.currentTarget);
      const first_name = formData.get('floating_first_name') as string || userData?.first_name || '';
      const last_name = formData.get('floating_last_name') as string || userData?.last_name || '';
      const username = formData.get('floating_username') as string || userData?.username || '';
      const bio = formData.get('floating_bio') as string || userData?.bio || '';
      const phone_number = formData.get('floating_phone') as string || userData?.phone_number || '';
      const birthday = formData.get('floating_birthday') as string || userData?.birthday || '';
      const birth_city = formData.get('floating_birth_city') as string || userData?.birth_city || '';
      const birth_state = formData.get('floating_birth_state') as string || userData?.birth_state || '';
      const current_city = formData.get('floating_current_city') as string || userData?.current_city || '';
      const current_state = formData.get('floating_current_state') as string || userData?.current_state || '';
      const email = authEmail || '';

      await saveUserToDB(
        first_name, 
        last_name, 
        email, 
        username, 
        bio, 
        phone_number, 
        birthday,
        birth_city,
        birth_state,
        profilePhotoUrl,
        current_city,
        current_state
      );

      // Update local state
      setUserData(prev => prev ? {
        ...prev,
        first_name,
        last_name,
        email,
        username,
        bio,
        phone_number,
        birthday,
        birth_city,
        birth_state,
        profile_photo: profilePhotoUrl,
        current_city,
        current_state
      } : null);

      // Refresh the user data in context
      await refreshUserData();

      showToast('Profile updated successfully!', 'success' as const);
      
    } catch (error) {
      console.error('Error saving changes:', error);
      showToast('Failed to update profile. Please try again.', 'error' as const);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen px-4">
        <form onSubmit={handlePhotoSubmit} className="card bg-white shadow-xl p-6 mx-auto mt-6 max-w-7xl">
          <div className="flex flex-col items-center gap-4">
            <div className="avatar">
              <div className="w-24 h-24 rounded-full">
                {imagePreview ? (
                  <Image 
                    src={imagePreview}
                    alt="Profile preview" 
                    width={96}
                    height={96}
                    className="rounded-full object-cover"
                  />
                ) : userData?.profile_photo ? (
                  <Image 
                    src={getFullImageUrl(userData.profile_photo)}
                    alt="Current profile" 
                    width={96}
                    height={96}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="icon-[mdi--account] text-4xl text-gray-400" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 w-full max-w-xs">
              <input
                ref={fileInputRef}
                data-theme="light"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="file-input file-input-bordered w-full"
                disabled={isUploading}
              />
              
              {(selectedImage || imagePreview) && (
                <button
                  type="button"
                  className="btn btn-ghost text-xs mt-2"
                  onClick={handleClearImage}
                  disabled={isUploading}
                >
                  Clear
                </button>
              )}
              
              {isUploading && (
                <div className="w-full">
                  <progress 
                    className="progress progress-success w-full" 
                    value={uploadProgress} 
                    max="100"
                  ></progress>
                  <p className="text-center text-sm text-gray-600 mt-1">
                    {uploadProgress}%
                  </p>
                </div>
              )}
              
              {selectedImage && (
                <button 
                  type="submit"
                  className="btn bg-[#914F2F] hover:bg-[#914F2F]/90 text-white w-full"
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload Photo'}
                </button>
              )}
            </div>
          </div>
        </form>
        <form onSubmit={handleSubmit} className="card bg-white shadow-xl p-6 mx-auto mt-6 max-w-7xl">
          <div className="grid md:grid-cols-2 md:gap-6">
            <div className="relative z-0 w-full mb-5 group">
              <input type="text" value={userData?.first_name || ''} name="floating_first_name" id="floating_first_name" onChange={handleInputChange} className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " required />
              <label htmlFor="floating_first_name" className="peer-focus:font-medium absolute text-sm text-gray-400 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">First name</label>
            </div>
            <div className="relative z-0 w-full mb-5 group">
              <input type="text" value={userData?.last_name || ''} name="floating_last_name" id="floating_last_name" onChange={handleInputChange} className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " required />
              <label htmlFor="floating_last_name" className="peer-focus:font-medium absolute text-sm text-gray-400 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Last name</label>
            </div>
          </div>
          <div className="grid md:grid-cols-2 md:gap-6">
            <div className="relative z-0 w-full mb-5 group">
              <input
                type="text"
                value={userData?.birth_city || ''}
                name="floating_birth_city"
                id="floating_birth_city"
                onChange={handleInputChange}
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                placeholder=" "
              />
              <label htmlFor="floating_birth_city" className="peer-focus:font-medium absolute text-sm text-gray-400 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Birth City/Town</label>
            </div>
            <div className="relative z-0 w-full mb-5 group">
              <select
                value={userData?.birth_state || ''}
                name="floating_birth_state"
                id="floating_birth_state"
                onChange={handleInputChange}
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
              >
                <option value="">Select Birth State</option>
                {US_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              <label htmlFor="floating_birth_state" className="peer-focus:font-medium absolute text-sm text-gray-400 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Birth State</label>
            </div>
          </div>
          <div className="relative z-0 w-full mb-5 group">
            <input 
              type="text" 
              value={authUsername || ''} 
              name="floating_username" 
              id="floating_username" 
              onChange={(e) => setAuthUsername(e.target.value)}
              className="block py-2.5 px-0 w-full text-sm bg-transparent border-0 border-b-2 border-gray-300 appearance-none text-black dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" 
              placeholder=" " 
              required 
            />
            <label htmlFor="floating_username" className="peer-focus:font-medium absolute text-sm text-gray-400 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Username</label>
          </div>
          <div className="relative z-0 w-full mb-5 group">
            <input type="email" value={authEmail || ''} name="floating_email" id="floating_email" onChange={handleInputChange} className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " required />
            <label htmlFor="floating_email" className="peer-focus:font-medium absolute text-sm text-gray-400 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Email address</label>
          </div>
          <div className="grid md:grid-cols-2 md:gap-6">
            <div className="relative z-0 w-full mb-5 group">
              <input 
                type="date" 
                value={userData?.birthday || ''} 
                name="floating_birthday" 
                id="floating_birthday" 
                onChange={handleInputChange} 
                className="block py-2.5 px-0 w-full text-sm bg-transparent border-0 border-b-2 border-gray-300 appearance-none text-black dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" 
              />
              <label 
                htmlFor="floating_birthday" 
                className="peer-focus:font-medium absolute text-sm text-gray-400 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
              >
                Birthday (MM/DD/YYYY)
              </label>
            </div>
            <div className="relative z-0 w-full mb-5 group">
              <input
                type="tel"
                value={userData?.phone_number || ''}
                name="floating_phone"
                onChange={handleInputChange}
                id="floating_phone"
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                placeholder=" "
                maxLength={14}
              />
              <label htmlFor="floating_phone" className="peer-focus:font-medium absolute text-sm text-gray-400 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Phone number</label>
            </div>
          </div>
          <div className="relative z-0 w-full mb-5 group">
            <textarea
              value={userData?.bio || ''}
              name="floating_bio"
              id="floating_bio"
              onChange={handleInputChange}
              className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer resize-y"
              placeholder=" "
              rows={1}
            />
            <label htmlFor="floating_bio" className="peer-focus:font-medium absolute text-sm text-gray-400 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Bio</label>
          </div>
          <div className="grid md:grid-cols-2 md:gap-6">
            <div className="relative z-0 w-full mb-5 group">
              <input
                type="text"
                value={userData?.current_city || ''}
                name="floating_current_city"
                id="floating_current_city"
                onChange={handleInputChange}
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                placeholder=" "
              />
              <label htmlFor="floating_current_city" className="peer-focus:font-medium absolute text-sm text-gray-400 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Current City/Town</label>
            </div>
            <div className="relative z-0 w-full mb-5 group">
              <select
                value={userData?.current_state || ''}
                name="floating_current_state"
                id="floating_current_state"
                onChange={handleInputChange}
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
              >
                <option value="">Select Current State</option>
                {US_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              <label htmlFor="floating_current_state" className="peer-focus:font-medium absolute text-sm text-gray-400 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">State</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="text-white bg-[#914F2F] hover:bg-[#914F2F]/90 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </AuthGuard>
  );
}

export default Settings;