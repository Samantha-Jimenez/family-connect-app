import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { getUserData } from '@/hooks/dynamoDB';
import { getFullImageUrl } from '@/utils/imageUtils';

interface Pet {
  name: string;
  birthday: string;
  death_date?: string;
  image?: string;
}

const PetsCard = ({ userId }: { userId: string }) => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (!birthday) return 'Not set';
    const parsed = parseBirthdayString(birthday);
    if (!parsed.year || !parsed.month) return birthday;
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIndex = parseInt(parsed.month) - 1;
    const monthName = monthIndex >= 0 && monthIndex < 12 ? monthNames[monthIndex] : parsed.month;
    
    if (parsed.day) {
      return `${monthName} ${parsed.day}, ${parsed.year}`;
    }
    return `${monthName} ${parsed.year}`;
  };

  const calculateAge = (birthday: string, deathDate?: string): string => {
    if (!birthday) return 'Age unknown';
    
    const parsedBirthday = parseBirthdayString(birthday);
    if (!parsedBirthday.year) return 'Age unknown';
    
    // Use death date if provided, otherwise use today
    const endDate = deathDate ? parseBirthdayString(deathDate) : null;
    const today = new Date();
    
    const birthYear = parseInt(parsedBirthday.year);
    const endYear = endDate && endDate.year ? parseInt(endDate.year) : today.getFullYear();
    
    // Calculate years
    let years = endYear - birthYear;
    
    // If we have month information, adjust for whether the birthday month has passed
    if (parsedBirthday.month) {
      const birthMonth = parseInt(parsedBirthday.month) - 1; // JavaScript months are 0-indexed
      const endMonth = endDate && endDate.month ? parseInt(endDate.month) - 1 : today.getMonth();
      
      // If the end month is before the birth month, subtract a year
      if (endMonth < birthMonth) {
        years--;
      } else if (endMonth === birthMonth && parsedBirthday.day) {
        // If same month, check the day
        const birthDay = parseInt(parsedBirthday.day);
        const endDay = endDate && endDate.day ? parseInt(endDate.day) : today.getDate();
        if (endDay < birthDay) {
          years--;
        }
      }
    }
    
    // Format the age string
    if (years <= 0) {
      return 'Less than 1 year old';
    }
    return `${years} ${years === 1 ? 'year' : 'years'} old`;
  };

  useEffect(() => {
    const fetchPets = async () => {
      setLoading(true);
      try {
        const userData = await getUserData(userId);
        if (userData && userData.pets) {
          setPets(userData.pets);
        } else {
          setPets([]);
        }
      } catch (error) {
        console.error('Error fetching pets:', error);
        setPets([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPets();
  }, [userId]);

  if (loading) {
    return null;
  }

  if (!pets || pets.length === 0) {
    return null;
  }

  return (
    <div className="card text-black p-6">
      {/* <h2 className="text-xl font-medium mb-4">Pets</h2> */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pets.map((pet, index) => (
          <div key={`${pet.name}-${index}`} className="text-black">
            <div className="flex items-start gap-4">
              {/* Pet Image */}
              <div className="flex-shrink-0">
                {pet.image ? (
                  <div className="w-20 h-20 avatar rounded-full overflow-hidden shadow-xl">
                    <Image 
                      src={getFullImageUrl(pet.image)}
                      alt={pet.name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 avatar rounded-full bg-gray-200 flex items-center justify-center shadow-lg">
                    <span className="icon-[mdi--paw] text-3xl text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* Pet Info */}
              <div className="flex-1 min-w-0 self-center">
                <h3 className="text-lg font-medium">{pet.name}</h3>
                <div className="text-sm text-gray-600">
                  <p>
                    {formatBirthdayDisplay(pet.birthday)}
                    {pet.death_date && (
                      <span className="source-sans-3"> - {formatBirthdayDisplay(pet.death_date)}</span>
                    )}
                  </p>
                  <p>
                    {pet.death_date && (
                      <span className="source-sans-3">RIP 🕊️ </span>
                    )}
                    {calculateAge(pet.birthday, pet.death_date)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PetsCard;