import React, { MouseEvent } from 'react';
import Image from 'next/image';
import { PhotoData, TaggedPerson } from '@/hooks/dynamoDB';

interface PhotoModalProps {
  photo: PhotoData;
  uploaderName: string | null;
  currentUserId: string | null;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  closeModal: () => void;
  handleImageError: React.ReactEventHandler<HTMLImageElement>;
  renderEditForm: () => JSX.Element;
}

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

const PhotoModal: React.FC<PhotoModalProps> = ({
  photo,
  uploaderName,
  currentUserId,
  isEditing,
  setIsEditing,
  closeModal,
  handleImageError,
  renderEditForm
}) => {
  const handleModalClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeModal}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full m-4" onClick={handleModalClick}>
        <div className="relative mb-4">
          <Image
            src={photo.url || '/fallback-image.jpg'}
            alt="Selected photo"
            width={500}
            height={300}
            className="object-contain rounded-lg"
            onError={handleImageError}
          />
        </div>
        <div className="space-y-2">
          {isEditing ? renderEditForm() : (
            <>
              {photo.metadata?.location && typeof photo.metadata.location === 'object' && Object.values(photo.metadata.location).some(val => val) && (
                <div className="text-sm text-gray-800 dark:text-gray-200">
                  <span className="font-bold">Location: </span>
                  {[
                    photo.metadata.location.country,
                    photo.metadata.location.state,
                    photo.metadata.location.city,
                    photo.metadata.location.neighborhood
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              )}
              {photo.metadata?.description && (
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <span className="font-bold">Description: </span>
                  {photo.metadata?.description}
                </p>
              )}
              {photo.metadata?.date_taken && (
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <span className="font-bold">Date Taken: </span>
                  {formatDate(photo.metadata?.date_taken || '')}
                </p>
              )}
              {photo.metadata?.people_tagged && photo.metadata.people_tagged.length > 0 && (
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <span className="font-bold">People Tagged: </span>
                  {photo.metadata.people_tagged.map((person, index) => (
                    <React.Fragment key={person.id}>
                      {index > 0 && ', '}
                      <a 
                        href={`/profile/${person.id}`} 
                        className="text-blue-500 hover:underline"
                      >
                        {person.name}
                      </a>
                    </React.Fragment>
                  ))}
                </p>
              )}
              {uploaderName && (
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <span className="font-bold">Uploaded By: </span>
                  <a 
                    href={`/profile/${photo?.uploaded_by}`} 
                    className="text-blue-500 hover:underline"
                  >
                    {uploaderName}
                  </a>
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex justify-end space-x-2">
          {currentUserId === photo?.uploaded_by && (
            <button
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>
          )}
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={closeModal}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoModal; 