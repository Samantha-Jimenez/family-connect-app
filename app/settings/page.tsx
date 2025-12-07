"use client"
import React, { useState, useEffect, useRef } from 'react';
import { saveUserToDB, getUserData, getAllHobbies } from '@/hooks/dynamoDB';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchUserAttributes } from 'aws-amplify/auth';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getFullImageUrl } from '@/utils/imageUtils';
import { useToast } from '@/context/ToastContext';
import { useUser } from '@/context/UserContext';
import LoadSpinner from '@/components/LoadSpinner';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Pet {
  name: string;
  birthday: string;
  death_date?: string;
  image?: string;
}

interface Language {
  name: string;
  proficiency: string;
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
  hobbies?: string[];
  languages?: Language[];
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
  { value: 'Pashto', label: 'Pashto' },
  { value: 'Kurdish', label: 'Kurdish' },
  { value: 'Amharic', label: 'Amharic' },
  { value: 'Hausa', label: 'Hausa' },
  { value: 'Yoruba', label: 'Yoruba' },
  { value: 'Igbo', label: 'Igbo' },
  { value: 'Zulu', label: 'Zulu' },
  { value: 'Xhosa', label: 'Xhosa' },
  { value: 'Afrikaans', label: 'Afrikaans' },
  { value: 'Welsh', label: 'Welsh' },
  { value: 'Irish', label: 'Irish' },
  { value: 'Scottish Gaelic', label: 'Scottish Gaelic' },
  { value: 'Basque', label: 'Basque' },
  { value: 'Catalan', label: 'Catalan' },
  { value: 'Galician', label: 'Galician' },
  { value: 'Icelandic', label: 'Icelandic' },
  { value: 'Maltese', label: 'Maltese' },
  { value: 'Estonian', label: 'Estonian' },
  { value: 'Latvian', label: 'Latvian' },
  { value: 'Lithuanian', label: 'Lithuanian' },
  { value: 'Albanian', label: 'Albanian' },
  { value: 'Macedonian', label: 'Macedonian' },
  { value: 'Bosnian', label: 'Bosnian' },
  { value: 'Montenegrin', label: 'Montenegrin' }
].sort((a, b) => a.label.localeCompare(b.label));

// Sortable Language Item Component
// Sortable Social Media Item Component
const SortableSocialMediaItem = ({
  id,
  entry,
  index,
  onRemove,
}: {
  id: string;
  entry: { platform: string; url: string };
  index: number;
  onRemove: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 mb-2 p-1.5 rounded-lg bg-tea-green/20 hover:bg-tea-green/50"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex items-center justify-center p-1 hover:bg-tea-green/70 rounded"
        aria-label="Drag to reorder"
      >
        <svg
          className="w-5 h-5 text-palm-green"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>
      <div className="flex-1 inline-flex gap-1">
        <span className="text-sm font-medium text-gray-700 capitalize">
          {SOCIAL_MEDIA_PLATFORMS.find(p => p.value === entry.platform)?.label || entry.platform}
        </span>
        <span className="text-sm text-palm-green">•</span>
        <p className="text-sm text-gray-600 break-all">{entry.url}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="text-red-600 hover:text-red-800 text-sm font-medium group px-1"
      >
        Remove
      </button>
    </div>
  );
};

// Sortable Hobby Item Component
const SortableHobbyItem = ({
  id,
  hobby,
  index,
  onRemove,
}: {
  id: string;
  hobby: string;
  index: number;
  onRemove: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 mb-2 p-1.5 rounded-lg bg-tea-green/20 hover:bg-tea-green/50"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex items-center justify-center p-1 hover:bg-tea-green/70 rounded"
        aria-label="Drag to reorder"
      >
        <svg
          className="w-5 h-5 text-palm-green"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-700">{hobby}</span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="text-red-600 hover:text-red-800 text-sm font-medium px-1"
      >
        Remove
      </button>
    </div>
  );
};

