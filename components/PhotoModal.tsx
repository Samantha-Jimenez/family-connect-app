import React, { MouseEvent, useState, useEffect } from 'react';
import Image from 'next/image';
import Select from 'react-select';
import { PhotoData, TaggedPerson, getUserAlbums, addPhotoToAlbum, savePhotoToDB, getAlbumById, deletePhotoById, getAllFamilyMembers, AlbumData, checkIfPhotoIsFavorited, removePhotoFromFavorites, addPhotoToFavorites } from '@/hooks/dynamoDB';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { v4 as uuidv4 } from 'uuid';

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
  const [albums, setAlbums] = useState<AlbumData[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState('');
  const [editedDescription, setEditedDescription] = useState(photo.metadata?.description || '');
  const [editedDateTaken, setEditedDateTaken] = useState(photo.metadata?.date_taken || '');
  const [albumName, setAlbumName] = useState<string | null>(null);
  const [editedLocation, setEditedLocation] = useState(photo.metadata?.location || {
    country: '',
    state: '',
    city: '',
    neighborhood: ''
  });
  const [editedTaggedPeople, setEditedTaggedPeople] = useState<TaggedPerson[]>(photo.metadata?.people_tagged || []);
  const [familyMembers, setFamilyMembers] = useState<TaggedPerson[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

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

    const loadFamilyMembers = async () => {
      try {
        const members = await getAllFamilyMembers();
        setFamilyMembers(members);
      } catch (error) {
        console.error('Error loading family members:', error);
      }
    };

    const fetchFavoriteStatus = async () => {
      if (user && photo.photo_id) {
        const favorited = await checkIfPhotoIsFavorited(user.userId, photo.photo_id);
        setIsFavorited(favorited);
      }
    };

    fetchAlbums();
    fetchAlbumName();
    loadFamilyMembers();
    fetchFavoriteStatus();
  }, [user, photo.album_id, photo.photo_id]);

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
          location: editedLocation,
          people_tagged: editedTaggedPeople,
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

  const toggleFavorite = async () => {
    try {
      if (user && photo.photo_id) {
        setIsAnimating(true); // Start animation
        if (isFavorited) {
          await removePhotoFromFavorites(user.userId, photo.photo_id);
        } else {
          await addPhotoToFavorites(user.userId, photo.photo_id);
        }
        setIsFavorited(!isFavorited);
        setTimeout(() => setIsAnimating(false), 300); // End animation after 300ms
      }
    } catch (error) {
      console.error('Error toggling favorite status:', error);
    }
  };

  // Transform familyMembers into UserOption format for react-select
  const familyMemberOptions = familyMembers.map((member) => ({
    value: member.family_member_id,
    label: `${member.first_name} ${member.last_name}`
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseModal}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-4xl w-full m-4 flex" onClick={handleModalClick}>
        <div className="w-1/2 pr-4 relative">
          <Image
            src={photo.url || '/fallback-image.jpg'}
            alt="Selected photo"
            width={500}
            height={300}
            className="object-contain rounded-lg"
            onError={handleImageError}
          />
          <div className={`absolute top-2 right-6 cursor-pointer transition-transform duration-300 ${isAnimating ? 'scale-125' : ''}`} onClick={toggleFavorite}>
            {isFavorited ? <span className="icon-[mdi--cards-heart] w-5 h-5 text-red-500" /> : <span className="icon-[mdi--cards-heart] w-5 h-5 text-white" />}
          </div>
        </div>
        <div className="w-1/2 pl-4 flex flex-col justify-between">
          <div>
            {isEditing ? (
              <div>
                <div className="mb-1">
                  <label className="block text-sm font-bold mb-1">Description:</label>
                  <input
                    type="text"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="input input-bordered w-full text-black bg-white border-gray-300"
                  />
                </div>
                <div className="mb-1">
                  <h3 className="block text-sm font-bold">Location Details:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        value={editedLocation.country}
                        onChange={(e) => setEditedLocation({ ...editedLocation, country: e.target.value })}
                        className="input input-bordered w-full text-black bg-white border-gray-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        State/Province
                      </label>
                      <input
                        type="text"
                        value={editedLocation.state}
                        onChange={(e) => setEditedLocation({ ...editedLocation, state: e.target.value })}
                        className="input input-bordered w-full text-black bg-white border-gray-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        City
                      </label>
                      <input
                        type="text"
                        value={editedLocation.city}
                        onChange={(e) => setEditedLocation({ ...editedLocation, city: e.target.value })}
                        className="input input-bordered w-full text-black bg-white border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Neighborhood
                      </label>
                      <input
                        type="text"
                        value={editedLocation.neighborhood}
                        onChange={(e) => setEditedLocation({ ...editedLocation, neighborhood: e.target.value })}
                        className="input input-bordered w-full text-black bg-white border-gray-300"
                      />
                    </div>
                  </div>
                </div>
                <div className="mb-1">
                  <label className="block text-sm font-bold mb-1">Date Taken:</label>
                  <input
                    type="date"
                    value={editedDateTaken}
                    onChange={(e) => setEditedDateTaken(e.target.value)}
                    className="input input-bordered w-full text-black bg-white border-gray-300"
                  />
                </div>
                <div className="mb-1">
                  <label className="block text-sm font-bold mb-1">Tagged People:</label>
                  <Select
                    isMulti
                    options={familyMemberOptions}
                    value={editedTaggedPeople.map(person => ({
                      value: person.id,
                      label: person.name
                    }))}
                    onChange={(selected) => setEditedTaggedPeople(selected.map(option => ({
                      id: option.value,
                      name: option.label
                    })))}
                    className="mt-1"
                    classNamePrefix="select"
                    placeholder="Select family members in this photo..."
                    noOptionsMessage={() => "No family members found"}
                    isLoading={familyMembers.length === 0}
                    theme={(theme) => ({
                      ...theme,
                      colors: {
                        ...theme.colors,
                        primary: '#3b82f6',
                        primary25: '#bfdbfe',
                        neutral0: 'var(--bg-color, white)',
                        neutral80: 'var(--text-color, black)',
                      },
                    })}
                  />
                </div>
                {isEditing && currentUserId === photo?.uploaded_by && (
                  <div className="">
                    <label className="block text-sm font-bold mb-1">Album:</label>
                    <select
                      value={selectedAlbumId}
                      onChange={(e) => setSelectedAlbumId(e.target.value)}
                      className="select select-bordered w-full mb-2 text-black bg-white border-gray-300"
                    >
                      <option value="">Select an Album</option>
                      {albums.map((album) => (
                        <option key={album.album_id} value={album.album_id}>
                          {album.name}
                          {album.description}
                          {album.cover_photo_id}
                        </option>
                      ))}
                    </select>
                    {/* <button
                      onClick={handleAddToAlbum}
                      className="btn btn-primary w-full"
                      disabled={!selectedAlbumId}
                    >
                      Add to Album
                    </button> */}
                  </div>
                )}
                <div className="flex justify-end space-x-2 mb-2">
                  <button
                    className="btn bg-green-500 text-white border-0"
                    onClick={handleSave}
                  >
                    Save
                  </button>
                  <button
                    className="btn bg-red-500 text-white border-0"
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn bg-gray-600 text-white border-0"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {photo.metadata?.description && (
                  <p className="text-sm text-gray-800 dark:text-gray-200 mb-1">
                    <span className="font-bold">Description: </span>
                    {photo.metadata?.description}
                  </p>
                )}
                {photo.metadata?.location && typeof photo.metadata.location === 'object' && Object.values(photo.metadata.location).some(val => val) && (
                  <div className="text-sm text-gray-800 dark:text-gray-200 mb-1 ">
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
                {photo.metadata?.date_taken && (
                  <p className="text-sm text-gray-800 dark:text-gray-200 mb-1">
                    <span className="font-bold">Date Taken: </span>
                    {formatDate(photo.metadata?.date_taken || '')}
                  </p>
                )}
                {albumName && (
                  <p className="text-sm text-gray-800 dark:text-gray-200 mb-1">
                    <span className="font-bold">Album: </span>
                    {albumName}
                  </p>
                )}
                {photo.metadata?.people_tagged && photo.metadata.people_tagged.length > 0 && (
                  <p className="text-sm text-gray-800 dark:text-gray-200 mb-1">
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
          <div className="flex justify-end space-x-2 mt-auto">
            {currentUserId === photo?.uploaded_by && !isEditing && (
              <button
                className="btn border-0 bg-green-500 text-white rounded hover:bg-green-600"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            )}
            <button
              className="btn border-0 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={handleCloseModal}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoModal; 