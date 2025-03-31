import React, { useEffect, useState } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { getFavoritedPhotosByUser, PhotoData } from '@/hooks/dynamoDB';
import Image from 'next/image';
import PhotoModal from './PhotoModal';

export default function FavoritedPhotosCard() {
  const { user } = useAuthenticator();
  const [favoritedPhotos, setFavoritedPhotos] = useState<PhotoData[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchFavoritedPhotos = async () => {
      if (user && user.userId) {
        const photos = await getFavoritedPhotosByUser(user.userId);
        setFavoritedPhotos(photos);
      }
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

  return (
    <div className="card bg-white text-black p-6 shadow-lg">
      <h2 className="text-xl font-bold">⭐ Favorited Photos</h2>
      <p className="mt-2">Your favorite memories, all in one place.</p>
      <div className="grid grid-cols-2 gap-4 mt-4">
        {favoritedPhotos.map(photo => (
          <div key={photo.photo_id} className="relative cursor-pointer" onClick={() => handlePhotoClick(photo)}>
            <Image
              src={photo.url || '/fallback-image.jpg'}
              alt="Favorited photo"
              width={150}
              height={100}
              className="object-cover rounded-lg"
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
        />
      )}
    </div>
  );
}