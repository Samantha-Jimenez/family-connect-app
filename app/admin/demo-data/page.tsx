"use client";
import React, { useEffect, useState, useRef, ChangeEvent } from 'react';
import { useAuthenticator } from "@aws-amplify/ui-react";
import { getAllFamilyMembers, adminSavePhotoAsDemoMember, addCommentToPhoto, getProfilePhotoById, PhotoData, FamilyMember, adminUpdateMemberHobbies, getAllHobbies, addCommentToHobby, getCommentsForHobby, getUserData, adminUpdateMemberSocialMedia, adminUpdateMemberPets, adminUpdateMemberLanguages } from "@/hooks/dynamoDB";
import { DEMO_FAMILY_GROUP, DEMO_USER_IDS } from '@/utils/demoConfig';
import { useToast } from '@/context/ToastContext';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import Image from 'next/image';
import { getFullImageUrl } from '@/utils/imageUtils';

type Tab = 'upload-photos' | 'add-comments' | 'manage-hobbies' | 'comment-hobbies' | 'manage-social-media' | 'manage-pets' | 'manage-languages';

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

const PROFICIENCY_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'native', label: 'Native/Fluent' }
];

const COMMON_LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Russian', label: 'Russian' },
  { value: 'Chinese', label: 'Chinese' },
  { value: 'Mandarin', label: 'Mandarin' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Dutch', label: 'Dutch' },
  { value: 'Swedish', label: 'Swedish' },
  { value: 'Norwegian', label: 'Norwegian' },
  { value: 'Danish', label: 'Danish' },
  { value: 'Finnish', label: 'Finnish' },
  { value: 'Polish', label: 'Polish' },
  { value: 'Turkish', label: 'Turkish' },
  { value: 'Greek', label: 'Greek' },
  { value: 'Hebrew', label: 'Hebrew' },
  { value: 'Vietnamese', label: 'Vietnamese' },
  { value: 'Thai', label: 'Thai' },
  { value: 'Indonesian', label: 'Indonesian' },
  { value: 'Malay', label: 'Malay' },
  { value: 'Tagalog', label: 'Tagalog' },
  { value: 'Swahili', label: 'Swahili' },
  { value: 'Czech', label: 'Czech' },
  { value: 'Hungarian', label: 'Hungarian' },
  { value: 'Romanian', label: 'Romanian' },
  { value: 'Bulgarian', label: 'Bulgarian' },
  { value: 'Croatian', label: 'Croatian' },
  { value: 'Serbian', label: 'Serbian' },
  { value: 'Slovak', label: 'Slovak' },
  { value: 'Slovenian', label: 'Slovenian' },
  { value: 'Ukrainian', label: 'Ukrainian' },
  { value: 'Bengali', label: 'Bengali' },
  { value: 'Urdu', label: 'Urdu' },
  { value: 'Persian', label: 'Persian' },
  { value: 'Punjabi', label: 'Punjabi' },
  { value: 'Tamil', label: 'Tamil' },
  { value: 'Telugu', label: 'Telugu' },
  { value: 'Marathi', label: 'Marathi' },
  { value: 'Gujarati', label: 'Gujarati' },
  { value: 'Kannada', label: 'Kannada' },
  { value: 'Malayalam', label: 'Malayalam' },
  { value: 'Odia', label: 'Odia' },
  { value: 'Assamese', label: 'Assamese' },
  { value: 'Nepali', label: 'Nepali' },
  { value: 'Sinhala', label: 'Sinhala' },
  { value: 'Burmese', label: 'Burmese' },
  { value: 'Khmer', label: 'Khmer' },
  { value: 'Lao', label: 'Lao' },
  { value: 'Mongolian', label: 'Mongolian' },
  { value: 'Tibetan', label: 'Tibetan' },
  { value: 'Georgian', label: 'Georgian' },
  { value: 'Armenian', label: 'Armenian' },
  { value: 'Azerbaijani', label: 'Azerbaijani' },
  { value: 'Kazakh', label: 'Kazakh' },
  { value: 'Uzbek', label: 'Uzbek' },
  { value: 'Kyrgyz', label: 'Kyrgyz' },
  { value: 'Tajik', label: 'Tajik' },
  { value: 'Turkmen', label: 'Turkmen' },
  { value: 'Afrikaans', label: 'Afrikaans' },
  { value: 'Zulu', label: 'Zulu' },
  { value: 'Xhosa', label: 'Xhosa' },
  { value: 'Amharic', label: 'Amharic' },
  { value: 'Hausa', label: 'Hausa' },
  { value: 'Yoruba', label: 'Yoruba' },
  { value: 'Igbo', label: 'Igbo' },
  { value: 'Somali', label: 'Somali' },
  { value: 'Oromo', label: 'Oromo' },
  { value: 'Kinyarwanda', label: 'Kinyarwanda' },
  { value: 'Luganda', label: 'Luganda' },
  { value: 'Shona', label: 'Shona' },
  { value: 'Kiswahili', label: 'Kiswahili' },
  { value: 'Welsh', label: 'Welsh' },
  { value: 'Irish', label: 'Irish' },
  { value: 'Scottish Gaelic', label: 'Scottish Gaelic' },
  { value: 'Basque', label: 'Basque' },
  { value: 'Catalan', label: 'Catalan' },
  { value: 'Galician', label: 'Galician' },
  { value: 'Maltese', label: 'Maltese' },
  { value: 'Icelandic', label: 'Icelandic' },
  { value: 'Faroese', label: 'Faroese' },
  { value: 'Estonian', label: 'Estonian' },
  { value: 'Latvian', label: 'Latvian' },
  { value: 'Lithuanian', label: 'Lithuanian' },
  { value: 'Belarusian', label: 'Belarusian' },
  { value: 'Macedonian', label: 'Macedonian' },
  { value: 'Albanian', label: 'Albanian' },
  { value: 'Bosnian', label: 'Bosnian' },
  { value: 'Montenegrin', label: 'Montenegrin' },
  { value: 'Moldovan', label: 'Moldovan' }
];

