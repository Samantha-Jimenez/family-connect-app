import { useAuth } from '@/context/AuthContext';
import { getUserData, setUserCTAVisible } from '@/hooks/dynamoDB';
import { useAuthenticator } from '@aws-amplify/ui-react';
import React, { useEffect, useState } from 'react'

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
  cta_visible?: boolean;
}

const REQUIRED_FIELDS: (keyof UserData)[] = [
  'first_name',
  'last_name',
  'email',
  'username',
  'bio',
  'phone_number',
  'birthday',
  'birth_city',
  'birth_state',
  'profile_photo',
  'current_city',
  'current_state',
];

const FIELD_LABELS: Record<keyof UserData, string> = {
  first_name: 'first name',
  last_name: 'last name',
  email: 'email',
  username: 'username',
  bio: 'bio',
  phone_number: 'phone number',
  birthday: 'birthday',
  birth_city: 'birth city',
  birth_state: 'birth state',
  profile_photo: 'profile photo',
  current_city: 'current city',
  current_state: 'current state',
  cta_visible: 'call to action visible',
};

const CallToAction = () => {
  const { authStatus } = useAuth();
  const { user } = useAuthenticator((context) => [context.user]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const data = await getUserData(user.userId);
      if (data) {
        setUserData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          username: data.username || '',
          bio: data.bio || '',
          phone_number: data.phone_number || '',
          birthday: data.birthday || '',
          birth_city: data.birth_city || '',
          birth_state: data.birth_state || '',
          profile_photo: data.profile_photo || '',
          current_city: data.current_city || '',
          current_state: data.current_state || '',
          cta_visible: data.cta_visible,
        });
      }
    };

    fetchUserData();
  }, [user]);

  // Wait for userData to load
  if (!userData || !visible || userData.cta_visible === false) return null;

  // Find missing required fields
  const missingFields = REQUIRED_FIELDS.filter(
    (field) => !userData[field] || userData[field].toString().trim() === ''
  );

  if (missingFields.length === 0) return null;

  // Format missing fields for display
  const missingLabels = missingFields.map((field) => FIELD_LABELS[field]);
  const last = missingLabels.pop();
  const missingText =
    missingLabels.length > 0
      ? `${missingLabels.join(', ')} and ${last}`
      : last;

  const handleDismiss = async () => {
    setVisible(false);
    try {
      await setUserCTAVisible(user.userId, false);
    } catch (e) {
      // Optionally handle error
      console.error("Failed to update CTA visibility", e);
    }
  };

  return (
    <div className="col-span-1 sm:col-span-2">
      <div className="relative bg-yellow-300/10 rounded-lg py-4 pl-4 pr-[5.75rem] text-stone-700 shadow-lg">
        <button
          className="
            group
            absolute top-3 right-4
            flex items-center justify-end
            text-gray-400 hover:text-gray-700 text-xl font-bold
            rounded-full
            transition-all duration-700
            bg-transparent
            hover:bg-gray-400
            hover:text-red-500
            px-2
            overflow-hidden
            min-w-[2.5rem]
            "
          aria-label="Close"
          onClick={handleDismiss}
          style={{ minWidth: '2.5rem' }}
        >
          <span
            className="
              pointer-events-none
              mr-1
              opacity-0
              translate-x-14
              group-hover:opacity-100
              group-hover:translate-x-0
              transition-all duration-700
              text-base text-gray-500
              whitespace-nowrap
              select-none
              text-sm
              leading-7
              -translate-y-0
              font-normal
              text-white
            "
          >
            dismiss
          </span>
          &times;
        </button>
        <p className="font-medium source-sans-3 italic">
          You're just a few details away from a complete profile—finish filling out your {missingText}!
        </p>
      </div>
    </div>
  );
};

export default CallToAction