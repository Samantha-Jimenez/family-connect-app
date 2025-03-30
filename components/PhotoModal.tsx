import React, { MouseEvent, useState, useEffect } from 'react';
import Image from 'next/image';
import { PhotoData, TaggedPerson, getUserAlbums, addPhotoToAlbum, savePhotoToDB, getAlbumById, deletePhotoById } from '@/hooks/dynamoDB';
import { useAuthenticator } from '@aws-amplify/ui-react';

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
  const { user } = useAuthenticator();
  const [albums, setAlbums] = useState([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState('');
  const [editedDescription, setEditedDescription] = useState(photo.metadata?.description || '');
  const [editedDateTaken, setEditedDateTaken] = useState(photo.metadata?.date_taken || '');
  const [albumName, setAlbumName] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlbums = async () => {
      if (user && user.userId) {
        const userAlbums = await getUserAlbums(user.userId);
        setAlbums(userAlbums);
      }
    };

    const fetchAlbumName = async () => {
      if (photo.album_id) {
        const album = await getAlbumById(photo.album_id);
        setAlbumName(album?.name || null);
      }
    };

    fetchAlbums();
    fetchAlbumName();
  }, [user, photo.album_id]);

  const handleAddToAlbum = async () => {
    try {
      if (selectedAlbumId) {
        await addPhotoToAlbum(photo.photo_id, selectedAlbumId);
        console.log('Photo added to album successfully!');
      }
    } catch (error) {
      console.error('Error adding photo to album:', error);
    }
  };

  const handleSave = async () => {
    try {
      await savePhotoToDB({
        ...photo,
        metadata: {
          ...photo.metadata,
          description: editedDescription,
          date_taken: editedDateTaken,
        },
      });
      console.log('Photo data saved successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving photo data:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deletePhotoById(photo.photo_id);
      console.log('Photo deleted successfully!');
      closeModal(); // Close the modal after deletion
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  };

  const handleModalClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const handleCloseModal = () => {
    setIsEditing(false);
    closeModal();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseModal}>
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
          {isEditing ? (
            <div>
              <div className="mb-2">
                <label className="block text-sm font-bold mb-1">Description:</label>
                <input
                  type="text"
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
              <div className="mb-2">
                <label className="block text-sm font-bold mb-1">Date Taken:</label>
                <input
                  type="date"
                  value={editedDateTaken}
                  onChange={(e) => setEditedDateTaken(e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={handleSave}
                  className="btn btn-primary"
                >
                  Save
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn btn-secondary"
                >
                  Close Edit
                </button>
              </div>
            </div>
          ) : (
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
              {albumName && (
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <span className="font-bold">Album: </span>
                  {albumName}
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
        {isEditing && currentUserId === photo?.uploaded_by && (
          <div className="mt-4">
            <select
              value={selectedAlbumId}
              onChange={(e) => setSelectedAlbumId(e.target.value)}
              className="select select-bordered w-full mb-2"
            >
              <option value="">Select an album</option>
              {albums.map((album) => (
                <option key={album.album_id} value={album.album_id}>
                  {album.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddToAlbum}
              className="btn btn-primary w-full"
              disabled={!selectedAlbumId}
            >
              Add to Album
            </button>
          </div>
        )}
        <div className="flex justify-end space-x-2 mt-4">
          {currentUserId === photo?.uploaded_by && !isEditing && (
            <button
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>
          )}
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handleCloseModal}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoModal; 