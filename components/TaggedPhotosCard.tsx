"use client";
import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import Image from 'next/image';
import { getUserData, PhotoData, TaggedPerson } from '@/hooks/dynamoDB';
import PhotoModal from '@/components/PhotoModal';
import LoadSpinner from '@/components/LoadSpinner';


export default function TaggedPhotosCard({ userId }: { userId: string }) {
  const [taggedPhotos, setTaggedPhotos] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [uploaderName, setUploaderName] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    fetchTaggedPhotos();
    fetchCurrentUserId();
  }, []);

  const fetchCurrentUserId = async () => {
    try {
      setCurrentUserId(userId);
    } catch (error) {
      console.error('Error fetching current user ID:', error);
    }
  };

  const fetchTaggedPhotos = async () => {
    try {
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const response = await fetch('/api/photos');
      const data = await response.json();
      // Filter photos where the current user is tagged
      const filteredPhotos = data.photos.filter((photo: PhotoData) => {
        return photo.metadata?.people_tagged?.some((person: TaggedPerson) => person.id === userId);
      });
      setTaggedPhotos(filteredPhotos);
    } catch (error) {
      console.error("Error fetching tagged photos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (photo: PhotoData) => {
    setSelectedPhoto(photo);
    fetchUploaderName(photo.uploaded_by);
  };

  const fetchUploaderName = async (userId: string) => {
    try {
      const userDetails = await getUserData(userId);
      if (userDetails) {
        setUploaderName(`${userDetails.first_name} ${userDetails.last_name}`);
      } else {
        setUploaderName('Unknown User');
      }
    } catch (error) {
      console.error('Error fetching uploader details:', error);
      setUploaderName('Unknown User');
    }
  };

  const closeModal = () => {
    setSelectedPhoto(null);
  };

  const handleImageError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    console.error('Error loading image:', e.currentTarget.src);
  };

  const renderEditForm = () => {
    // Implement the form rendering logic if needed
    return <div>Edit form goes here</div>;
  };

  if (loading) {
    return (
      <div className="card bg-white text-black shadow-lg p-6">
        <h2 className="text-xl font-bold">Tagged Photos</h2>
        <div className="flex justify-center items-center py-8">
          <LoadSpinner size={48} />
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-white text-black shadow-lg p-6">
      <h2 className="text-xl">Tagged Photos <span className="text-sm text-gray-500">({taggedPhotos.length})</span></h2>
      {/* <p className="mt-2 italic">Photos you&apos;re tagged in ({taggedPhotos.length})</p> */}
      
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
        {taggedPhotos.map((photo, index) => (
          <div key={photo.photo_id} className="relative aspect-square" onClick={() => handleImageClick(photo)}>
            <Image
              src={photo.url || ''}
              alt={`Tagged Photo ${index + 1}`}
              fill
              className="object-cover rounded"
              sizes="(max-width: 768px) 33vw, 20vw"
            />
          </div>
        ))}
      </div>

      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          uploaderName={uploaderName}
          currentUserId={currentUserId}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          closeModal={closeModal}
          handleImageError={handleImageError}
          renderEditForm={renderEditForm}
        />
      )}
    </div>
  );
}