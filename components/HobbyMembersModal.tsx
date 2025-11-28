"use client";
import React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { getFullImageUrl } from '@/utils/imageUtils';

interface HobbyMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  hobby: string;
  members: Array<{ id: string; name: string; profile_photo?: string }>;
}

const HobbyMembersModal: React.FC<HobbyMembersModalProps> = ({
  isOpen,
  onClose,
  hobby,
  members,
}) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-11/12 m-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-black dark:text-white">Family Members with {hobby}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none top-[-1rem] right-[-0.75rem] relative font-light"
          >
            ×
          </button>
        </div>

        <div className="text-gray-800 dark:text-gray-200">
          {members.length > 0 ? (
            <ul className="space-y-3">
              {members.map((member) => (
                <li key={member.id} className="flex items-center gap-3">
                  <Link 
                    href={`/profile/${member.id}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    onClick={onClose}
                  >
                    {member.profile_photo ? (
                      <div className="avatar">
                        <div className="w-12 h-12 rounded-full overflow-hidden">
                          <Image
                            src={getFullImageUrl(member.profile_photo)}
                            alt={member.name}
                            width={48}
                            height={48}
                            className="object-cover"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="avatar">
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="icon-[mdi--account] text-2xl text-gray-400" />
                        </div>
                      </div>
                    )}
                    <span className="text-plantain-green hover:underline font-medium">
                      {member.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No other family members have this hobby.</p>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-sm bg-golden-sand text-black border-0 hover:bg-golden-sand/70"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default HobbyMembersModal;

