"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import PhotoModal from '@/components/PhotoModal';
import { getUserData, PhotoData } from '@/hooks/dynamoDB';

export default function UploadedPhotosCard({ userId }: { userId: string }) {
  const [userPhotos, setUserPhotos] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [uploaderName, setUploaderName] = useState<string | null>(null);
  // const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    fetchUserPhotos();
    // fetchCurrentUserId();
  }, []);

  // const fetchCurrentUserId = async () => {
  //   try {
  //     const user = await getCurrentUser();
  //     setCurrentUserId(user.userId);
  //   } catch (error) {
  //     console.error('Error fetching current user ID:', error);
  //   }
  // };

  const fetchUserPhotos = async () => {
    try {
      // const user = await getCurrentUser();
      // if (!user?.userId) {
      //   throw new Error("User not authenticated");
      // }

      const response = await fetch('/api/photos');
      const data = await response.json();
      
      // Simplified filtering - just check the uploaded_by field
      const filteredPhotos = data.photos.filter((photo: PhotoData) => 
        photo.uploaded_by === userId
      );

      setUserPhotos(filteredPhotos);
    } catch (error) {
      console.error("Error fetching user photos:", error);
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

  // Expose a handler for when a photo is deleted
  const handlePhotoDeleted = () => {
    fetchUserPhotos();
    setSelectedPhoto(null); // Also close the modal after deletion
  };

  if (loading) {
    return (
      <div className="card bg-white text-black shadow-lg p-6">
        <h2 className="text-xl font-bold">Uploaded Photos</h2>
        <p className="mt-2">Loading photos...</p>
      </div>
    );
  }

  return (
    <div className="card bg-white text-black shadow-lg p-6">
      <h2 className="text-xl">Uploaded Photos <span className="text-sm text-gray-500">({userPhotos.length})</span></h2>
      {/* <p className="mt-2 italic">Photos uploaded ({userPhotos.length})</p> */}
      
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
        {userPhotos
          .slice()
          .sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())
          .map((photo, index) => (
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
          currentUserId={userId}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          closeModal={closeModal}
          handleImageError={handleImageError}
          renderEditForm={renderEditForm}
          onPhotoDeleted={handlePhotoDeleted}
        />
      )}
    </div>
  );
}