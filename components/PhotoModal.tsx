import React, { MouseEvent, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Select from 'react-select';
import { PhotoData, TaggedPerson, getUserAlbums, addPhotoToAlbum, savePhotoToDB, getAlbumById, deletePhotoById, getAllFamilyMembers, AlbumData, checkIfPhotoIsFavorited, removePhotoFromFavorites, addPhotoToFavorites, addCommentToPhoto, getCommentsForPhoto, getUserNameById, deleteCommentFromPhoto, editCommentInPhoto, getProfilePhotoById, removePhotoFromAlbum } from '@/hooks/dynamoDB';
import { useAuthenticator } from '@aws-amplify/ui-react';
import PhotoComments from './PhotoComments';
import { useToast } from '@/context/ToastContext';
import ConfirmationModal from './ConfirmationModal';

interface PhotoModalProps {
  photo: PhotoData;
  uploaderName: string | null;
  currentUserId: string | null;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  closeModal: () => void;
  handleImageError: React.ReactEventHandler<HTMLImageElement>;
  renderEditForm: () => JSX.Element;
  onPhotoDeleted?: () => void;
  onPhotoUpdated?: (updatedPhoto: PhotoData) => void;
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
  renderEditForm,
  onPhotoDeleted,
  onPhotoUpdated
}) => {
  const { user } = useAuthenticator();
  const [albums, setAlbums] = useState<AlbumData[]>([]);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<string[]>([]);
  const [editedDescription, setEditedDescription] = useState(photo.metadata?.description || '');
  const [editedDateTaken, setEditedDateTaken] = useState(photo.metadata?.date_taken || '');
  const [albumNames, setAlbumNames] = useState<{ id: string; name: string }[]>([]);
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
  const [comments, setComments] = useState<{ text: string; author: string; userId: string; timestamp: string; commenterPhoto: string }[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentIndex, setEditingCommentIndex] = useState<number | null>(null);
  const [editedCommentText, setEditedCommentText] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const { showToast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDownloadAnimating, setIsDownloadAnimating] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    // Prevent background scrolling when modal is open
    document.body.style.overflow = 'hidden';

    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const fetchAlbums = async () => {
      if (user && user.userId) {
        const userAlbums = await getUserAlbums(user.userId);
        setAlbums(userAlbums);
      }
    };

    const fetchAlbumNames = async () => {
      if (photo.album_ids && photo.album_ids.length > 0) {
        const names = await Promise.all(
          photo.album_ids.map(async (albumId) => {
            const album = await getAlbumById(albumId);
            return { id: albumId, name: album?.name || 'Unknown Album' };
          })
        );
        setAlbumNames(names);
      } else {
        setAlbumNames([]);
      }
    };

    const loadFamilyMembers = async () => {
      try {
        const members = await getAllFamilyMembers();
        setFamilyMembers(members.map(member => ({
          id: member.family_member_id,
          name: `${member.first_name} ${member.last_name}`
        })));
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

    const fetchComments = async () => {
      if (photo.photo_id) {
        const photoComments = await getCommentsForPhoto(photo.photo_id);
        setComments(photoComments.map(comment => ({
          ...comment,
          commenterPhoto: comment.profilePhoto
        })));
      }
    };

    const fetchProfilePhoto = async () => {
      if (user) {
        const photoUrl = await getProfilePhotoById(user.userId);
        setProfilePhoto(photoUrl);
      }
    };

    fetchAlbums();
    fetchAlbumNames();
    loadFamilyMembers();
    fetchFavoriteStatus();
    fetchComments();
    fetchProfilePhoto();
  }, [isEditing, photo.album_ids, user, photo.photo_id]);

  useEffect(() => {
    if (isEditing) {
      setSelectedAlbumIds(photo.album_ids || []);
    }
  }, [isEditing, photo.album_ids]);

  // Sync local editing state with photo prop changes
  useEffect(() => {
    setEditedDescription(photo.metadata?.description || '');
    setEditedDateTaken(photo.metadata?.date_taken || '');
    setEditedLocation(photo.metadata?.location || {
      country: '',
      state: '',
      city: '',
      neighborhood: ''
    });
    setEditedTaggedPeople(photo.metadata?.people_tagged || []);
  }, [photo]);

  const handleAddToAlbum = async (albumId: string) => {
    try {
      if (albumId) {
        await addPhotoToAlbum(photo.photo_id, albumId);
        console.log('Photo added to album successfully!');
        showToast('Photo added to album!', 'success');
      }
    } catch (error) {
      console.error('Error adding photo to album:', error);
      showToast('Error adding photo to album.', 'error');
    }
  };

  const handleSave = async () => {
    try {
      // Handle album membership changes
      const originalAlbumIds = photo.album_ids || [];
      const newAlbumIds = selectedAlbumIds;
      
      // Remove from albums that are no longer selected
      const albumsToRemove = originalAlbumIds.filter(id => !newAlbumIds.includes(id));
      for (const albumId of albumsToRemove) {
        await removePhotoFromAlbum(photo.photo_id, albumId);
      }
      
      // Add to new albums
      const albumsToAdd = newAlbumIds.filter(id => !originalAlbumIds.includes(id));
      for (const albumId of albumsToAdd) {
        await addPhotoToAlbum(photo.photo_id, albumId);
      }
      
      // Save photo data with updated album_ids
      const updatedPhoto: PhotoData = {
        ...photo,
        album_ids: selectedAlbumIds,
        metadata: {
          ...photo.metadata,
          description: editedDescription,
          date_taken: editedDateTaken,
          location: editedLocation,
          people_tagged: editedTaggedPeople,
        },
      };
      await savePhotoToDB(updatedPhoto);
      console.log('Photo data saved successfully!');
      setIsEditing(false);
      showToast('Changes saved successfully!', 'success');
      if (onPhotoUpdated) {
        onPhotoUpdated(updatedPhoto);
      }
    } catch (error) {
      console.error('Error saving photo data:', error);
      showToast('Error saving changes.', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deletePhotoById(photo.photo_id);
      console.log('Photo deleted successfully!');
      if (onPhotoDeleted) {
        onPhotoDeleted();
      } else {
        closeModal();
      }
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

  const handleAddComment = async () => {
    if (newComment.trim() && user) {
      try {
        const userName = await getUserNameById(user.userId);
        if (userName) {
          const authorName = `${userName.firstName} ${userName.lastName}`;
          await addCommentToPhoto(photo.photo_id, user.userId, newComment, authorName, profilePhoto || '');
          setComments([...comments, { text: newComment, author: authorName, userId: user.userId, timestamp: new Date().toISOString(), commenterPhoto: profilePhoto || '' }]);
          setNewComment('');
        }
      } catch (error) {
        console.error('Error adding comment:', error);
      }
    }
  };

  const handleDeleteComment = async (index: number) => {
    if (user) {
      try {
        await deleteCommentFromPhoto(photo.photo_id, user.userId, index);
        setComments(comments.filter((_, i) => i !== index));
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
  };

  const handleEditComment = async (index: number) => {
    if (editedCommentText.trim() && user) {
      try {
        // Update the comment in the database
        await editCommentInPhoto(photo.photo_id, user.userId, index, editedCommentText);

        // Update the comment in the local state
        const updatedComments = [...comments];
        updatedComments[index].text = editedCommentText;
        setComments(updatedComments);

        // Reset editing state
        setEditingCommentIndex(null);
        setEditedCommentText('');
      } catch (error) {
        console.error('Error editing comment:', error);
      }
    }
  };

  // Transform familyMembers into UserOption format for react-select
  const familyMemberOptions = familyMembers.map((member) => ({
    value: member.id,
    label: member.name
  }));

  const handleDownload = async (imageUrl: string, filename: string = "photo.jpg") => {
    try {
      setIsDownloadAnimating(true); // Start animation
      const response = await fetch(imageUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setHasDownloaded(true);
      setTimeout(() => setIsDownloadAnimating(false), 300); // End animation after 300ms
    } catch (err) {
      setIsDownloadAnimating(false);
      alert("Failed to download image.");
      console.error("Download error:", err);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 md:flex md:items-center md:justify-center z-[100] overflow-y-auto" onClick={handleCloseModal}>
      <div className="bg-white dark:bg-gray-800 p-6 md:rounded-lg max-w-4xl md:w-full w-full h-full md:h-auto md:m-4 grid grid-cols-1 md:grid-cols-2 grid-rows-[min-content_auto] gap-4 md:max-h-[670px] overflow-y-auto md:overflow-y-visible" onClick={handleModalClick}>
        <div className="relative justify-self-center">
          <Image
            src={photo.url || '/fallback-image.jpg'}
            alt="Selected photo"
            width={500}
            height={300}
            className="object-contain rounded-lg"
            onError={handleImageError}
          />
          <div className="absolute top-[0.6rem] right-[0.7rem] flex items-center bg-gray-400/30 rounded-full px-2 py-0.5 gap-2 shadow-sm">
            <div className="tooltip" data-tip="Favorite">
              <div
                className={`cursor-pointer transition-transform duration-300 h-5 ${isAnimating ? 'scale-125' : ''}`}
                onClick={toggleFavorite}
              >
                {isFavorited ? <span className="icon-[mdi--heart] text-red-500 h-5 w-5" /> : <span className="icon-[mdi--heart-plus] text-white h-5 w-5" />}
              </div>
            </div>
            {photo.url && (
              <div className="tooltip h-5" data-tip="Download">
                <button
                  type="button"
                  className="h-5"
                  title="Download photo"
                  onClick={e => {
                    e.stopPropagation();
                    const filename = photo.s3_key
                      ? photo.s3_key.split('/').pop() || "photo.jpg"
                      : "photo.jpg";
                    handleDownload(photo.url, filename);
                  }}
                >
                  <span
                    className={`icon-[mdi--tray-download] h-5 w-5 transition-transform duration-300
                      ${isDownloadAnimating ? 'scale-125' : ''}
                      ${hasDownloaded ? 'text-gray-600' : 'text-white'}
                    `}
                  />
                </button>
              </div>
            )}
          </div>
          <div className="absolute top-[-1.6rem] md:right-[-0.9rem] right-[-0.1rem] cursor-pointer block md:hidden" onClick={handleCloseModal}>
            <span className="fixed text-gray-600 text-2xl top-1 right-2">&times;</span>
          </div>
          {isEditing && currentUserId === photo?.uploaded_by && (
          <div className="flex absolute bottom-0 right-2 space-x-2 mb-2">
            <button
              className="btn btn-sm bg-dark-spring-green text-white border-0 hover:bg-plantain-green"
              onClick={handleSave}
            >
              Save
            </button>
            <button
              className="btn btn-sm bg-[#E12B1F] text-white border-0 hover:bg-red-500"
              onClick={() => setIsConfirmOpen(true)}
            >
              Delete
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="btn btn-sm bg-golden-sand text-black border-0 hover:bg-sand-beige"
            >
              Cancel
            </button>
          </div>
          )}
          <div className="flex justify-end space-x-2 mt-auto">
            {currentUserId === photo?.uploaded_by && !isEditing && (
              <button
                className="btn btn-sm border-0 bg-plantain-green text-white rounded hover:bg-plantain-green/70 w-full mt-2.5"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            )}
          </div>
          <div className={`absolute top-[0.6rem] right-[0.7rem] cursor-pointer transition-transform duration-300`}>
            {/* {profilePhoto && (
              <img
                src={profilePhoto}
                alt="User Profile"
                className="w-10 h-10 rounded-full border border-gray-300"
              />
            )} */}
          </div>
        </div>
        
        <div className="relative flex flex-col justify-between h-full">
          <div className="absolute top-[-1.2rem] right-[-0.5rem] cursor-pointer hidden md:block" onClick={handleCloseModal}>
            <span className="text-gray-600 text-2xl">&times;</span>
          </div>
          <div className="h-full mb-2">
            {isEditing ? (
              <div>
                <div className="mb-1">
                  <label className="block text-sm font-bold mb-1 text-black">Description:</label>
                  <input
                    type="text"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="mt-1 block w-full rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"

                  />
                </div>
                <div className="mb-1">
                  <h3 className="block text-sm font-bold text-black">Location Details:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Country
                      </label>
                      <input
                        type="text"
                        value={editedLocation.country}
                        onChange={(e) => setEditedLocation({ ...editedLocation, country: e.target.value })}
                        className="mt-1 block w-full rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"
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
                        className="mt-1 block w-full rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"
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
                        className="mt-1 block w-full rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"
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
                        className="mt-1 block w-full rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"
                      />
                    </div>
                  </div>
                </div>
                <div className="mb-1">
                  <label className="block text-sm font-bold mb-1 text-black">Date Taken:</label>
                  <input
                    type="date"
                    value={editedDateTaken}
                    onChange={(e) => setEditedDateTaken(e.target.value)}
                    className="mt-1 block w-full rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"
                  />
                </div>
                <div className="mb-1">
                  <label className="block text-sm font-bold mb-1 text-black">Tagged People:</label>
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
                    menuPlacement="bottom"
                    styles={{
                      placeholder: (base) => ({
                        ...base,
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 300,
                        color: '#9BA3AF',
                      }),
                      menu: (provided) => ({
                        ...provided,
                        zIndex: 9999,
                      }),
                      menuPortal: (provided) => ({
                        ...provided,
                        zIndex: 9999,
                      }),
                      control: (base: any, state: any) => ({
                        ...base,
                        borderWidth: '1.5px',
                        borderColor: state.isFocused
                          ? '#C8D5B9' // 🌿 focused border
                          : state.menuIsOpen
                          ? '#D2FF28' // open menu border
                          : '', // default border
                        boxShadow: state.isFocused ? '0 0 0 1px #5CAB68' : 'none',
                        '&:hover': {
                          borderColor: '#D2FF28', // hover border
                        },
                      }),
                      option: (provided: any, state: any) => ({
                        ...provided,
                        backgroundColor: state.isFocused ? '#E8D4B8' : 'transparent',
                        color: state.isFocused ? '#000' : '#000',
                        '&:active': {
                          backgroundColor: '#F4C47A',
                          color: '#fff',
                        },
                      }),
                    }}
                  />
                </div>
                {isEditing && currentUserId === photo?.uploaded_by && (
                  <div className="">
                    <label className="block text-sm font-bold mb-1 text-black">Albums:</label>
                    <Select<{ value: string; label: string }, true>
                      isMulti
                      options={albums.map(album => ({
                        value: album.album_id,
                        label: album.name
                      }))}
                      value={
                        selectedAlbumIds.length > 0
                          ? albums
                              .filter(album => selectedAlbumIds.includes(album.album_id))
                              .map(album => ({
                                value: album.album_id,
                                label: album.name
                              }))
                          : []
                      }
                      onChange={selected => {
                        const ids = selected ? selected.map(s => s.value) : [];
                        setSelectedAlbumIds(ids);
                      }}
                      className="mt-1"
                      classNamePrefix="select"
                      placeholder="Select albums (photo can be in multiple)..."
                      noOptionsMessage={() => "No albums found"}
                      isLoading={albums.length === 0}
                      menuPlacement="bottom"
                      styles={{
                        placeholder: (base) => ({
                          ...base,
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: 300,
                          color: '#9BA3AF',
                        }),
                        menu: (provided) => ({
                          ...provided,
                          zIndex: 9999,
                        }),
                        menuPortal: (provided) => ({
                          ...provided,
                          zIndex: 9999,
                        }),
                        control: (base: any, state: any) => ({
                          ...base,
                          borderWidth: '1.5px',
                          borderColor: state.isFocused
                            ? '#C8D5B9' // 🌿 focused border
                            : state.menuIsOpen
                            ? '#D2FF28' // open menu border
                            : '', // default border
                          boxShadow: state.isFocused ? '0 0 0 1px #5CAB68' : 'none',
                          '&:hover': {
                            borderColor: '#D2FF28', // hover border
                          },
                        }),
                        option: (provided: any, state: any) => ({
                          ...provided,
                          backgroundColor: state.isFocused ? '#E8D4B8' : 'transparent',
                          color: state.isFocused ? '#000' : '#000',
                          '&:active': {
                            backgroundColor: '#F4C47A',
                            color: '#fff',
                          },
                        }),
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <>
                {photo.metadata?.description && (
                  <p className="text-xl text-gray-800 dark:text-gray-200 mb-1 pr-[10px]">
                    {photo.metadata?.description}
                  </p>
                )}
                {photo.metadata?.location && typeof photo.metadata.location === 'object' && Object.values(photo.metadata.location).some(val => val) && (
                  <div className="text-sm text-gray-500 dark:text-gray-200 mb-1 font-light">
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
                {albumNames.length > 0 && (
                  <p className="text-sm text-gray-800 dark:text-gray-200 mb-1">
                    <span className="font-bold">Album{albumNames.length > 1 ? 's' : ''}: </span>
                    {albumNames.map((album, index) => (
                      <React.Fragment key={album.id}>
                        {index > 0 && ', '}
                        {album.name}
                      </React.Fragment>
                    ))}
                  </p>
                )}
                {photo.metadata?.people_tagged && photo.metadata.people_tagged.length > 0 && (
                  <p className="text-sm text-gray-800 dark:text-gray-200 mb-1 mt-6">
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
            {!isEditing && (
            <PhotoComments 
                comments={comments} 
                editingCommentIndex={editingCommentIndex} 
                setEditingCommentIndex={setEditingCommentIndex} 
                editedCommentText={editedCommentText} 
                setEditedCommentText={setEditedCommentText} 
                newComment={newComment} 
                setNewComment={setNewComment} 
                handleAddComment={handleAddComment} 
                handleEditComment={handleEditComment} 
                handleDeleteComment={handleDeleteComment} 
            />
            )}
          </div>
          {!isEditing && (
          <div className="flex items-center justify-end">
            <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleAddComment();
                    }
                }}
                name="newComment"
                className="input input-sm input-bordered w-full text-black bg-white border-gray-300 rounded-md shadow-sm !text-base block rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"
                placeholder="Add a comment..."
            />
            <button
                onClick={handleAddComment}
                className="btn btn-sm bg-carrot-orange text-white ml-2 rounded-md shadow hover:bg-carrot-orange/80 transition border-0"
            >
                Post
            </button>
        </div>
            )}
        </div>
      </div>
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={async () => {
          await handleDelete();
          setIsConfirmOpen(false);
        }}
        message="Are you sure you want to delete this photo?"
      />
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PhotoModal; 