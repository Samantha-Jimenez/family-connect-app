import { useAuth } from '@/context/AuthContext';
import { getUserData } from '@/hooks/dynamoDB';
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
          profile_photo: data.profile_photo || undefined,
          current_city: data.current_city || undefined,
          current_state: data.current_state || undefined,
        });
      }
    };

    fetchUserData();
  }, [user]);

  // Wait for userData to load
  if (!userData || !visible) return null;

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

  return (
    <div className="relative bg-white rounded-lg py-4 pl-4 pr-7 text-stone-700 shadow-lg">
      <button
        className="absolute top-3 right-4 text-gray-400 hover:text-gray-700 text-xl font-bold focus:outline-none"
        aria-label="Close"
        onClick={() => setVisible(false)}
      >
        &times;
      </button>
      <p className="font-semibold">
        You're just a few details away from a complete profile—finish filling out your {missingText}!
      </p>
    </div>
  );
};

export default CallToAction