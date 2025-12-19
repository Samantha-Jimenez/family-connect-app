import React, { useEffect, useState } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { getFavoritedPhotosByUser, PhotoData } from '@/hooks/dynamoDB';
import Image from 'next/image';
import PhotoModal from './PhotoModal';
import LoadSpinner from '@/components/LoadSpinner';

export default function FavoritedPhotosCard() {
  const { user } = useAuthenticator();
  const [favoritedPhotos, setFavoritedPhotos] = useState<PhotoData[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavoritedPhotos = async () => {
      setLoading(true);
      if (user && user.userId) {
        const photos = await getFavoritedPhotosByUser(user.userId);
        setFavoritedPhotos(photos);
      }
      setLoading(false);
    };

    fetchFavoritedPhotos();
  }, [user]);

  const handlePhotoClick = (photo: PhotoData) => {
    setSelectedPhoto(photo);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPhoto(null);
  };

  // Handler to update photo data after editing
  const handlePhotoUpdated = (updatedPhoto: PhotoData) => {
    // Update the photo in the favoritedPhotos array
    setFavoritedPhotos(prevPhotos => 
      prevPhotos.map(photo => 
        photo.photo_id === updatedPhoto.photo_id ? updatedPhoto : photo
      )
    );
    // Update the selected photo so modal reflects changes
    setSelectedPhoto(updatedPhoto);
  };

  // Handler for when a photo is deleted
  const handlePhotoDeleted = async () => {
    setLoading(true);
    if (user && user.userId) {
      const photos = await getFavoritedPhotosByUser(user.userId);
      setFavoritedPhotos(photos);
    }
    setLoading(false);
    setSelectedPhoto(null);
    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <div className="card bg-white text-black shadow-lg p-6">
        <h2 className="text-xl font-bold">Favorited Photos</h2>
        <div className="flex justify-center items-center py-8">
          <LoadSpinner size={48} />
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-white text-black p-6 shadow-lg">
      <h2 className="text-xl">Favorited Photos <span className="text-sm text-gray-500">({favoritedPhotos.length})</span></h2>
      {/* <p className="mt-2 italic">Your favorite memories, all in one place.</p> */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
        {favoritedPhotos.map(photo => (
          <div key={photo.photo_id} className="relative aspect-square" onClick={() => handlePhotoClick(photo)}>
            <Image
              src={photo.url || '/fallback-image.jpg'}
              alt="Favorited photo"
              fill
              className="object-cover rounded cursor-pointer"
              sizes="(max-width: 768px) 33vw, 20vw"
            />
          </div>
        ))}
      </div>
      {favoritedPhotos.length === 0 && (
        <p className="mt-4 text-gray-500">No favorited photos yet.</p>
      )}
      {isModalOpen && selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          uploaderName={null}
          currentUserId={user?.userId || null}
          isEditing={false}
          setIsEditing={() => {}}
          closeModal={closeModal}
          handleImageError={() => {}}
          renderEditForm={() => <></>}
          onPhotoDeleted={handlePhotoDeleted}
          onPhotoUpdated={handlePhotoUpdated}
        />
      )}
    </div>
  );
}