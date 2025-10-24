import React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

interface FamilyRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  relationshipType: string;
  relatedUserNames: string[];
  relatedUserIds: string[];
}

const FamilyRoleModal: React.FC<FamilyRoleModalProps> = ({
  isOpen,
  onClose,
  userName,
  relationshipType,
  relatedUserNames,
  relatedUserIds,
}) => {
  // Helper function to format relationship type for display
  const formatRelationshipType = (type: string): string => {
    return type
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-11/12 m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-black dark:text-white">Family Role</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none top-[-1rem] right-[-0.75rem] relative font-light"
          >
            ×
          </button>
        </div>

        <div className="text-gray-800 dark:text-gray-200">
          <p className="mb-4">
            <span className="font-semibold">{userName}</span> is a{' '}
            <span className="font-semibold text-yellow-700 dark:text-yellow-500">
              {formatRelationshipType(relationshipType)}
            </span>{' '}
            to:
          </p>

          <ul className="space-y-1 ml-2">
            {relatedUserNames.map((name, index) => (
              <li key={index} className="text-gray-700 dark:text-gray-300 ml-4">
                <Link 
                  href={`/profile/${relatedUserIds[index]}`}
                  className="text-plantain-green hover:underline"
                  onClick={onClose}
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>
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

export default FamilyRoleModal;

