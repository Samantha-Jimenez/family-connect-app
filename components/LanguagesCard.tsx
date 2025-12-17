import React, { useEffect, useState } from 'react';
import { getUserData } from '@/hooks/dynamoDB';

interface Language {
  name: string;
  proficiency: string;
}

const PROFICIENCY_LABELS: Record<string, string> = {
  'beginner': 'Beginner',
  'intermediate': 'Intermediate',
  'advanced': 'Advanced',
  'native': 'Native/Fluent'
};

const LanguagesCard = ({ userId }: { userId: string }) => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLanguages = async () => {
      setLoading(true);
      try {
        const userData = await getUserData(userId);
        if (userData && userData.languages) {
          setLanguages(userData.languages);
        } else {
          setLanguages([]);
        }
      } catch (error) {
        console.error('Error fetching languages:', error);
        setLanguages([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLanguages();
  }, [userId]);

  if (loading) {
    return null;
  }

  if (!languages || languages.length === 0) {
    return null;
  }

  return (
    <div className="card text-black p-4 bg-[#C8D5B9]/20 shadow-lg">
      <h2 className="text-xl font-medium mb-3">Languages</h2>
      <div className="flex flex-col gap-1">
        {languages.map((language, index) => (
          <div
            key={`${language.name}-${index}`}
            className="flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-[#C8D5B9]/30 transition-colors"
          >
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-black dark:text-white">
                {language.name}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                {PROFICIENCY_LABELS[language.proficiency] || language.proficiency}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Proficiency indicator */}
              <div className="flex gap-1">
                {['beginner', 'intermediate', 'advanced', 'native'].map((level, levelIndex) => {
                  const isActive = ['beginner', 'intermediate', 'advanced', 'native']
                    .indexOf(language.proficiency) >= levelIndex;
                  
                  let colorClass = 'bg-gray-200 dark:bg-gray-700';
                  if (isActive) {
                    switch (language.proficiency) {
                      case 'beginner':
                        colorClass = 'bg-blue-400';
                        break;
                      case 'intermediate':
                        colorClass = 'bg-yellow-400';
                        break;
                      case 'advanced':
                        colorClass = 'bg-orange-400';
                        break;
                      case 'native':
                        colorClass = 'bg-green-400';
                        break;
                    }
                  }
                  
                  return (
                    <div
                      key={level}
                      className={`w-1 h-3 rounded-full transition-colors ${colorClass}`}
                      aria-hidden="true"
                    />
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LanguagesCard;