const AdminDemoDataPage = () => {
  const { user } = useAuthenticator();
  const { showToast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [demoMembers, setDemoMembers] = useState<FamilyMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('upload-photos');
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState(false);

  // Photo upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState({
    country: '',
    state: '',
    city: '',
    neighborhood: ''
  });
  const [dateYear, setDateYear] = useState('');
  const [dateMonth, setDateMonth] = useState('');
  const [dateDay, setDateDay] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<{ value: string; label: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comment state
  const [selectedPhotoForComment, setSelectedPhotoForComment] = useState<PhotoData | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Hobby management state
  const [memberHobbies, setMemberHobbies] = useState<string[]>([]);
  const [availableHobbies, setAvailableHobbies] = useState<string[]>([]);
  const [newHobby, setNewHobby] = useState('');
  const [isUpdatingHobbies, setIsUpdatingHobbies] = useState(false);

  // Hobby comment state
  const [allHobbies, setAllHobbies] = useState<string[]>([]);
  const [selectedHobbyForComment, setSelectedHobbyForComment] = useState<string>('');
  const [hobbyCommentText, setHobbyCommentText] = useState('');
  const [hobbyCommentPhoto, setHobbyCommentPhoto] = useState<File | null>(null);
  const [hobbyCommentPhotoPreview, setHobbyCommentPhotoPreview] = useState<string | null>(null);
  const [hobbyComments, setHobbyComments] = useState<Array<{ userId: string; text: string; author: string; timestamp: string; commenterPhoto: string; photoUrl?: string }>>([]);
  const [isAddingHobbyComment, setIsAddingHobbyComment] = useState(false);
  const hobbyCommentFileInputRef = useRef<HTMLInputElement>(null);

  // Social media state
  const [socialMediaEntries, setSocialMediaEntries] = useState<{ platform: string; url: string }[]>([]);
  const [newSocialMedia, setNewSocialMedia] = useState({ platform: '', url: '' });
  const [isUpdatingSocialMedia, setIsUpdatingSocialMedia] = useState(false);

  // Pets state
  const [petsEntries, setPetsEntries] = useState<{ name: string; birthday: string; death_date?: string; image?: string }[]>([]);
  const [newPet, setNewPet] = useState({ name: '', birthday: '', death_date: '' });
  const [petImage, setPetImage] = useState<File | null>(null);
  const [petImagePreview, setPetImagePreview] = useState<string | null>(null);
  const [isUpdatingPets, setIsUpdatingPets] = useState(false);
  const petFileInputRef = useRef<HTMLInputElement>(null);

  // Languages state
  const [languagesEntries, setLanguagesEntries] = useState<{ name: string; proficiency: string }[]>([]);
  const [newLanguage, setNewLanguage] = useState({ name: '', proficiency: '' });
  const [isUpdatingLanguages, setIsUpdatingLanguages] = useState(false);

  useEffect(() => {
    if (user && user.userId === "f16b1510-0001-705f-8680-28689883e706") {
      setIsAdmin(true);
      fetchDemoMembers();
    }
  }, [user]);

  const fetchDemoMembers = async () => {
    try {
      const members = await getAllFamilyMembers(undefined, true);
      const demo = members.filter(m => (m.family_group || 'real') === DEMO_FAMILY_GROUP);
      setDemoMembers(demo);
      if (demo.length > 0 && !selectedMember) {
        setSelectedMember(demo[0]);
      }
      // Fetch photos after demo members are loaded
      // We use a demo user ID (from DEMO_USER_IDS) not a family member ID
      await fetchPhotos();
    } catch (error) {
      console.error("Error fetching demo members:", error);
      showToast('Error fetching demo members', 'error');
    }
  };

  const fetchPhotos = async (demoMemberIdOverride?: string) => {
    try {
      setLoading(true);
      // Fetch photos from the API - we need to use a DEMO USER ID (Cognito ID), not a family member ID
      // The API uses getUserFamilyGroup which checks DEMO_USER_IDS, not family member IDs
      // Use the first demo user ID from DEMO_USER_IDS to ensure correct family group filtering
      const demoUserId = DEMO_USER_IDS.length > 0 ? DEMO_USER_IDS[0] : null;
      
      if (!demoUserId) {
        console.error('❌ No demo user IDs configured');
        setPhotos([]);
        setLoading(false);
        return;
      }

      console.log('📸 Fetching photos using demo user ID:', demoUserId);
      const response = await fetch('/api/photos?userId=' + demoUserId);
      const data = await response.json();
      console.log('📸 Photos API response:', data.photos?.length || 0, 'photos');
      
      if (data.photos) {
        // Filter to only demo photos (should already be filtered by API, but double-check)
        const demoPhotos = data.photos.filter((photo: PhotoData) => 
          photo.family_group === DEMO_FAMILY_GROUP
        );
        console.log('📸 Demo photos after filtering:', demoPhotos.length);
        setPhotos(demoPhotos);
      } else {
        setPhotos([]);
      }
    } catch (error) {
      console.error("Error fetching photos:", error);
      showToast('Error fetching photos', 'error');
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMember && demoMembers.length > 0) {
      fetchPhotos();
      fetchMemberHobbies();
      fetchMemberSocialMedia();
      fetchMemberPets();
      fetchMemberLanguages();
    }
  }, [selectedMember, demoMembers.length]);

  const fetchMemberSocialMedia = async () => {
    if (!selectedMember) return;
    try {
      const userData = await getUserData(selectedMember.family_member_id);
      setSocialMediaEntries(userData?.social_media || []);
    } catch (error) {
      console.error("Error fetching member social media:", error);
      setSocialMediaEntries([]);
    }
  };

  const fetchMemberPets = async () => {
    if (!selectedMember) return;
    try {
      const userData = await getUserData(selectedMember.family_member_id);
      setPetsEntries(userData?.pets || []);
    } catch (error) {
      console.error("Error fetching member pets:", error);
      setPetsEntries([]);
    }
  };

  const fetchMemberLanguages = async () => {
    if (!selectedMember) return;
    try {
      const userData = await getUserData(selectedMember.family_member_id);
      setLanguagesEntries(userData?.languages || []);
    } catch (error) {
      console.error("Error fetching member languages:", error);
      setLanguagesEntries([]);
    }
  };

  useEffect(() => {
    fetchAllHobbies();
    fetchAvailableHobbies();
  }, []);

  const fetchMemberHobbies = async () => {
    if (!selectedMember) return;
    try {
      const userData = await getUserData(selectedMember.family_member_id);
      setMemberHobbies(userData?.hobbies || []);
    } catch (error) {
      console.error("Error fetching member hobbies:", error);
      setMemberHobbies([]);
    }
  };

  const fetchAllHobbies = async () => {
    try {
      // Only fetch hobbies from demo family members
      const hobbies = await getAllHobbies(DEMO_FAMILY_GROUP);
      setAllHobbies(hobbies);
    } catch (error) {
      console.error("Error fetching all hobbies:", error);
    }
  };

  const fetchAvailableHobbies = async () => {
    try {
      // Only fetch hobbies from demo family members
      const hobbies = await getAllHobbies(DEMO_FAMILY_GROUP);
      setAvailableHobbies(hobbies);
    } catch (error) {
      console.error("Error fetching available hobbies:", error);
    }
  };

  const fetchHobbyComments = async (hobby: string) => {
    if (!hobby) return;
    try {
      const comments = await getCommentsForHobby(hobby);
      setHobbyComments(comments);
    } catch (error) {
      console.error("Error fetching hobby comments:", error);
      setHobbyComments([]);
    }
  };

  useEffect(() => {
    if (selectedHobbyForComment) {
      fetchHobbyComments(selectedHobbyForComment);
    }
  }, [selectedHobbyForComment]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        if (e.target?.result) {
          setPreviewUrl(e.target.result as string);
        }
      };
      fileReader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedMember) {
      showToast('Please select a file and a demo member', 'error');
      return;
    }

    setIsUploading(true);
    try {
      // Upload file to S3
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const uploadResult = await uploadResponse.json();
      const s3Key = uploadResult.key;

      // Build date_taken string
      let dateTaken = '';
      if (dateYear) {
        if (dateMonth) {
          if (dateDay) {
            dateTaken = `${dateYear}-${dateMonth.padStart(2, '0')}-${dateDay.padStart(2, '0')}`;
          } else {
            dateTaken = `${dateYear}-${dateMonth.padStart(2, '0')}`;
          }
        } else {
          dateTaken = dateYear;
        }
      }

      // Build tagged people array
      const taggedPeople = selectedUsers.map(user => ({
        id: user.value,
        name: user.label
      }));

      // Save to DynamoDB as the selected demo member
      await adminSavePhotoAsDemoMember({
        photo_id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        s3_key: s3Key,
        uploaded_by: selectedMember.family_member_id,
        upload_date: new Date().toISOString(),
        metadata: {
          description,
          location,
          date_taken: dateTaken,
          people_tagged: taggedPeople,
        },
        album_ids: [],
        url: '', // Will be generated when fetched
        lastModified: new Date().toISOString(),
      }, DEMO_FAMILY_GROUP);

      showToast('Photo uploaded successfully as ' + selectedMember.first_name + ' ' + selectedMember.last_name, 'success');
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setDescription('');
      setLocation({ country: '', state: '', city: '', neighborhood: '' });
      setDateYear('');
      setDateMonth('');
      setDateDay('');
      setSelectedUsers([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Refresh photos
      fetchPhotos();
    } catch (error) {
      console.error('Error uploading photo:', error);
      showToast('Error uploading photo', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedPhotoForComment || !selectedMember || !commentText.trim()) {
      showToast('Please select a photo and enter a comment', 'error');
      return;
    }

    setIsAddingComment(true);
    try {
      // Get the member's profile photo
      const profilePhoto = await getProfilePhotoById(selectedMember.family_member_id);
      const author = `${selectedMember.first_name} ${selectedMember.last_name}`.trim();

      await addCommentToPhoto(
        selectedPhotoForComment.photo_id,
        selectedMember.family_member_id,
        commentText.trim(),
        author,
        profilePhoto || ''
      );

      showToast('Comment added successfully as ' + author, 'success');
      setCommentText('');
      setSelectedPhotoForComment(null);
      
      // Refresh photos to get updated comments
      fetchPhotos();
    } catch (error) {
      console.error('Error adding comment:', error);
      showToast('Error adding comment', 'error');
    } finally {
      setIsAddingComment(false);
    }
  };

  // Transform demo members into options for react-select
  const memberOptions = demoMembers.map(member => ({
    value: member.family_member_id,
    label: `${member.first_name} ${member.last_name}`
  }));

  // Transform all demo members into options for tagging
  const taggingOptions = demoMembers.map(member => ({
    value: member.family_member_id,
    label: `${member.first_name} ${member.last_name}`
  }));

  // Hobby management handlers
  const handleAddHobby = () => {
    const hobbyToAdd = newHobby.trim();
    if (hobbyToAdd && !memberHobbies.includes(hobbyToAdd)) {
      setMemberHobbies([...memberHobbies, hobbyToAdd]);
      setNewHobby('');
      // Add to available hobbies if it's new
      if (!availableHobbies.includes(hobbyToAdd)) {
        setAvailableHobbies([...availableHobbies, hobbyToAdd].sort());
      }
    }
  };

  const handleRemoveHobby = (hobbyToRemove: string) => {
    setMemberHobbies(memberHobbies.filter(h => h !== hobbyToRemove));
  };

  const handleUpdateHobbies = async () => {
    if (!selectedMember) {
      showToast('Please select a demo member', 'error');
      return;
    }

    setIsUpdatingHobbies(true);
    try {
      await adminUpdateMemberHobbies(selectedMember.family_member_id, memberHobbies);
      showToast('Hobbies updated successfully for ' + selectedMember.first_name + ' ' + selectedMember.last_name, 'success');
      await fetchMemberHobbies();
    } catch (error) {
      console.error('Error updating hobbies:', error);
      showToast('Error updating hobbies', 'error');
    } finally {
      setIsUpdatingHobbies(false);
    }
  };

  const handleAddHobbyFromList = (hobby: string) => {
    if (!memberHobbies.includes(hobby)) {
      setMemberHobbies([...memberHobbies, hobby]);
    }
  };

  // Hobby comment handlers
  const handleHobbyCommentPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setHobbyCommentPhoto(file);
      
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        if (e.target?.result) {
          setHobbyCommentPhotoPreview(e.target.result as string);
        }
      };
      fileReader.readAsDataURL(file);
    }
  };

  const handleClearHobbyCommentPhoto = () => {
    setHobbyCommentPhoto(null);
    setHobbyCommentPhotoPreview(null);
    if (hobbyCommentFileInputRef.current) {
      hobbyCommentFileInputRef.current.value = '';
    }
  };

  // Social media handlers
  const handleAddSocialMedia = () => {
    if (newSocialMedia.platform.trim() && newSocialMedia.url.trim()) {
      setSocialMediaEntries([...socialMediaEntries, { ...newSocialMedia }]);
      setNewSocialMedia({ platform: '', url: '' });
    }
  };

  const handleRemoveSocialMedia = (index: number) => {
    setSocialMediaEntries(socialMediaEntries.filter((_, i) => i !== index));
  };

  const handleUpdateSocialMedia = async () => {
    if (!selectedMember) {
      showToast('Please select a demo member', 'error');
      return;
    }

    setIsUpdatingSocialMedia(true);
    try {
      await adminUpdateMemberSocialMedia(selectedMember.family_member_id, socialMediaEntries);
      showToast('Social media updated successfully for ' + selectedMember.first_name + ' ' + selectedMember.last_name, 'success');
      await fetchMemberSocialMedia();
    } catch (error) {
      console.error('Error updating social media:', error);
      showToast('Error updating social media', 'error');
    } finally {
      setIsUpdatingSocialMedia(false);
    }
  };

  // Pets handlers
  const handlePetImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPetImage(file);
      
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        if (e.target?.result) {
          setPetImagePreview(e.target.result as string);
        }
      };
      fileReader.readAsDataURL(file);
    }
  };

  const handleClearPetImage = () => {
    setPetImage(null);
    setPetImagePreview(null);
    if (petFileInputRef.current) {
      petFileInputRef.current.value = '';
    }
  };

  const handleAddPet = async () => {
    if (!newPet.name.trim()) {
      showToast('Please enter a pet name', 'error');
      return;
    }

    let petImageUrl = '';
    if (petImage) {
      try {
        const formData = new FormData();
        formData.append('file', petImage);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload pet image');
        }
        
        const result = await response.json();
        if (result.key) {
          petImageUrl = result.key;
        }
      } catch (error) {
        console.error('Error uploading pet image:', error);
        showToast('Error uploading pet image', 'error');
        return;
      }
    }

    setPetsEntries([...petsEntries, {
      name: newPet.name.trim(),
      birthday: newPet.birthday.trim(),
      death_date: newPet.death_date.trim() || undefined,
      image: petImageUrl || undefined
    }]);
    setNewPet({ name: '', birthday: '', death_date: '' });
    setPetImage(null);
    setPetImagePreview(null);
    if (petFileInputRef.current) {
      petFileInputRef.current.value = '';
    }
  };

  const handleRemovePet = (index: number) => {
    setPetsEntries(petsEntries.filter((_, i) => i !== index));
  };

  const handleUpdatePets = async () => {
    if (!selectedMember) {
      showToast('Please select a demo member', 'error');
      return;
    }

    setIsUpdatingPets(true);
    try {
      await adminUpdateMemberPets(selectedMember.family_member_id, petsEntries);
      showToast('Pets updated successfully for ' + selectedMember.first_name + ' ' + selectedMember.last_name, 'success');
      await fetchMemberPets();
    } catch (error) {
      console.error('Error updating pets:', error);
      showToast('Error updating pets', 'error');
    } finally {
      setIsUpdatingPets(false);
    }
  };

  // Languages handlers
  const handleAddLanguage = () => {
    if (newLanguage.name.trim() && newLanguage.proficiency.trim()) {
      // Check if language already exists (case-insensitive)
      const languageExists = languagesEntries.some(lang => 
        lang.name.toLowerCase() === newLanguage.name.toLowerCase()
      );
      
      if (!languageExists) {
        setLanguagesEntries([...languagesEntries, { ...newLanguage }]);
        setNewLanguage({ name: '', proficiency: '' });
      } else {
        showToast('This language is already in the list.', 'error');
      }
    }
  };

  const handleRemoveLanguage = (index: number) => {
    setLanguagesEntries(languagesEntries.filter((_, i) => i !== index));
  };

  const handleUpdateLanguages = async () => {
    if (!selectedMember) {
      showToast('Please select a demo member', 'error');
      return;
    }

    setIsUpdatingLanguages(true);
    try {
      await adminUpdateMemberLanguages(selectedMember.family_member_id, languagesEntries);
      showToast('Languages updated successfully for ' + selectedMember.first_name + ' ' + selectedMember.last_name, 'success');
      await fetchMemberLanguages();
    } catch (error) {
      console.error('Error updating languages:', error);
      showToast('Error updating languages', 'error');
    } finally {
      setIsUpdatingLanguages(false);
    }
  };

  const handleAddHobbyComment = async () => {
    if (!selectedHobbyForComment || !selectedMember) {
      showToast('Please select a hobby and a demo member', 'error');
      return;
    }

    if (!hobbyCommentText.trim() && !hobbyCommentPhoto) {
      showToast('Please enter a comment or add a photo', 'error');
      return;
    }

    setIsAddingHobbyComment(true);
    try {
      let photoUrl: string | undefined = undefined;

      // Upload photo if one is selected
      if (hobbyCommentPhoto) {
        const formData = new FormData();
        formData.append('file', hobbyCommentPhoto);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload photo');
        }
        
        const result = await response.json();
        if (result.key) {
          photoUrl = result.key;
        }
      }

      const profilePhoto = await getProfilePhotoById(selectedMember.family_member_id);
      const author = `${selectedMember.first_name} ${selectedMember.last_name}`.trim();

      await addCommentToHobby(
        selectedHobbyForComment,
        selectedMember.family_member_id,
        hobbyCommentText.trim() || '',
        author,
        profilePhoto || '',
        photoUrl
      );

      showToast('Comment added successfully as ' + author, 'success');
      setHobbyCommentText('');
      setHobbyCommentPhoto(null);
      setHobbyCommentPhotoPreview(null);
      if (hobbyCommentFileInputRef.current) {
        hobbyCommentFileInputRef.current.value = '';
      }
      
      // Refresh comments
      await fetchHobbyComments(selectedHobbyForComment);
    } catch (error) {
      console.error('Error adding hobby comment:', error);
      showToast('Error adding comment', 'error');
    } finally {
      setIsAddingHobbyComment(false);
    }
  };

  if (!isAdmin) {
    return <div className="text-center text-red-500 p-6">Access Denied</div>;
  }

  if (demoMembers.length === 0) {
    return (
      <div className="min-h-screen p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4">
            <a href="/admin" className="btn btn-ghost btn-sm">
              ← Back to Admin Page
            </a>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">No Demo Family Members Found</h2>
            <p className="text-gray-600 mb-4">
              Please create demo family members first in the Admin Page before managing demo data.
            </p>
            <a href="/admin" className="btn btn-primary">
              Go to Admin Page
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <a href="/admin" className="btn btn-ghost btn-sm">
            ← Back to Admin Page
          </a>
        </div>
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">Demo Data Management</h1>
        <p className="text-center text-gray-600 mb-6">
          Upload photos and add comments as demo family members without logging in as them
        </p>
        
        {/* Member Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Select Demo Family Member</h2>
          <Select
            options={memberOptions}
            value={selectedMember ? {
              value: selectedMember.family_member_id,
              label: `${selectedMember.first_name} ${selectedMember.last_name}`
            } : null}
            onChange={(option) => {
              const member = demoMembers.find(m => m.family_member_id === option?.value);
              setSelectedMember(member || null);
            }}
            className="text-black"
            placeholder="Select a demo family member..."
          />
          {selectedMember && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Currently impersonating:</strong> {selectedMember.first_name} {selectedMember.last_name}
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="tabs tabs-bordered">
            <a 
              className={`tab tab-lg ${activeTab === 'upload-photos' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('upload-photos')}
            >
              Upload Photos
            </a>
            <a 
              className={`tab tab-lg ${activeTab === 'add-comments' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('add-comments')}
            >
              Add Comments
            </a>
            <a 
              className={`tab tab-lg ${activeTab === 'manage-hobbies' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('manage-hobbies')}
            >
              Manage Hobbies
            </a>
            <a 
              className={`tab tab-lg ${activeTab === 'comment-hobbies' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('comment-hobbies')}
            >
              Comment on Hobbies
            </a>
            <a 
              className={`tab tab-lg ${activeTab === 'manage-social-media' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('manage-social-media')}
            >
              Social Media
            </a>
            <a 
              className={`tab tab-lg ${activeTab === 'manage-pets' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('manage-pets')}
            >
              Pets
            </a>
            <a 
              className={`tab tab-lg ${activeTab === 'manage-languages' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('manage-languages')}
            >
              Languages
            </a>
          </div>
        </div>

        {/* Upload Photos Tab */}
        {activeTab === 'upload-photos' && selectedMember && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Upload Photo as {selectedMember.first_name} {selectedMember.last_name}</h2>
            <form onSubmit={handlePhotoUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="file-input file-input-bordered w-full"
                  data-theme="light"
                />
                {previewUrl && (
                  <div className="mt-4">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      width={300}
                      height={300}
                      className="object-contain rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  placeholder="Enter photo description..."
                  data-theme="light"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    value={location.country}
                    onChange={(e) => setLocation({ ...location, country: e.target.value })}
                    className="input input-bordered w-full"
                    placeholder="Country"
                    data-theme="light"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={location.state}
                    onChange={(e) => setLocation({ ...location, state: e.target.value })}
                    className="input input-bordered w-full"
                    placeholder="State"
                    data-theme="light"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={location.city}
                    onChange={(e) => setLocation({ ...location, city: e.target.value })}
                    className="input input-bordered w-full"
                    placeholder="City"
                    data-theme="light"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Neighborhood</label>
                  <input
                    type="text"
                    value={location.neighborhood}
                    onChange={(e) => setLocation({ ...location, neighborhood: e.target.value })}
                    className="input input-bordered w-full"
                    placeholder="Neighborhood"
                    data-theme="light"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <input
                    type="text"
                    value={dateYear}
                    onChange={(e) => setDateYear(e.target.value)}
                    className="input input-bordered w-full"
                    placeholder="YYYY"
                    data-theme="light"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                  <input
                    type="text"
                    value={dateMonth}
                    onChange={(e) => setDateMonth(e.target.value)}
                    className="input input-bordered w-full"
                    placeholder="MM"
                    data-theme="light"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
                  <input
                    type="text"
                    value={dateDay}
                    onChange={(e) => setDateDay(e.target.value)}
                    className="input input-bordered w-full"
                    placeholder="DD"
                    data-theme="light"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tag People</label>
                <Select
                  isMulti
                  options={taggingOptions}
                  value={selectedUsers}
                  onChange={(options) => setSelectedUsers(options as { value: string; label: string }[])}
                  className="text-black"
                  placeholder="Select people to tag..."
                  data-theme="light"
                />
              </div>

              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="btn btn-primary w-full"
                data-theme="light"
              >
                {isUploading ? 'Uploading...' : 'Upload Photo'}
              </button>
            </form>
          </div>
        )}

        {/* Add Comments Tab */}
        {activeTab === 'add-comments' && selectedMember && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Add Comment as {selectedMember.first_name} {selectedMember.last_name}</h2>
            
            {loading ? (
              <div className="text-center py-8">Loading photos...</div>
            ) : photos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No photos found. Upload some photos first!</div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Photo</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {photos.map((photo) => (
                      <div
                        key={photo.photo_id}
                        onClick={() => setSelectedPhotoForComment(photo)}
                        className={`cursor-pointer border-2 rounded-lg overflow-hidden ${
                          selectedPhotoForComment?.photo_id === photo.photo_id
                            ? 'border-blue-500'
                            : 'border-gray-300'
                        }`}
                      >
                        <Image
                          src={photo.url}
                          alt={photo.metadata.description || 'Photo'}
                          width={200}
                          height={200}
                          className="w-full h-32 object-cover"
                        />
                        {photo.metadata.description && (
                          <p className="p-2 text-xs text-gray-600 truncate">{photo.metadata.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedPhotoForComment && (
                  <div className="border-t pt-4">
                    <div className="mb-4">
                      <Image
                        src={selectedPhotoForComment.url}
                        alt={selectedPhotoForComment.metadata.description || 'Selected photo'}
                        width={400}
                        height={400}
                        className="w-full max-w-md mx-auto rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="textarea textarea-bordered w-full"
                        rows={3}
                        placeholder="Enter your comment..."
                        data-theme="light"
                      />
                    </div>
                    <button
                      onClick={handleAddComment}
                      disabled={isAddingComment || !commentText.trim()}
                      className="btn btn-primary btn-sm mt-4"
                    >
                      {isAddingComment ? 'Adding Comment...' : 'Add Comment'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Manage Hobbies Tab */}
        {activeTab === 'manage-hobbies' && selectedMember && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Manage Hobbies for {selectedMember.first_name} {selectedMember.last_name}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Hobbies</label>
                {memberHobbies.length === 0 ? (
                  <p className="text-gray-500 text-sm">No hobbies added yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {memberHobbies.map((hobby, index) => (
                      <div key={index} className="badge badge-primary badge-lg gap-2">
                        {hobby}
                        <button
                          onClick={() => handleRemoveHobby(hobby)}
                          className="btn btn-xs btn-circle btn-ghost"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add New Hobby</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newHobby}
                    onChange={(e) => setNewHobby(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddHobby();
                      }
                    }}
                    className="input input-bordered flex-1"
                    placeholder="Enter hobby name..."
                    data-theme="light"
                  />
                  <button
                    onClick={handleAddHobby}
                    disabled={!newHobby.trim()}
                    className="btn btn-primary"
                  >
                    Add
                  </button>
                </div>
              </div>

              {availableHobbies.length > 0 && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Add from Existing Hobbies</label>
                  <div className="flex flex-wrap gap-2">
                    {availableHobbies
                      .filter(hobby => !memberHobbies.includes(hobby))
                      .map((hobby, index) => (
                        <button
                          key={index}
                          onClick={() => handleAddHobbyFromList(hobby)}
                          className="btn btn-outline btn-sm"
                        >
                          + {hobby}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <button
                  onClick={handleUpdateHobbies}
                  disabled={isUpdatingHobbies}
                  className="btn btn-primary w-full"
                >
                  {isUpdatingHobbies ? 'Updating...' : 'Save Hobbies'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comment on Hobbies Tab */}
        {activeTab === 'comment-hobbies' && selectedMember && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Comment on Hobbies as {selectedMember.first_name} {selectedMember.last_name}</h2>
            
            {allHobbies.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hobbies found. Add hobbies to family members first!
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Hobby</label>
                  <Select
                    options={allHobbies.map(hobby => ({ value: hobby, label: hobby }))}
                    value={selectedHobbyForComment ? { value: selectedHobbyForComment, label: selectedHobbyForComment } : null}
                    onChange={(option) => setSelectedHobbyForComment(option?.value || '')}
                    className="text-black"
                    placeholder="Select a hobby..."
                  />
                </div>

                {selectedHobbyForComment && (
                  <div className="border-t pt-4 space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Comments on "{selectedHobbyForComment}"</h3>
                      {hobbyComments.length === 0 ? (
                        <p className="text-gray-500 text-sm">No comments yet</p>
                      ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {hobbyComments.map((comment, index) => (
                            <div key={index} className="border rounded-lg p-3">
                              <div className="flex items-start gap-3">
                                {comment.commenterPhoto && (
                                  <Image
                                    src={getFullImageUrl(comment.commenterPhoto)}
                                    alt={comment.author}
                                    width={40}
                                    height={40}
                                    className="rounded-full"
                                  />
                                )}
                                <div className="flex-1">
                                  <p className="font-semibold text-sm">{comment.author}</p>
                                  <p className="text-gray-700">{comment.text}</p>
                                  {comment.photoUrl && (
                                    <div className="mt-2">
                                      <Image
                                        src={getFullImageUrl(comment.photoUrl)}
                                        alt="Comment photo"
                                        width={200}
                                        height={200}
                                        className="rounded-lg"
                                      />
                                    </div>
                                  )}
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(comment.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Add Comment</label>
                      <textarea
                        value={hobbyCommentText}
                        onChange={(e) => setHobbyCommentText(e.target.value)}
                        className="textarea textarea-bordered w-full mb-3"
                        rows={3}
                        placeholder="Enter your comment (optional if adding a photo)..."
                        data-theme="light"
                      />
                      
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Add Photo (Optional)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleHobbyCommentPhotoChange}
                          ref={hobbyCommentFileInputRef}
                          className="file-input file-input-bordered w-full"
                          data-theme="light"
                        />
                        {hobbyCommentPhotoPreview && (
                          <div className="mt-3 relative inline-block">
                            <Image
                              src={hobbyCommentPhotoPreview}
                              alt="Comment photo preview"
                              width={200}
                              height={200}
                              className="rounded-lg"
                            />
                            <button
                              onClick={handleClearHobbyCommentPhoto}
                              className="btn btn-sm btn-circle btn-ghost absolute top-2 right-2 bg-white/80 hover:bg-white"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleAddHobbyComment}
                        disabled={isAddingHobbyComment || (!hobbyCommentText.trim() && !hobbyCommentPhoto)}
                        className="btn btn-primary w-full"
                      >
                        {isAddingHobbyComment ? 'Adding Comment...' : 'Add Comment'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Manage Social Media Tab */}
        {activeTab === 'manage-social-media' && selectedMember && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Manage Social Media for {selectedMember.first_name} {selectedMember.last_name}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Social Media Links</label>
                {socialMediaEntries.length === 0 ? (
                  <p className="text-gray-500 text-sm">No social media links added yet</p>
                ) : (
                  <div className="space-y-2">
                    {socialMediaEntries.map((sm, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-semibold">{sm.platform}</p>
                          <p className="text-sm text-gray-600">{sm.url}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveSocialMedia(index)}
                          className="btn btn-sm btn-ghost text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add New Social Media Link</label>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <Select
                      value={SOCIAL_MEDIA_PLATFORMS.find((option: { value: string; label: string }) => option.value === newSocialMedia.platform) || null}
                      onChange={(selectedOption: { value: string; label: string } | null) => 
                        setNewSocialMedia(prev => ({ ...prev, platform: selectedOption?.value || '' }))
                      }
                      options={SOCIAL_MEDIA_PLATFORMS}
                      placeholder="Select platform"
                      className="text-black"
                      data-theme="light"
                    />
                  </div>
                  <div>
                    <input
                      type="url"
                      value={newSocialMedia.url}
                      onChange={(e) => setNewSocialMedia({ ...newSocialMedia, url: e.target.value })}
                      className="input input-bordered h-[2.4rem] w-full"
                      placeholder="URL"
                      data-theme="light"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddSocialMedia}
                  disabled={!newSocialMedia.platform.trim() || !newSocialMedia.url.trim()}
                  className="btn btn-primary"
                >
                  Add Social Media
                </button>
              </div>

              <div className="border-t pt-4">
                <button
                  onClick={handleUpdateSocialMedia}
                  disabled={isUpdatingSocialMedia}
                  className="btn btn-primary w-full"
                >
                  {isUpdatingSocialMedia ? 'Updating...' : 'Save Social Media'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Pets Tab */}
        {activeTab === 'manage-pets' && selectedMember && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Manage Pets for {selectedMember.first_name} {selectedMember.last_name}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Pets</label>
                {petsEntries.length === 0 ? (
                  <p className="text-gray-500 text-sm">No pets added yet</p>
                ) : (
                  <div className="space-y-3">
                    {petsEntries.map((pet, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        {pet.image && (
                          <Image
                            src={getFullImageUrl(pet.image)}
                            alt={pet.name}
                            width={80}
                            height={80}
                            className="rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold">{pet.name}</p>
                          <p className="text-sm text-gray-600">Birthday: {pet.birthday || 'Not set'}</p>
                          {pet.death_date && (
                            <p className="text-sm text-gray-600">Death Date: {pet.death_date}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemovePet(index)}
                          className="btn btn-sm btn-ghost text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add New Pet</label>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newPet.name}
                    onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                    className="input input-bordered w-full"
                    placeholder="Pet Name *"
                    data-theme="light"
                  />
                  <input
                    type="text"
                    value={newPet.birthday}
                    onChange={(e) => setNewPet({ ...newPet, birthday: e.target.value })}
                    className="input input-bordered w-full"
                    placeholder="Birthday (e.g., 2020-01-15)"
                    data-theme="light"
                  />
                  <input
                    type="text"
                    value={newPet.death_date}
                    onChange={(e) => setNewPet({ ...newPet, death_date: e.target.value })}
                    className="input input-bordered w-full"
                    placeholder="Death Date (optional, e.g., 2023-12-01)"
                    data-theme="light"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pet Photo (Optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePetImageChange}
                      ref={petFileInputRef}
                      className="file-input file-input-bordered w-full"
                      data-theme="light"
                    />
                    {petImagePreview && (
                      <div className="mt-3 relative inline-block">
                        <Image
                          src={petImagePreview}
                          alt="Pet preview"
                          width={200}
                          height={200}
                          className="rounded-lg"
                        />
                        <button
                          onClick={handleClearPetImage}
                          className="btn btn-sm btn-circle btn-ghost absolute top-2 right-2 bg-white/80 hover:bg-white"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleAddPet}
                    disabled={!newPet.name.trim()}
                    className="btn btn-primary"
                  >
                    Add Pet
                  </button>
                </div>
              </div>

              <div className="border-t pt-4">
                <button
                  onClick={handleUpdatePets}
                  disabled={isUpdatingPets}
                  className="btn btn-primary w-full"
                >
                  {isUpdatingPets ? 'Updating...' : 'Save Pets'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Languages Tab */}
        {activeTab === 'manage-languages' && selectedMember && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Manage Languages for {selectedMember.first_name} {selectedMember.last_name}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Languages</label>
                {languagesEntries.length === 0 ? (
                  <p className="text-gray-500 text-sm">No languages added yet</p>
                ) : (
                  <div className="space-y-2">
                    {languagesEntries.map((lang, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-semibold">{lang.name}</p>
                          <p className="text-sm text-gray-600">Proficiency: {lang.proficiency}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveLanguage(index)}
                          className="btn btn-sm btn-ghost text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add New Language</label>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <CreatableSelect
                      value={newLanguage.name ? { value: newLanguage.name, label: newLanguage.name } : null}
                      onChange={(selectedOption: { value: string; label: string } | null) => {
                        const languageName = selectedOption?.value || '';
                        setNewLanguage(prev => ({ ...prev, name: languageName }));
                      }}
                      onCreateOption={(inputValue) => {
                        setNewLanguage(prev => ({ ...prev, name: inputValue.trim() }));
                      }}
                      options={COMMON_LANGUAGES}
                      placeholder="Type or select a language"
                      isClearable
                      isSearchable
                      formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
                      className="text-black"
                      data-theme="light"
                    />
                  </div>
                  <div>
                    <Select
                      value={PROFICIENCY_LEVELS.find((option: { value: string; label: string }) => option.value === newLanguage.proficiency) || null}
                      onChange={(selectedOption: { value: string; label: string } | null) => {
                        const proficiency = selectedOption?.value || '';
                        setNewLanguage(prev => ({ ...prev, proficiency }));
                      }}
                      options={PROFICIENCY_LEVELS}
                      placeholder="Select proficiency"
                      className="text-black"
                      data-theme="light"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddLanguage}
                  disabled={!newLanguage.name.trim() || !newLanguage.proficiency.trim()}
                  className="btn btn-primary"
                >
                  Add Language
                </button>
              </div>

              <div className="border-t pt-4">
                <button
                  onClick={handleUpdateLanguages}
                  disabled={isUpdatingLanguages}
                  className="btn btn-primary w-full"
                >
                  {isUpdatingLanguages ? 'Updating...' : 'Save Languages'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDemoDataPage;