const SortableLanguageItem = ({
  id,
  language,
  index,
  onRemove,
}: {
  id: string;
  language: Language;
  index: number;
  onRemove: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 mb-2 p-1.5 rounded-lg bg-tea-green/20 hover:bg-tea-green/50"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex items-center justify-center p-1 hover:bg-tea-green/70 rounded"
        aria-label="Drag to reorder"
      >
        <svg
          className="w-5 h-5 text-palm-green"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>
      <div className="flex-1 inline-flex gap-1">
        <span className="text-sm font-medium text-gray-700">{language.name}</span> 
        <span className="text-sm text-palm-green">•</span>
        <p className="text-sm text-gray-600 capitalize">
          {PROFICIENCY_LEVELS.find(p => p.value === language.proficiency)?.label || language.proficiency}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="text-red-600 hover:text-red-800 text-sm font-medium px-1"
      >
        Remove
      </button>
    </div>
  );
};

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
  const [hobbiesEntries, setHobbiesEntries] = useState<string[]>([]);
  const [newHobby, setNewHobby] = useState('');
  const [availableHobbies, setAvailableHobbies] = useState<string[]>([]);
  const [isHobbiesOpen, setIsHobbiesOpen] = useState(false);
  const [languagesEntries, setLanguagesEntries] = useState<Language[]>([]);
  const [newLanguage, setNewLanguage] = useState({ name: '', proficiency: '' });
  const [isLanguagesOpen, setIsLanguagesOpen] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for social media
  const handleSocialMediaDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSocialMediaEntries((items) => {
        const oldIndex = items.findIndex((_, index) => `social-media-${index}` === active.id);
        const newIndex = items.findIndex((_, index) => `social-media-${index}` === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Handle drag end for hobbies
  const handleHobbiesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setHobbiesEntries((items) => {
        const oldIndex = items.findIndex((_, index) => `hobby-${index}` === active.id);
        const newIndex = items.findIndex((_, index) => `hobby-${index}` === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Handle drag end for languages
  const handleLanguagesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLanguagesEntries((items) => {
        const oldIndex = items.findIndex((_, index) => `language-${index}` === active.id);
        const newIndex = items.findIndex((_, index) => `language-${index}` === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

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
          hobbies: data.hobbies || [],
          languages: data.languages || [],
          use_first_name: data.use_first_name ?? true,
          use_middle_name: data.use_middle_name ?? false,
          use_nick_name: data.use_nick_name ?? false,
        });
        setSocialMediaEntries(data.social_media || []);
        setPetsEntries(data.pets || []);
        setHobbiesEntries(data.hobbies || []);
        setLanguagesEntries(data.languages || []);
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
          hobbies: [],
          languages: [],
          use_first_name: true,
          use_middle_name: false,
          use_nick_name: false,
        });
        setSocialMediaEntries([]);
        setPetsEntries([]);
        setHobbiesEntries([]);
        setLanguagesEntries([]);
      }
    };

    fetchUserData();
    
    // Fetch all available hobbies
    const fetchAllHobbies = async () => {
      const hobbies = await getAllHobbies();
      setAvailableHobbies(hobbies);
    };
    fetchAllHobbies();
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
        userData?.hobbies || [],
        userData?.languages || [],
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
          userData?.hobbies || [],
          userData?.languages || [],
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

  const handleRemoveHobby = (index: number) => {
    setHobbiesEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddHobby = (hobbyValue?: string) => {
    const hobbyToAdd = (hobbyValue || newHobby).trim();
    if (hobbyToAdd && !hobbiesEntries.includes(hobbyToAdd)) {
      setHobbiesEntries(prev => [...prev, hobbyToAdd]);
      setNewHobby('');
      // Add to available hobbies if it's new
      if (!availableHobbies.includes(hobbyToAdd)) {
        setAvailableHobbies(prev => [...prev, hobbyToAdd].sort());
      }
    }
  };

  const handleRemoveLanguage = (index: number) => {
    setLanguagesEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddLanguage = () => {
    const languageName = newLanguage.name.trim();
    const proficiency = newLanguage.proficiency;
    if (languageName && proficiency) {
      // Check if language already exists (case-insensitive)
      const languageExists = languagesEntries.some(lang => 
        lang.name.toLowerCase() === languageName.toLowerCase()
      );
      
      if (!languageExists) {
        setLanguagesEntries(prev => [...prev, { name: languageName, proficiency }]);
        setNewLanguage({ name: '', proficiency: '' });
      } else {
        showToast('This language is already in your list.', 'error');
      }
    }
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
        hobbiesEntries,
        languagesEntries,
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
        hobbies: hobbiesEntries,
        languages: languagesEntries,
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
          <div className="rounded-lg mb-5">
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setIsSocialMediaOpen(!isSocialMediaOpen)}
              className="rounded-lg w-full px-2 py-3 bg-carrot-orange/10 hover:bg-carrot-orange/20 transition-colors flex items-center justify-between"
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
                <div className="rounded-lg mb-4">
                  {/* Existing Social Media Entries */}
                  {socialMediaEntries.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleSocialMediaDragEnd}
                    >
                      <SortableContext
                        items={socialMediaEntries.map((_, index) => `social-media-${index}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        {socialMediaEntries.map((entry, index) => (
                          <SortableSocialMediaItem
                            key={`social-media-${index}`}
                            id={`social-media-${index}`}
                            entry={entry}
                            index={index}
                            onRemove={() => handleRemoveSocialMedia(index)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
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
          <div className="rounded-lg mb-5">
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setIsPetsOpen(!isPetsOpen)}
              className="rounded-lg w-full px-2 py-3 bg-carrot-orange/10 hover:bg-carrot-orange/20 transition-colors flex items-center justify-between"
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
                <div className="rounded-lg mb-4">
                  {/* Existing Pet Entries */}
                  {petsEntries.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {petsEntries.map((pet, index) => (
                        <div key={index} className="flex-shrink-0 p-4 rounded-lg bg-tea-green/20 hover:bg-tea-green/30 min-h-[186px]">
                        {editingPetIndex === index ? (
                          /* Edit Mode */
                          <div className="space-y-4">
                            <div className="flex items-start gap-4">
                              {/* Pet Image */}
                              <div className="w-20 flex-shrink-0">
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
                                <div className="mt-2 flex flex-col gap-2">
                                  <input
                                    ref={(el) => {
                                      if (el) {
                                        petFileInputRefs.current.set(index, el);
                                      }
                                    }}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handlePetImageChange(index, e)}
                                    className="file-input file-input-bordered file-input-xs w-full text-xs"
                                    disabled={isUploading}
                                  />
                                  {(petImagePreviews.get(index) || (editingPet?.image && !removePetImage.has(index))) && (
                                    <button
                                      type="button"
                                      className="btn btn-xs bg-engineering-orange hover:bg-engineering-orange/90 border-none text-white w-full"
                                      onClick={() => handleClearPetImage(index)}
                                      disabled={isUploading}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              {/* Editable Pet Info */}
                              <div className="flex-1 space-y-3 mt-2">
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
                          <div className="flex flex-col items-center gap-2 h-full">
                            {/* Pet Image */}
                            <div className="flex-shrink-0">
                              {petImagePreviews.get(index) ? (
                                <div className="w-16 h-16 rounded-lg overflow-hidden">
                                  <Image 
                                    src={petImagePreviews.get(index)!}
                                    alt={pet.name}
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : pet.image ? (
                                <div className="w-16 h-16 rounded-lg overflow-hidden">
                                  <Image 
                                    src={getFullImageUrl(pet.image)}
                                    alt={pet.name}
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-lg bg-gray-300 flex items-center justify-center">
                                  <span className="icon-[mdi--paw] text-2xl text-gray-500" />
                                </div>
                              )}
                            </div>
                            
                            {/* Pet Info */}
                            <div className="w-full text-center flex-1">
                              <div className="mb-1">
                                <span className="text-sm font-medium text-gray-700">{pet.name}</span>
                              </div>
                              <div className="text-xs text-gray-600 space-y-0.5">
                                {pet.birthday && <p className="truncate">B: {formatBirthdayDisplay(pet.birthday)}</p>}
                                {pet.death_date && <p className="truncate">D: {formatBirthdayDisplay(pet.death_date)}</p>}
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2 w-full justify-center mt-auto">
                              <button
                                type="button"
                                onClick={() => handleEditPet(index)}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemovePet(index)}
                                className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      ))}
                    </div>
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
          
          {/* Hobbies Section */}
          <div className="rounded-lg mb-5">
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setIsHobbiesOpen(!isHobbiesOpen)}
              className="rounded-lg w-full px-2 py-3 bg-carrot-orange/10 hover:bg-carrot-orange/20 transition-colors flex items-center justify-between"
            >
              <h3 className="text-md font-medium text-gray-900">Hobbies</h3>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                  isHobbiesOpen ? 'transform rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Accordion Content */}
            {isHobbiesOpen && (
              <div className="p-4 border-t border-gray-200">
                <div className="rounded-lg mb-4">
                  {/* Existing Hobbies */}
                  {hobbiesEntries.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleHobbiesDragEnd}
                    >
                      <SortableContext
                        items={hobbiesEntries.map((_, index) => `hobby-${index}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        {hobbiesEntries.map((hobby, index) => (
                          <SortableHobbyItem
                            key={`hobby-${index}`}
                            id={`hobby-${index}`}
                            hobby={hobby}
                            index={index}
                            onRemove={() => handleRemoveHobby(index)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <p className="text-sm text-gray-500 py-2">No hobbies added yet.</p>
                  )}
                </div>
                
                {/* Add New Hobby */}
                <div className="">
                  <h4 className="text-md font-medium text-gray-900 mb-1.5">Add Hobby</h4>
                  <div className="mb-4 relative z-0 w-full group">
                    <input
                      type="text"
                      list="hobbies-list"
                      value={newHobby}
                      onChange={(e) => {
                        setNewHobby(e.target.value);
                      }}
                      onInput={(e) => {
                        // This fires when user selects from datalist
                        const value = (e.target as HTMLInputElement).value.trim();
                        if (value && availableHobbies.includes(value) && !hobbiesEntries.includes(value)) {
                          // Small delay to ensure state is updated
                          setTimeout(() => {
                            handleAddHobby(value);
                          }, 50);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddHobby();
                        }
                      }}
                      onBlur={(e) => {
                        // Add hobby when user leaves the field with a value (for manually typed hobbies)
                        const trimmedValue = e.target.value.trim();
                        if (trimmedValue && !hobbiesEntries.includes(trimmedValue)) {
                          handleAddHobby();
                        }
                      }}
                      className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                      placeholder=" "
                    />
                    <datalist id="hobbies-list">
                      {availableHobbies.map((hobby) => (
                        <option key={hobby} value={hobby} />
                      ))}
                    </datalist>
                    <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                      Hobby (Type or select from existing, press Enter to add)
                    </label>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {newHobby && !availableHobbies.includes(newHobby.trim()) && (
                      <span className="text-blue-600">This will create a new hobby.</span>
                    )}
                    {newHobby && hobbiesEntries.includes(newHobby.trim()) && (
                      <span className="text-orange-600">This hobby is already in your list.</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Languages Section */}
          <div className="rounded-lg mb-5">
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setIsLanguagesOpen(!isLanguagesOpen)}
              className="rounded-lg w-full px-2 py-3 bg-carrot-orange/10 hover:bg-carrot-orange/20 transition-colors flex items-center justify-between"
            >
              <h3 className="text-md font-medium text-gray-900">Languages</h3>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                  isLanguagesOpen ? 'transform rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Accordion Content */}
            {isLanguagesOpen && (
              <div className="p-4 border-t border-gray-200">
                <div className="rounded-lg mb-4">
                  {/* Existing Languages */}
                  {languagesEntries.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleLanguagesDragEnd}
                    >
                      <SortableContext
                        items={languagesEntries.map((_, index) => `language-${index}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        {languagesEntries.map((language, index) => (
                          <SortableLanguageItem
                            key={`language-${index}`}
                            id={`language-${index}`}
                            language={language}
                            index={index}
                            onRemove={() => handleRemoveLanguage(index)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <p className="text-sm text-gray-500 py-2">No languages added yet.</p>
                  )}
                </div>
                
                {/* Add New Language */}
                <div className="">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Add Language</h4>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="relative z-0 w-full group self-end">
                      <CreatableSelect
                        value={newLanguage.name ? { value: newLanguage.name, label: newLanguage.name } : null}
                        onChange={(selectedOption) => {
                          const languageName = selectedOption?.value || '';
                          setNewLanguage(prev => ({ ...prev, name: languageName }));
                        }}
                        onCreateOption={(inputValue) => {
                          setNewLanguage(prev => ({ ...prev, name: inputValue.trim() }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newLanguage.name.trim() && newLanguage.proficiency) {
                            e.preventDefault();
                            handleAddLanguage();
                          }
                        }}
                        options={COMMON_LANGUAGES}
                        placeholder="Type or select a language"
                        isClearable
                        isSearchable
                        formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
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
                            '&:focus-within': {
                              borderBottom: '2px solid #3b82f6',
                            },
                          }),
                          placeholder: (provided) => ({
                            ...provided,
                            color: '#9ca3af',
                            fontSize: '14px',
                          }),
                          input: (provided) => ({
                            ...provided,
                            margin: '0',
                            paddingBottom: '0',
                            paddingTop: '0',
                          }),
                        }}
                      />
                      <label className="peer-focus:font-medium absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-2 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                        Language (Type or select, press Enter to add)
                      </label>
                    </div>
                    <div className="relative z-0 w-full group self-end">
                      <Select
                        value={PROFICIENCY_LEVELS.find(option => option.value === newLanguage.proficiency) || null}
                        onChange={(selectedOption) => {
                          const proficiency = selectedOption?.value || '';
                          setNewLanguage(prev => ({ ...prev, proficiency }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newLanguage.name.trim() && newLanguage.proficiency) {
                            e.preventDefault();
                            handleAddLanguage();
                          }
                        }}
                        options={PROFICIENCY_LEVELS}
                        placeholder="Select proficiency"
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
                        Proficiency Level (Press Enter to add)
                      </label>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {newLanguage.name && newLanguage.proficiency && languagesEntries.some(lang => lang.name.toLowerCase() === newLanguage.name.trim().toLowerCase()) && (
                      <span className="text-orange-600">This language is already in your list.</span>
                    )}
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