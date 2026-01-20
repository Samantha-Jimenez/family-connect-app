"use client";
import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import Image from 'next/image';
import { getUserData, PhotoData, TaggedPerson, getUserNameById } from '@/hooks/dynamoDB';
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
  }, [userId]);

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

      // Get the current user's Cognito ID for family group filtering
      // The userId prop is a family_member_id, but we need the Cognito user ID for the API's userId parameter
      let currentUserCognitoId = '';
      try {
        const user = await getCurrentUser();
        currentUserCognitoId = user?.userId || '';
      } catch (error) {
        console.error('Error getting current user:', error);
      }

      // Use the current user's Cognito ID for userId (family group filtering)
      // Use the passed userId (family_member_id) for taggedUserId (to find photos where this member is tagged)
      const url = `/api/photos?userId=${encodeURIComponent(currentUserCognitoId)}&taggedUserId=${encodeURIComponent(userId)}`;
      console.log('🔍 TaggedPhotosCard - Fetching tagged photos for family_member_id:', userId);
      console.log('🔍 TaggedPhotosCard - Using current user Cognito ID for family group:', currentUserCognitoId);
      console.log('🔍 TaggedPhotosCard - API URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('🔍 TaggedPhotosCard - API response photos count:', data.photos?.length || 0);
      
      // The API already filters photos by taggedUserId, so we can use the photos directly
      setTaggedPhotos(data.photos || []);
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
      const userName = await getUserNameById(userId);
      if (userName) {
        setUploaderName(`${userName.firstName} ${userName.lastName}`);
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

  // Handler to update photo data after editing
  const handlePhotoUpdated = (updatedPhoto: PhotoData) => {
    // Check if current user is still tagged in the photo
    const isStillTagged = updatedPhoto.metadata?.people_tagged?.some(
      (person: TaggedPerson) => person.id === userId
    );

    if (!isStillTagged) {
      // Remove the photo from the taggedPhotos array if user is no longer tagged
      setTaggedPhotos(prevPhotos => 
        prevPhotos.filter(photo => photo.photo_id !== updatedPhoto.photo_id)
      );
      // Keep the modal open but update the selected photo so changes are reflected
      setSelectedPhoto(updatedPhoto);
    } else {
      // Update the photo in the taggedPhotos array
      setTaggedPhotos(prevPhotos => 
        prevPhotos.map(photo => 
          photo.photo_id === updatedPhoto.photo_id ? updatedPhoto : photo
        )
      );
      // Update the selected photo so modal reflects changes
      setSelectedPhoto(updatedPhoto);
    }
  };

  // Handler for when a photo is deleted
  const handlePhotoDeleted = () => {
    fetchTaggedPhotos();
    setSelectedPhoto(null);
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
              className="object-cover rounded cursor-pointer"
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
          onPhotoDeleted={handlePhotoDeleted}
          onPhotoUpdated={handlePhotoUpdated}
        />
      )}
    </div>
  );
}