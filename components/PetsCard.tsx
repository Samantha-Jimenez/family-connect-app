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

const parseBirthdayString = (birthday: string): { year: string; month: string; day: string } => {
  if (!birthday) return { year: '', month: '', day: '' };
  const parts = birthday.split('-');
  return {
    year: parts[0] || '',
    month: parts[1] || '',
    day: parts[2] || ''
  };
};

const sortPets = (pets: Pet[]): Pet[] => {
  // Convert date string to comparable number (YYYYMM or YYYYMMDD)
  const dateToNumber = (dateStr: string): number => {
    const parsed = parseBirthdayString(dateStr);
    if (!parsed.year) return 0;
    const year = parseInt(parsed.year);
    // If no month, treat as beginning of year (month 1, day 1) for sorting
    // This ensures year-only dates are sorted correctly by year
    const month = parsed.month ? parseInt(parsed.month) : 1;
    const day = parsed.day ? parseInt(parsed.day) : 1;
    // Format: YYYYMMDD
    return year * 10000 + month * 100 + day;
  };

  // Separate dead and alive pets
  const deadPets = pets.filter(pet => pet.death_date);
  const alivePets = pets.filter(pet => !pet.death_date);

  // Sort dead pets by death_date descending (latest first)
  deadPets.sort((a, b) => {
    const dateA = dateToNumber(a.death_date || '');
    const dateB = dateToNumber(b.death_date || '');
    return dateB - dateA; // Descending order
  });

  // Sort alive pets by birthday ascending (earliest first)
  alivePets.sort((a, b) => {
    const dateA = dateToNumber(a.birthday);
    const dateB = dateToNumber(b.birthday);
    return dateA - dateB; // Ascending order (oldest first)
  });

  // Combine: dead pets first, then alive pets
  return [...deadPets, ...alivePets];
};

const PetsCard = ({ userId }: { userId: string }) => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPetIndex, setHoveredPetIndex] = useState<number | null>(null);
  const [showOverflowList, setShowOverflowList] = useState(false);

  const extraPets = pets.slice(6);

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

  const calculateAge = (birthday: string, deathDate?: string): string => {
    if (!birthday) return '';
    
    const parsedBirthday = parseBirthdayString(birthday);
    if (!parsedBirthday.year) return '';
    
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
    // If only year is provided, we can't adjust for month/day, so just use the year difference
    
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
          const sortedPets = sortPets(userData.pets);
          setPets(sortedPets);
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
      <h2 className="text-xl font-medium mb-7">Pets</h2>
      <div className="flex flex-col items-start gap-4">
        {/* Grouped Pet Avatars */}
        <div className="flex flex-col items-start">
          <div className="flex -space-x-3">
            {pets.slice(0, 6).map((pet, index) => {
              const isDeceased = !!pet.death_date;
              const hoverRingClass = isDeceased 
                ? 'group-hover:ring-gray-400' 
                : 'group-hover:ring-plantain-green';
              
              return (
                <div
                  key={`${pet.name}-${index}`}
                  className="group relative inline-block opacity-0 animate-pet-stack"
                  style={{ animationDelay: `${index * 70}ms` }}
                  onMouseEnter={() => setHoveredPetIndex(index)}
                  onMouseLeave={() => setHoveredPetIndex(null)}
                >
                  {pet.image ? (
                    <div className={`w-16 h-16 rounded-full overflow-hidden ring-2 ring-offset-2 ring-white dark:ring-gray-800 bg-gray-100 dark:bg-gray-700 transition-[transform,box-shadow,filter,border-color] duration-200 ease-out group-hover:-translate-y-2 group-hover:scale-150 ${hoverRingClass} group-hover:shadow-xl shadow-md`}>
                      <Image 
                        src={getFullImageUrl(pet.image)}
                        alt={pet.name}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className={`w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center ring-2 ring-offset-2 ring-white dark:ring-gray-800 transition-[transform,box-shadow,filter,border-color] duration-200 ease-out group-hover:-translate-y-2 group-hover:scale-150 ${hoverRingClass} group-hover:shadow-xl shadow-md`}>
                      <span className="icon-[mdi--paw] text-2xl text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                  <span className="sr-only">{pet.name}</span>
                </div>
              );
            })}
            {pets.length > 6 && (
              <div 
                className="relative inline-block opacity-0 animate-pet-stack"
                style={{ animationDelay: `${6 * 70}ms` }}
                onMouseEnter={() => setShowOverflowList(true)}
                onMouseLeave={() => setShowOverflowList(false)}
              >
                <button
                  type="button"
                  className="w-16 h-16 rounded-full bg-plantain-green/20 text-plantain-green flex items-center justify-center text-sm font-semibold ring-2 ring-white dark:ring-gray-800 shadow-md transition-[transform,box-shadow,filter,border-color] duration-200 ease-out hover:-translate-y-2 hover:scale-150 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-plantain-green/50"
                  onClick={() => setShowOverflowList(prev => !prev)}
                  aria-expanded={showOverflowList}
                  aria-label={`Show ${pets.length - 6} more pets`}
                >
                  +{pets.length - 6}
                </button>
                {showOverflowList && (
                  <div className="absolute left-1/2 -translate-x-1/2 mt-3 min-w-[12rem] rounded-xl border border-black/5 dark:border-white/10 bg-white/90 dark:bg-gray-800/90 backdrop-blur shadow-2xl p-3 z-10 animate-pet-info">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">More pets</div>
                    <div className="flex flex-col gap-2">
                      {extraPets.map((pet, extraIndex) => (
                        <div key={`${pet.name}-extra-${extraIndex}`} className="flex items-start justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-black dark:text-white">{pet.name}</span>
                            <span className="text-xs text-gray-600 dark:text-gray-300">{calculateAge(pet.birthday, pet.death_date)}</span>
                          </div>
                          {pet.death_date && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">In memory</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Pet info display on hover */}
          <div className="relative mt-2 h-4 w-full">
            {hoveredPetIndex !== null && pets[hoveredPetIndex] ? (
              <div
                key={hoveredPetIndex}
                className="pet-info-float absolute inline-flex flex-col items-start gap-0.5 px-1 py-1.5 rounded-lg text-black"
              >
                <span className="text-sm font-semibold tracking-wide whitespace-nowrap drop-shadow-sm">
                  {pets[hoveredPetIndex].name}
                </span>
                <div className="text-xs font-medium opacity-90 whitespace-nowrap">
                  {pets[hoveredPetIndex].death_date && (
                    <span>RIP 🕊️ </span>
                  )}
                  {calculateAge(pets[hoveredPetIndex].birthday, pets[hoveredPetIndex].death_date)}
                </div>
              </div>
            ) : (
              <div className="absolute h-full w-36 rounded-lg" aria-hidden />
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        .pet-info-float {
          animation: petInfoFloat 300ms ease-out;
        }

        .animate-pet-stack {
          animation: petStackReveal 200ms ease-out forwards;
        }

        @keyframes petStackReveal {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.92);
            filter: blur(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes petInfoFloat {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.95);
            filter: blur(3px);
          }
          55% {
            opacity: 1;
            transform: translateY(-4px) scale(1.03);
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
      `}</style>
    </div>
  );
};

export default PetsCard;
