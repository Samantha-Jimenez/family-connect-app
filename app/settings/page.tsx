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
import LoadSpinner from '@/components/LoadSpinner';
import Select from 'react-select';

interface Pet {
  name: string;
  birthday: string;
  death_date?: string;
  image?: string;
}

interface UserData {
  first_name: string;
  last_name: string;
  middle_name: string;
  nick_name: string;
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
  show_zodiac?: boolean;
  social_media?: { platform: string; url: string }[];
  pets?: Pet[];
  use_first_name?: boolean;
  use_middle_name?: boolean;
  use_nick_name?: boolean;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const SOCIAL_MEDIA_PLATFORMS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'goodreads', label: 'GoodReads' },
  { value: 'strava', label: 'Strava' },
  { value: 'letterboxd', label: 'Letterboxd' },
  { value: 'other', label: 'Other' }
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
  const [removeProfilePhoto, setRemoveProfilePhoto] = useState(false);
  const [socialMediaEntries, setSocialMediaEntries] = useState<{ platform: string; url: string }[]>([]);
  const [newSocialMedia, setNewSocialMedia] = useState({ platform: '', url: '' });
  const [isSocialMediaOpen, setIsSocialMediaOpen] = useState(false);
  const [petsEntries, setPetsEntries] = useState<Pet[]>([]);
  const [newPet, setNewPet] = useState<Pet>({ name: '', birthday: '', death_date: '', image: undefined });
  const [newPetBirthday, setNewPetBirthday] = useState({ year: '', month: '', day: '' });
  const [newPetDeathDate, setNewPetDeathDate] = useState({ year: '', month: '', day: '' });
  const [isPetsOpen, setIsPetsOpen] = useState(false);
  const [petImageFiles, setPetImageFiles] = useState<Map<number, File>>(new Map());
  const [petImagePreviews, setPetImagePreviews] = useState<Map<number, string>>(new Map());
  const [uploadingPetIndex, setUploadingPetIndex] = useState<number | null>(null);
  const petFileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const [editingPetIndex, setEditingPetIndex] = useState<number | null>(null);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [editingPetBirthday, setEditingPetBirthday] = useState({ year: '', month: '', day: '' });
  const [editingPetDeathDate, setEditingPetDeathDate] = useState({ year: '', month: '', day: '' });
  const [removePetImage, setRemovePetImage] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchUserData = async () => {
      const data = await getUserData(user.userId);
      if (data) {
        setUserData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          middle_name: data.middle_name || '',
          nick_name: data.nick_name || '',
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
          show_zodiac: data.show_zodiac ?? false,
          social_media: data.social_media || [],
          pets: data.pets || [],
          use_first_name: data.use_first_name ?? true,
          use_middle_name: data.use_middle_name ?? false,
          use_nick_name: data.use_nick_name ?? false,
        });
        setSocialMediaEntries(data.social_media || []);
        setPetsEntries(data.pets || []);
      } else {
        setUserData({
          first_name: '',
          last_name: '',
          middle_name: '',
          nick_name: '',
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
          show_zodiac: false,
          social_media: [],
          pets: [],
          use_first_name: true,
          use_middle_name: false,
          use_nick_name: false,
        });
        setSocialMediaEntries([]);
        setPetsEntries([]);
      }
    };

    fetchUserData();
  }, [user, authEmail, authUsername]);

  // Auto-resize textarea when content changes
  useEffect(() => {
    const textarea = document.getElementById('floating_bio') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [userData?.bio]);

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
    if (userData?.profile_photo) {
      setRemoveProfilePhoto(true);
      setUserData(prev => prev ? { ...prev, profile_photo: undefined } : null);
    }
  };

  const handlePhotoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (removeProfilePhoto && !selectedImage) {
      // Only remove photo, no upload
      await saveUserToDB(
        userData?.first_name || '',
        userData?.last_name || '',
        userData?.middle_name || '',
        userData?.nick_name || '',
        userData?.email || '',
        userData?.username || '',
        userData?.bio || '',
        userData?.phone_number || '',
        userData?.birthday || '',
        userData?.birth_city || '',
        userData?.birth_state || '',
        '', // Remove profile photo
        userData?.current_city || '',
        userData?.current_state || '',
        userData?.show_zodiac ?? false,
        userData?.social_media || [],
        userData?.pets || [],
        userData?.use_first_name ?? true,
        userData?.use_middle_name ?? false,
        userData?.use_nick_name ?? false
      );
      setRemoveProfilePhoto(false);
      setUserData(prev => prev ? { ...prev, profile_photo: undefined } : null);
      showToast('Profile photo removed successfully!', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      return;
    }
    
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
          userData?.middle_name || '',
          userData?.nick_name || '',
          userData?.email || '',
          userData?.username || '',
          userData?.bio || '',
          userData?.phone_number || '',
          userData?.birthday || '',
          userData?.birth_city || '',
          userData?.birth_state || '',
          result.key,
          userData?.current_city || '',
          userData?.current_state || '',
          userData?.show_zodiac ?? false,
          userData?.social_media || [],
          userData?.pets || [],
          userData?.use_first_name ?? true,
          userData?.use_middle_name ?? false,
          userData?.use_nick_name ?? false
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

  const handleRemoveSocialMedia = (index: number) => {
    setSocialMediaEntries(prev => prev.filter((_, i) => i !== index));
  };

  const formatBirthdayString = (year: string, month: string, day: string): string => {
    if (!year) return '';
    if (month) {
      const monthPadded = month.padStart(2, '0');
      if (day) {
        const dayPadded = day.padStart(2, '0');
        return `${year}-${monthPadded}-${dayPadded}`;
      }
      return `${year}-${monthPadded}`;
    }
    return year; // Just the year
  };

  const parseBirthdayString = (birthday: string): { year: string; month: string; day: string } => {
    if (!birthday) return { year: '', month: '', day: '' };
    const parts = birthday.split('-');
    return {
      year: parts[0] || '',
      month: parts[1] || '',
      day: parts[2] || ''
    };
  };

  const formatBirthdayDisplay = (birthday: string): string => {
    if (!birthday) return '';
    const parsed = parseBirthdayString(birthday);
    if (!parsed.year) return '';
    
    // If only year is provided
    if (!parsed.month) {
      return parsed.year;
    }
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIndex = parseInt(parsed.month) - 1;
    const monthName = monthIndex >= 0 && monthIndex < 12 ? monthNames[monthIndex] : parsed.month;
    
    if (parsed.day) {
      return `${monthName} ${parsed.day}, ${parsed.year}`;
    }
    return `${monthName} ${parsed.year}`;
  };

  const handleEditPet = (index: number) => {
    const pet = petsEntries[index];
    setEditingPetIndex(index);
    setEditingPet({ ...pet });
    const parsedBirthday = parseBirthdayString(pet.birthday);
    setEditingPetBirthday({ year: parsedBirthday.year, month: parsedBirthday.month, day: parsedBirthday.day });
    const parsedDeathDate = parseBirthdayString(pet.death_date || '');
    setEditingPetDeathDate({ year: parsedDeathDate.year, month: parsedDeathDate.month, day: parsedDeathDate.day });
  };

  const handleCancelEditPet = () => {
    const indexToClean = editingPetIndex;
    setEditingPetIndex(null);
    setEditingPet(null);
    setEditingPetBirthday({ year: '', month: '', day: '' });
    setEditingPetDeathDate({ year: '', month: '', day: '' });
    // Clean up any image files/previews for the edited pet
    if (indexToClean !== null) {
      setPetImageFiles(prev => {
        const newMap = new Map(prev);
        newMap.delete(indexToClean);
        return newMap;
      });
      setPetImagePreviews(prev => {
        const newMap = new Map(prev);
        newMap.delete(indexToClean);
        return newMap;
      });
      // Remove from removePetImage set if it was marked for removal
      setRemovePetImage(prev => {
        const newSet = new Set(prev);
        newSet.delete(indexToClean);
        return newSet;
      });
    }
  };

  const handleRemovePet = (index: number) => {
    setPetsEntries(prev => prev.filter((_, i) => i !== index));
    // Clean up image files and previews
    setPetImageFiles(prev => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
    setPetImagePreviews(prev => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
    // If we're editing this pet, cancel edit mode
    if (editingPetIndex === index) {
      handleCancelEditPet();
    }
  };

  const handlePetImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPetImageFiles(prev => {
        const newMap = new Map(prev);
        newMap.set(index, file);
        return newMap;
      });
      setPetImagePreviews(prev => {
        const newMap = new Map(prev);
        newMap.set(index, URL.createObjectURL(file));
        return newMap;
      });
      // If user selects a new image, remove from removePetImage set
      setRemovePetImage(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  const handleClearPetImage = (index: number) => {
    // Clear the file input
    const fileInput = petFileInputRefs.current.get(index);
    if (fileInput) {
      fileInput.value = '';
    }
    
    // Remove from image files and previews
    setPetImageFiles(prev => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
    setPetImagePreviews(prev => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
    
    // Mark for removal if the pet has an existing image
    if (editingPetIndex === index && editingPet?.image) {
      setRemovePetImage(prev => new Set(prev).add(index));
      setEditingPet(prev => prev ? { ...prev, image: undefined } : null);
    } else if (petsEntries[index]?.image) {
      setRemovePetImage(prev => new Set(prev).add(index));
    }
  };

  const handleNewPetImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewPet(prev => ({ ...prev, image: URL.createObjectURL(file) }));
      // Store the file temporarily - we'll upload it when adding the pet
      const tempIndex = -1; // Use -1 for new pet
      setPetImageFiles(prev => {
        const newMap = new Map(prev);
        newMap.set(tempIndex, file);
        return newMap;
      });
    }
  };

  const uploadPetImage = async (file: File): Promise<string> => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append('file', file);

      const uploadWithProgress = new Promise<{ key: string }>((resolve, reject) => {
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

      setUploadProgress(100);
      setIsUploading(false);
      return result.key;
    } catch (error) {
      console.error('Error uploading pet image:', error);
      setIsUploading(false);
      setUploadProgress(0);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      let profilePhotoUrl = userData?.profile_photo;
      if (removeProfilePhoto) {
        profilePhotoUrl = '';
      }
      
      const formData = new FormData(e.currentTarget);
      const first_name = formData.get('floating_first_name') as string || userData?.first_name || '';
      const last_name = formData.get('floating_last_name') as string || userData?.last_name || '';
      const middle_name = formData.get('floating_middle_name') as string || userData?.middle_name || '';
      const nick_name = formData.get('floating_nick_name') as string || userData?.nick_name || '';
      const username = formData.get('floating_username') as string || userData?.username || '';
      const bio = formData.get('floating_bio') as string || userData?.bio || '';
      const phone_number = formData.get('floating_phone') as string || userData?.phone_number || '';
      const birthday = formData.get('floating_birthday') as string || userData?.birthday || '';
      const birth_city = formData.get('floating_birth_city') as string || userData?.birth_city || '';
      const birth_state = formData.get('floating_birth_state') as string || userData?.birth_state || '';
      const current_city = formData.get('floating_current_city') as string || userData?.current_city || '';
      const current_state = formData.get('floating_current_state') as string || userData?.current_state || '';
      const email = authEmail || '';
      const use_first_name = userData?.use_first_name ?? true;
      const use_middle_name = userData?.use_middle_name ?? false;
      const use_nick_name = userData?.use_nick_name ?? false;

      // Include new social media entry if both platform and URL are filled
      let finalSocialMediaEntries = [...socialMediaEntries];
      if (newSocialMedia.platform && newSocialMedia.url) {
        // Auto-add https:// if no protocol is provided
        let formattedUrl = newSocialMedia.url;
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
          formattedUrl = `https://${formattedUrl}`;
        }
        
        finalSocialMediaEntries.push({ ...newSocialMedia, url: formattedUrl });
      }

      // Handle pets - upload images for new pets and update existing ones
      let finalPetsEntries = [...petsEntries];
      
      // Handle new pet if name is filled (birthday and death date are optional)
      if (newPet.name) {
        let petImageKey = newPet.image;
        
        // Upload image if there's a new file
        const newPetFile = petImageFiles.get(-1);
        if (newPetFile) {
          try {
            petImageKey = await uploadPetImage(newPetFile);
            // Clean up the temp file reference
            setPetImageFiles(prev => {
              const newMap = new Map(prev);
              newMap.delete(-1);
              return newMap;
            });
          } catch (error) {
            console.error('Error uploading new pet image:', error);
            showToast('Failed to upload pet image. Please try again.', 'error');
            return;
          }
        }
        
        const birthdayString = formatBirthdayString(newPetBirthday.year, newPetBirthday.month, newPetBirthday.day);
        const deathDateString = formatBirthdayString(newPetDeathDate.year, newPetDeathDate.month, newPetDeathDate.day);
        
        finalPetsEntries.push({
          name: newPet.name,
          birthday: birthdayString || '',
          death_date: deathDateString || undefined,
          image: petImageKey || undefined
        });
      }

      // Handle edited pets - update the pet at editingPetIndex if it exists
      if (editingPetIndex !== null && editingPet) {
        let petImageKey = editingPet.image;
        
        // If image should be removed, set to empty string
        if (removePetImage.has(editingPetIndex)) {
          petImageKey = '';
        } else {
          // Upload image if there's a new file
          const editPetFile = petImageFiles.get(editingPetIndex);
          if (editPetFile) {
            try {
              petImageKey = await uploadPetImage(editPetFile);
              // Clean up the file reference
              setPetImageFiles(prev => {
                const newMap = new Map(prev);
                newMap.delete(editingPetIndex);
                return newMap;
              });
              setPetImagePreviews(prev => {
                const newMap = new Map(prev);
                newMap.delete(editingPetIndex);
                return newMap;
              });
            } catch (error) {
              console.error('Error uploading edited pet image:', error);
              showToast('Failed to upload pet image. Please try again.', 'error');
              return;
            }
          }
        }
        
        const birthdayString = formatBirthdayString(editingPetBirthday.year, editingPetBirthday.month, editingPetBirthday.day);
        const deathDateString = formatBirthdayString(editingPetDeathDate.year, editingPetDeathDate.month, editingPetDeathDate.day);
        
        // Update the pet in the array
        finalPetsEntries[editingPetIndex] = {
          name: editingPet.name,
          birthday: birthdayString || '',
          death_date: deathDateString || undefined,
          image: petImageKey || undefined
        };
      }

      // Handle image updates for existing pets (non-edited ones)
      const updatedPets = await Promise.all(
        finalPetsEntries.map(async (pet, index) => {
          // Skip if this is the pet being edited (already handled above)
          if (index === editingPetIndex) {
            return pet;
          }
          
          // If image should be removed, set to undefined
          if (removePetImage.has(index)) {
            return { ...pet, image: undefined };
          }
          
          const imageFile = petImageFiles.get(index);
          if (imageFile) {
            try {
              const imageKey = await uploadPetImage(imageFile);
              // Clean up the file reference
              setPetImageFiles(prev => {
                const newMap = new Map(prev);
                newMap.delete(index);
                return newMap;
              });
              setPetImagePreviews(prev => {
                const newMap = new Map(prev);
                newMap.delete(index);
                return newMap;
              });
              return { ...pet, image: imageKey };
            } catch (error) {
              console.error(`Error uploading image for pet ${index}:`, error);
              return pet; // Keep original pet if upload fails
            }
          }
          return pet;
        })
      );
      
      // Clear edit mode after saving
      setEditingPetIndex(null);
      setEditingPet(null);
      setEditingPetBirthday({ year: '', month: '', day: '' });
      setEditingPetDeathDate({ year: '', month: '', day: '' });
      setRemovePetImage(new Set());

      await saveUserToDB(
        first_name, 
        last_name, 
        middle_name,
        nick_name,
        email, 
        username, 
        bio, 
        phone_number, 
        birthday,
        birth_city,
        birth_state,
        profilePhotoUrl,
        current_city,
        current_state,
        userData?.show_zodiac ?? false,
        finalSocialMediaEntries,
        updatedPets,
        use_first_name,
        use_middle_name,
        use_nick_name
      );

      // Update local state
      setUserData(prev => prev ? {
        ...prev,
        first_name,
        last_name,
        middle_name,
        nick_name,
        email,
        username,
        bio,
        phone_number,
        birthday,
        birth_city,
        birth_state,
        profile_photo: profilePhotoUrl,
        current_city,
        current_state,
        show_zodiac: prev.show_zodiac ?? false,
        social_media: finalSocialMediaEntries,
        pets: updatedPets,
        use_first_name,
        use_middle_name,
        use_nick_name
      } : null);

      // Update social media entries and clear the new entry form
      setSocialMediaEntries(finalSocialMediaEntries);
      setNewSocialMedia({ platform: '', url: '' });
      
      // Update pets entries and clear the new pet form
      setPetsEntries(updatedPets);
      setNewPet({ name: '', birthday: '', death_date: '', image: undefined });
      setNewPetBirthday({ year: '', month: '', day: '' });
      setNewPetDeathDate({ year: '', month: '', day: '' });
      // Clear the new pet image file reference
      setPetImageFiles(prev => {
        const newMap = new Map(prev);
        newMap.delete(-1);
        return newMap;
      });

      // Refresh the user data in context
      await refreshUserData();

      setRemoveProfilePhoto(false);

      showToast('Profile updated successfully!', 'success' as const);
      
    } catch (error) {
      console.error('Error saving changes:', error);
      showToast('Failed to update profile. Please try again.', 'error' as const);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen px-4 pb-6">
        <form onSubmit={handlePhotoSubmit} className="card bg-white shadow-xl p-6 mx-auto mt-6 max-w-7xl">
          <div className="flex md:flex-row flex-col items-center gap-4 self-center">
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
            <div className="flex md:flex-row flex-col items-center gap-2">
              <input
                ref={fileInputRef}
                data-theme="light"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="file-input file-input-bordered file-input-sm w-[308px] text-base"
                disabled={isUploading}
              />
              
              <div className="flex items-center gap-2">
                <div className="">
                  {selectedImage && (
                    <button 
                    type="submit"
                    className="btn btn-sm text-white bg-plantain-green hover:bg-plantain-green/90 focus:ring-4 focus:outline-none font-medium rounded-lg text-center whitespace-nowrap border-none"
                    disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <LoadSpinner size={16} />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        'Upload Photo'
                      )}
                    </button>
                  )}
                </div>
                <div className="">
                  {(selectedImage || imagePreview || (userData?.profile_photo && !removeProfilePhoto)) && (
                    <button
                      type="button"
                      className="btn btn-sm bg-engineering-orange hover:bg-engineering-orange/90 border-none text-white"
                      onClick={handleClearImage}
                      disabled={isUploading}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
          
          {isUploading && (
            <div className="w-full mt-4 max-w-[500px] mx-auto">
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
          <div className="grid md:grid-cols-[1fr_1fr_max-content] md:gap-6">
            <div className="relative z-0 w-full mb-5 group">
              <input type="text" value={userData?.middle_name || ''} name="floating_middle_name" id="floating_middle_name" onChange={handleInputChange} className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " />
              <label htmlFor="floating_middle_name" className="peer-focus:font-medium absolute text-sm text-gray-400 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Middle name</label>
            </div>
            <div className="relative z-0 w-full mb-5 group">
              <input type="text" value={userData?.nick_name || ''} name="floating_nick_name" id="floating_nick_name" onChange={handleInputChange} className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " />
              <label htmlFor="floating_nick_name" className="peer-focus:font-medium absolute text-sm text-gray-400 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Nick name</label>
            </div>


          
          
             {/* Name Display Preferences */}
             <div className="mb-6">
               <h3 className="text-lg font-medium text-gray-900 mb-4">Primary Name Display</h3>
               <div className="grid md:grid-cols-3 gap-4">
                 <div className="flex items-center">
                   <input
                     type="radio"
                     id="use_first_name"
                     name="primary_name"
                     value="first_name"
                     checked={userData?.use_first_name ?? true}
                     onChange={(e) => {
                       if (userData) {
                         setUserData({
                           ...userData,
                           use_first_name: true,
                           use_middle_name: false,
                           use_nick_name: false
                         });
                       }
                     }}
                     className="radio radio-success w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-lime focus:ring-2"
                   />
                   <label htmlFor="use_first_name" className="ml-2 text-sm text-gray-900">
                     Use first name
                   </label>
                 </div>
                 <div className="flex items-center">
                   <input
                     type="radio"
                     id="use_middle_name"
                     name="primary_name"
                     value="middle_name"
                     checked={userData?.use_middle_name ?? false}
                     disabled={!userData?.middle_name || userData.middle_name.trim() === ''}
                     onChange={(e) => {
                       if (userData) {
                         setUserData({
                           ...userData,
                           use_first_name: false,
                           use_middle_name: true,
                           use_nick_name: false
                         });
                       }
                     }}
                     className="radio radio-success w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-lime focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                   />
                   <label htmlFor="use_middle_name" className={`ml-2 text-sm text-gray-900 ${!userData?.middle_name || userData.middle_name.trim() === '' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                     Use middle name
                   </label>
                 </div>
                 
                 <div className="flex items-center">
                   <input
                     type="radio"
                     id="use_nick_name"
                     name="primary_name"
                     value="nick_name"
                     checked={userData?.use_nick_name ?? false}
                     disabled={!userData?.nick_name || userData.nick_name.trim() === ''}
                     onChange={(e) => {
                       if (userData) {
                         setUserData({
                           ...userData,
                           use_first_name: false,
                           use_middle_name: false,
                           use_nick_name: true
                         });
                       }
                     }}
                     className="radio radio-success w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-lime focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                   />
                   <label htmlFor="use_nick_name" className={`ml-2 text-sm text-gray-900 ${!userData?.nick_name || userData.nick_name.trim() === '' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                     Use nick name
                   </label>
                 </div>
               </div>
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
          <div className="grid md:grid-cols-[1fr_min-content_1fr] md:gap-6">
            <div className="relative z-0 w-full mb-5 group">
              <div className="flex items-center">
              <input 
                type="date" 
                value={userData?.birthday || ''} 
                name="floating_birthday" 
                id="floating_birthday" 
                onChange={handleInputChange} 
                className="block py-2.5 px-0 w-full text-sm bg-transparent border-0 border-b-2 border-gray-300 appearance-none text-black dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" 
              />
              {userData?.birthday && (
                  <button
                    type="button"
                    className="ml-2 px-2 py-1 bg-gray-200 rounded text-xs"
                    onClick={() => handleInputChange({
                      target: {
                        name: "floating_birthday",
                        value: ""
                      }
                    } as any)}
                    aria-label="Clear birthday (MM/DD/YYYY)"
                  >
                    Clear
                  </button>
                )}
              </div>
              {/* </div> */}
              <label 
                htmlFor="floating_birthday" 
                className="peer-focus:font-medium absolute text-sm text-gray-400 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
              >
                Birthday (MM/DD/YYYY)
              </label>
            </div>
            <div className="relative z-0 w-full mb-3 group">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_zodiac"
                name="show_zodiac"
                checked={userData?.show_zodiac ?? false}
                onChange={(e) => {
                  if (userData) {
                    setUserData({
                      ...userData,
                      show_zodiac: e.target.checked
                    });
                  }
                }}
                className="checkbox checkbox-success w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-lime focus:ring-2"
              />
              <label htmlFor="show_zodiac" className="ml-2 text-sm text-gray-900 md:w-[7rem] w-[13rem]">
                Show zodiac sign on profile
              </label>
            </div>
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
              onChange={(e) => {
                handleInputChange(e);
                // Auto-resize textarea
                const textarea = e.target;
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
              }}
              className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer resize-none overflow-hidden"
              placeholder=" "
              rows={2}
              style={{ minHeight: '2.5rem' }}
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
          
          {/* Social Media Section */}
          <div className="border border-gray-200 rounded-lg mb-5">
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setIsSocialMediaOpen(!isSocialMediaOpen)}
              className="w-full px-2 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
            >
              <h3 className="text-md font-medium text-gray-900">Social Media Links</h3>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                  isSocialMediaOpen ? 'transform rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Accordion Content */}
            {isSocialMediaOpen && (
              <div className="p-4 border-t border-gray-200">
                <div className="bg-gray-50 rounded-lg mb-4">
                  {/* Existing Social Media Entries */}
                  {socialMediaEntries.length > 0 ? (
                    socialMediaEntries.map((entry, index) => (
                      <div key={index} className="flex items-center gap-4 mb-2 p-2 rounded-lg hover:bg-gray-200">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {SOCIAL_MEDIA_PLATFORMS.find(p => p.value === entry.platform)?.label || entry.platform}
                          </span>
                          <p className="text-sm text-gray-600 break-all">{entry.url}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSocialMedia(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium group"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 py-2">No social media links added yet.</p>
                  )}
                </div>
                
                {/* Add New Social Media */}
                <div className="">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Add Social Media</h4>
                  <div className="grid md:grid-cols-2 gap-4 mb-5">
                    <div className="relative z-0 w-full group self-end">
                      <Select
                        value={SOCIAL_MEDIA_PLATFORMS.find(option => option.value === newSocialMedia.platform) || null}
                        onChange={(selectedOption) => 
                          setNewSocialMedia(prev => ({ ...prev, platform: selectedOption?.value || '' }))
                        }
                        options={SOCIAL_MEDIA_PLATFORMS}
                        placeholder="Select platform"
                        className="text-sm"
                        menuPlacement="top"
                        styles={{
                          control: (provided) => ({
                            ...provided,
                            borderBottom: '2px solid #d1d5db',
                            borderTop: 'none',
                            borderLeft: 'none',
                            borderRight: 'none',
                            borderRadius: '0',
                            boxShadow: 'none',
                            '&:hover': {
                              borderBottom: '2px solid #3b82f6',
                            },
                            '&:focus': {
                              borderBottom: '2px solid #3b82f6',
                            },
                          }),
                          placeholder: (provided) => ({
                            ...provided,
                            color: '#9ca3af',
                            fontSize: '14px',
                          }),
                        }}
                      />
                      <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-2 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                        Platform
                      </label>
                    </div>
                    <div className="relative z-0 w-full group">
                      <input
                        type="text"
                        value={newSocialMedia.url}
                        onChange={(e) => setNewSocialMedia(prev => ({ ...prev, url: e.target.value }))}
                        className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                        placeholder=" "
                      />
                      <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                        URL
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Pets Section */}
          <div className="border border-gray-200 rounded-lg mb-5">
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setIsPetsOpen(!isPetsOpen)}
              className="w-full px-2 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
            >
              <h3 className="text-md font-medium text-gray-900">Pets</h3>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                  isPetsOpen ? 'transform rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Accordion Content */}
            {isPetsOpen && (
              <div className="p-4 border-t border-gray-200">
                <div className="bg-gray-50 rounded-lg mb-4">
                  {/* Existing Pet Entries */}
                  {petsEntries.length > 0 ? (
                    petsEntries.map((pet, index) => (
                      <div key={index} className="mb-4 p-3 rounded-lg hover:bg-gray-200 border border-gray-300">
                        {editingPetIndex === index ? (
                          /* Edit Mode */
                          <div className="space-y-4">
                            <div className="flex items-start gap-4">
                              {/* Pet Image */}
                              <div className="flex-shrink-0">
                                {petImagePreviews.get(index) ? (
                                  <div className="w-20 h-20 rounded-lg overflow-hidden">
                                    <Image 
                                      src={petImagePreviews.get(index)!}
                                      alt={editingPet?.name || 'Pet'}
                                      width={80}
                                      height={80}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : editingPet?.image && !removePetImage.has(index) ? (
                                  <div className="w-20 h-20 rounded-lg overflow-hidden">
                                    <Image 
                                      src={getFullImageUrl(editingPet.image)}
                                      alt={editingPet.name}
                                      width={80}
                                      height={80}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center">
                                    <span className="icon-[mdi--paw] text-3xl text-gray-400" />
                                  </div>
                                )}
                                <input
                                  ref={(el) => {
                                    if (el) {
                                      petFileInputRefs.current.set(index, el);
                                    }
                                  }}
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handlePetImageChange(index, e)}
                                  className="mt-2 file-input file-input-bordered file-input-xs w-full text-xs"
                                  disabled={isUploading}
                                />
                                {(petImagePreviews.get(index) || (editingPet?.image && !removePetImage.has(index))) && (
                                  <button
                                    type="button"
                                    className="btn btn-xs bg-engineering-orange hover:bg-engineering-orange/90 border-none text-white mt-2 w-full"
                                    onClick={() => handleClearPetImage(index)}
                                    disabled={isUploading}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                              
                              {/* Editable Pet Info */}
                              <div className="flex-1 space-y-3">
                                <div className="relative z-0 w-full group">
                                  <input
                                    type="text"
                                    value={editingPet?.name || ''}
                                    onChange={(e) => setEditingPet(prev => prev ? { ...prev, name: e.target.value } : null)}
                                    className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                    placeholder=" "
                                  />
                                  <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                                    Pet Name
                                  </label>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="relative z-0 w-full group">
                                    <input
                                      type="number"
                                      value={editingPetBirthday.year}
                                      onChange={(e) => setEditingPetBirthday(prev => ({ ...prev, year: e.target.value }))}
                                      className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                      placeholder=" "
                                      min="1900"
                                      max="2100"
                                    />
                                    <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                                      Birth Year
                                    </label>
                                  </div>
                                  <div className="relative z-0 w-full group">
                                    <select
                                      value={editingPetBirthday.month}
                                      onChange={(e) => setEditingPetBirthday(prev => ({ ...prev, month: e.target.value }))}
                                      className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                    >
                                      <option value="">Birth Month</option>
                                      <option value="01">January</option>
                                      <option value="02">February</option>
                                      <option value="03">March</option>
                                      <option value="04">April</option>
                                      <option value="05">May</option>
                                      <option value="06">June</option>
                                      <option value="07">July</option>
                                      <option value="08">August</option>
                                      <option value="09">September</option>
                                      <option value="10">October</option>
                                      <option value="11">November</option>
                                      <option value="12">December</option>
                                    </select>
                                    <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                                      Birth Month
                                    </label>
                                  </div>
                                  <div className="relative z-0 w-full group">
                                    <input
                                      type="number"
                                      value={editingPetBirthday.day}
                                      onChange={(e) => setEditingPetBirthday(prev => ({ ...prev, day: e.target.value }))}
                                      className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                      placeholder=" "
                                      min="1"
                                      max="31"
                                    />
                                    <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                                      Birth Day (Optional)
                                    </label>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="relative z-0 w-full group">
                                    <input
                                      type="number"
                                      value={editingPetDeathDate.year}
                                      onChange={(e) => setEditingPetDeathDate(prev => ({ ...prev, year: e.target.value }))}
                                      className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                      placeholder=" "
                                      min="1900"
                                      max="2100"
                                    />
                                    <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                                      Death Year
                                    </label>
                                  </div>
                                  <div className="relative z-0 w-full group">
                                    <select
                                      value={editingPetDeathDate.month}
                                      onChange={(e) => setEditingPetDeathDate(prev => ({ ...prev, month: e.target.value }))}
                                      className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                    >
                                      <option value="">Death Month</option>
                                      <option value="01">January</option>
                                      <option value="02">February</option>
                                      <option value="03">March</option>
                                      <option value="04">April</option>
                                      <option value="05">May</option>
                                      <option value="06">June</option>
                                      <option value="07">July</option>
                                      <option value="08">August</option>
                                      <option value="09">September</option>
                                      <option value="10">October</option>
                                      <option value="11">November</option>
                                      <option value="12">December</option>
                                    </select>
                                    <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                                      Death Month
                                    </label>
                                  </div>
                                  <div className="relative z-0 w-full group">
                                    <input
                                      type="number"
                                      value={editingPetDeathDate.day}
                                      onChange={(e) => setEditingPetDeathDate(prev => ({ ...prev, day: e.target.value }))}
                                      className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                      placeholder=" "
                                      min="1"
                                      max="31"
                                    />
                                    <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                                      Death Day (Optional)
                                    </label>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Edit Action Buttons */}
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={handleCancelEditPet}
                                className="px-3 py-1.5 text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-3 py-1.5 text-sm text-white bg-plantain-green hover:bg-dark-spring-green rounded-lg"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Display Mode */
                          <div className="flex items-start gap-4">
                            {/* Pet Image */}
                            <div className="flex-shrink-0">
                              {petImagePreviews.get(index) ? (
                                <div className="w-20 h-20 rounded-lg overflow-hidden">
                                  <Image 
                                    src={petImagePreviews.get(index)!}
                                    alt={pet.name}
                                    width={80}
                                    height={80}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : pet.image ? (
                                <div className="w-20 h-20 rounded-lg overflow-hidden">
                                  <Image 
                                    src={getFullImageUrl(pet.image)}
                                    alt={pet.name}
                                    width={80}
                                    height={80}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center">
                                  <span className="icon-[mdi--paw] text-3xl text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            {/* Pet Info */}
                            <div className="flex-1">
                              <div className="mb-2">
                                <span className="text-sm font-medium text-gray-700">{pet.name}</span>
                              </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <p>Birthday: {formatBirthdayDisplay(pet.birthday)}</p>
                              {pet.death_date && <p>Death Date: {formatBirthdayDisplay(pet.death_date)}</p>}
                            </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditPet(index)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemovePet(index)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 py-2">No pets added yet.</p>
                  )}
                </div>
                
                {/* Add New Pet */}
                <div className="">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Add Pet</h4>
                  <div className="space-y-4">
                    <div className="relative z-0 w-full group">
                      <input
                        type="text"
                        value={newPet.name}
                        onChange={(e) => setNewPet(prev => ({ ...prev, name: e.target.value }))}
                        className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                        placeholder=" "
                      />
                      <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                        Pet Name
                      </label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="relative z-0 w-full group">
                          <input
                            type="number"
                            value={newPetBirthday.year}
                            onChange={(e) => setNewPetBirthday(prev => ({ ...prev, year: e.target.value }))}
                            className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                            placeholder=" "
                            min="1900"
                            max="2100"
                          />
                          <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                            Birth Year
                          </label>
                        </div>
                        <div className="relative z-0 w-full group">
                          <select
                            value={newPetBirthday.month}
                            onChange={(e) => setNewPetBirthday(prev => ({ ...prev, month: e.target.value }))}
                            className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                          >
                            <option value="">Birth Month</option>
                            <option value="01">January</option>
                            <option value="02">February</option>
                            <option value="03">March</option>
                            <option value="04">April</option>
                            <option value="05">May</option>
                            <option value="06">June</option>
                            <option value="07">July</option>
                            <option value="08">August</option>
                            <option value="09">September</option>
                            <option value="10">October</option>
                            <option value="11">November</option>
                            <option value="12">December</option>
                          </select>
                          <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                            Birth Month
                          </label>
                        </div>
                        <div className="relative z-0 w-full group">
                          <input
                            type="number"
                            value={newPetBirthday.day}
                            onChange={(e) => setNewPetBirthday(prev => ({ ...prev, day: e.target.value }))}
                            className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                            placeholder=" "
                            min="1"
                            max="31"
                          />
                          <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                            Birth Day (Optional)
                          </label>
                        </div>
                      </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="relative z-0 w-full group">
                        <input
                          type="number"
                          value={newPetDeathDate.year}
                          onChange={(e) => setNewPetDeathDate(prev => ({ ...prev, year: e.target.value }))}
                          className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                          placeholder=" "
                          min="1900"
                          max="2100"
                        />
                        <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                          Death Year
                        </label>
                      </div>
                      <div className="relative z-0 w-full group">
                        <select
                          value={newPetDeathDate.month}
                          onChange={(e) => setNewPetDeathDate(prev => ({ ...prev, month: e.target.value }))}
                          className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                        >
                          <option value="">Death Month</option>
                          <option value="01">January</option>
                          <option value="02">February</option>
                          <option value="03">March</option>
                          <option value="04">April</option>
                          <option value="05">May</option>
                          <option value="06">June</option>
                          <option value="07">July</option>
                          <option value="08">August</option>
                          <option value="09">September</option>
                          <option value="10">October</option>
                          <option value="11">November</option>
                          <option value="12">December</option>
                        </select>
                        <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                          Death Month
                        </label>
                      </div>
                      <div className="relative z-0 w-full group">
                        <input
                          type="number"
                          value={newPetDeathDate.day}
                          onChange={(e) => setNewPetDeathDate(prev => ({ ...prev, day: e.target.value }))}
                          className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                          placeholder=" "
                          min="1"
                          max="31"
                        />
                        <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                          Death Day (Optional)
                        </label>
                      </div>
                    </div>
                    {/* <div className="text-xs text-gray-500 mt-1">Pet Image (Optional)</div> */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="relative z-0 w-full group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleNewPetImageChange}
                          className="file-input file-input-bordered file-input-sm w-full text-base"
                          disabled={isUploading}
                        />
                        {newPet.image && (
                          <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden">
                            <Image 
                              src={newPet.image}
                              alt="Pet preview"
                              width={80}
                              height={80}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              type="submit"
              className="text-white bg-plantain-green hover:bg-dark-spring-green focus:ring-4 focus:outline-none font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
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