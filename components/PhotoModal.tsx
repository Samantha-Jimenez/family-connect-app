import React, { MouseEvent, useState, useEffect } from 'react';
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
  const [comments, setComments] = useState<{ text: string; author: string; userId: string; timestamp: string; commenterPhoto: string }[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentIndex, setEditingCommentIndex] = useState<number | null>(null);
  const [editedCommentText, setEditedCommentText] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const { showToast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDownloadAnimating, setIsDownloadAnimating] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);

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
    fetchAlbumName();
    loadFamilyMembers();
    fetchFavoriteStatus();
    fetchComments();
    fetchProfilePhoto();
  }, [isEditing, photo.album_id, user, photo.photo_id]);

  useEffect(() => {
    if (isEditing) {
      setSelectedAlbumId(photo.album_id || '');
    }
  }, [isEditing, photo.album_id]);

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
      // If album changed, update album membership
      if (selectedAlbumId && selectedAlbumId !== photo.album_id) {
        if (photo.album_id) {
          // Remove from old album
          await removePhotoFromAlbum(photo.photo_id, photo.album_id);
        }
        // Add to new album
        await addPhotoToAlbum(photo.photo_id, selectedAlbumId);
      }
      // Save photo data with new album_id
      const updatedPhoto: PhotoData = {
        ...photo,
        album_id: selectedAlbumId,
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
      setSelectedAlbumId(selectedAlbumId);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseModal}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-4xl md:w-full w-auto m-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[670px] overflow-y-auto md:overflow-y-hidden" onClick={handleModalClick}>
        <div className="relative">
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
          <div className="absolute top-[-1.6rem] right-[-0.9rem] cursor-pointer block md:hidden" onClick={handleCloseModal}>
            <span className="text-gray-600 text-2xl">&times;</span>
          </div>
          {isEditing && currentUserId === photo?.uploaded_by && (
          <div className="flex absolute bottom-0 right-2 space-x-2 mb-2">
            <button
              className="btn bg-green-500 text-white border-0"
              onClick={handleSave}
            >
              Save
            </button>
            <button
              className="btn bg-red-500 text-white border-0"
              onClick={() => setIsConfirmOpen(true)}
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
          )}
          <div className="flex justify-end space-x-2 mt-auto">
            {currentUserId === photo?.uploaded_by && !isEditing && (
              <button
                className="btn border-0 bg-green-500 text-white rounded hover:bg-green-600 w-full mt-2.5"
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
          <div className="">
            {isEditing ? (
              <div>
                <div className="mb-1">
                  <label className="block text-sm font-bold mb-1 text-black">Description:</label>
                  <input
                    type="text"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="input input-bordered w-full text-black bg-white border-gray-300"
                  />
                </div>
                <div className="mb-1">
                  <h3 className="block text-sm font-bold text-black">Location Details:</h3>
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
                  <label className="block text-sm font-bold mb-1 text-black">Date Taken:</label>
                  <input
                    type="date"
                    value={editedDateTaken}
                    onChange={(e) => setEditedDateTaken(e.target.value)}
                    className="input input-bordered w-full text-black bg-white border-gray-300"
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
                    <label className="block text-sm font-bold mb-1 text-black">Album:</label>
                    <Select<{ value: string; label: string }>
                      options={albums.map(album => ({
                        value: album.album_id,
                        label: album.name
                      }))}
                      value={
                        selectedAlbumId
                          ? albums
                              .map(album => ({
                                value: album.album_id,
                                label: album.name
                              }))
                              .find(option => option.value === selectedAlbumId) || null
                          : null
                      }
                      onChange={selected => setSelectedAlbumId(selected?.value || '')}
                      className="mt-1"
                      classNamePrefix="select"
                      placeholder="Select an album..."
                      noOptionsMessage={() => "No albums found"}
                      isLoading={albums.length === 0}
                      theme={theme => ({
                        ...theme,
                        colors: {
                          ...theme.colors,
                          primary: '#3b82f6',
                          primary25: '#bfdbfe',
                          neutral0: 'var(--bg-color, white)',
                          neutral80: 'var(--text-color, black)'
                        }
                      })}
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
                  <div className="text-sm text-gray-500 dark:text-gray-200 mb-1 ">
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
                  <p className="text-sm text-gray-800 dark:text-gray-200 mb-1 mt-6">
                    <span className="font-bold">People Tagged: </span>
                    <p>
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
                  </p>
                )}
                {uploaderName && (
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-bold">Uploaded By: </span>
                    <p>
                    <a 
                      href={`/profile/${photo?.uploaded_by}`} 
                      className="text-blue-500 hover:underline"
                    >
                      {uploaderName}
                    </a>
                    </p>
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
          <div className="flex items-center justify-end mt-4">
            <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleAddComment();
                    }
                }}
                className="input input-bordered w-full text-black bg-white border-gray-300 rounded-md shadow-sm"
                placeholder="Add a comment..."
            />
            <button
                onClick={handleAddComment}
                className="btn bg-blue-500 text-white ml-2 rounded-md shadow hover:bg-blue-600 transition border-0"
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
};

export default PhotoModal; 