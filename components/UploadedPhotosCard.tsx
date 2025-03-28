"use client";

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import Image from 'next/image';
import PhotoModal from '@/components/PhotoModal';

interface Photo {
  photo_id: string;
  s3_key: string;
  uploaded_by: string;
  upload_date: string;
  url?: string;
}

export default function UploadedPhotosCard() {
  const [userPhotos, setUserPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [uploaderName, setUploaderName] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    fetchUserPhotos();
    fetchCurrentUserId();
  }, []);

  const fetchCurrentUserId = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUserId(user.userId);
    } catch (error) {
      console.error('Error fetching current user ID:', error);
    }
  };

  const fetchUserPhotos = async () => {
    try {
      const user = await getCurrentUser();
      if (!user?.userId) {
        throw new Error("User not authenticated");
      }

      const response = await fetch('/api/photos');
      const data = await response.json();
      
      // Simplified filtering - just check the uploaded_by field
      const filteredPhotos = data.photos.filter((photo: Photo) => 
        photo.uploaded_by === user.userId
      );

      setUserPhotos(filteredPhotos);
    } catch (error) {
      console.error("Error fetching user photos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (photo: Photo) => {
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
        <h2 className="text-xl font-bold">Uploaded Photos</h2>
        <p className="mt-2">Loading your photos...</p>
      </div>
    );
  }

  return (
    <div className="card bg-white text-black shadow-lg p-6">
      <h2 className="text-xl font-bold">Uploaded Photos</h2>
      <p className="mt-2 italic">Photos you've uploaded ({userPhotos.length})</p>
      
      <div className="mt-4 grid grid-cols-3 gap-2">
        {userPhotos.slice(0, 6).map((photo, index) => (
          <div key={photo.photo_id} className="relative aspect-square" onClick={() => handleImageClick(photo)}>
            <Image
              src={photo.url || ''}
              alt={`Photo ${index + 1}`}
              fill
              className="object-cover rounded"
              sizes="(max-width: 768px) 33vw, 20vw"
              priority={true}
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