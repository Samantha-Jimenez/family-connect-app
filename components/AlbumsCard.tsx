import React, { useState, useEffect } from 'react';
import { createAlbum, addPhotoToAlbum, getUserAlbums, getPhotosByAlbum, deleteAlbumById, getUserPhotos, updateAlbum, removePhotoFromAlbum } from '../hooks/dynamoDB';
import Image from 'next/image';
import { PhotoData, AlbumData } from '../hooks/dynamoDB';

const AlbumsCard = ({ userId, auth }: { userId: string, auth: boolean }) => {
  const [albumName, setAlbumName] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const [photoId, setPhotoId] = useState('');
  const [albumId, setAlbumId] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [albums, setAlbums] = useState<AlbumData[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumData | null>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [photoCounts, setPhotoCounts] = useState<{ [key: string]: number }>({});
  const [deleting, setDeleting] = useState(false);
  const [showAddPhotos, setShowAddPhotos] = useState(false);
  const [userPhotos, setUserPhotos] = useState<PhotoData[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [addingPhotos, setAddingPhotos] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCoverPhotoId, setEditCoverPhotoId] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [showRemovePhotos, setShowRemovePhotos] = useState(false);
  const [removingPhotos, setRemovingPhotos] = useState(false);
  const [selectedRemovePhotoIds, setSelectedRemovePhotoIds] = useState<string[]>([]);

  console.log(albums.map((album) => album.cover_photo_id));

  useEffect(() => {
    const fetchAlbums = async () => {
      if (userId) {
        const userAlbums = await getUserAlbums(userId);
        setAlbums(userAlbums);

        // Fetch photo counts for each album
        const counts: { [key: string]: number } = {};
        for (const album of userAlbums) {
          const albumPhotos = await getPhotosByAlbum(album.album_id);
          counts[album.album_id] = albumPhotos.length;
        }
        setPhotoCounts(counts);
      }
    };

    fetchAlbums();
  }, [userId]);

  useEffect(() => {
    if (showAddPhotos && userId) {
      (async () => {
        const allPhotos = await getUserPhotos(userId);
        setUserPhotos(allPhotos);
      })();
    }
  }, [showAddPhotos, userId]);

  const handleCreateAlbum = async () => {
    try {
      const newAlbumId = await createAlbum(albumName, albumDescription);
      setAlbumId(newAlbumId);
      console.log('Album created with ID:', newAlbumId);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000); // Hide toast after 3 seconds
      // Refresh albums list
      const userAlbums = await getUserAlbums(userId);
      setAlbums(userAlbums);

      // Refresh photo counts
      const counts: { [key: string]: number } = {};
      for (const album of userAlbums) {
        const albumPhotos = await getPhotosByAlbum(album.album_id);
        counts[album.album_id] = albumPhotos.length;
      }
      setPhotoCounts(counts);
    } catch (error) {
      console.error('Error creating album:', error);
    }
  };

  const handleAddPhotoToAlbum = async () => {
    try {
      await addPhotoToAlbum(photoId, albumId);
      console.log('Photo added to album successfully!');
    } catch (error) {
      console.error('Error adding photo to album:', error);
    }
  };

  const handleAlbumClick = async (album: AlbumData) => {
    try {
      const albumPhotos = await getPhotosByAlbum(album.album_id);
      setPhotos(albumPhotos);
      setSelectedAlbum(album);
      setShowModal(true);
      setEditing(false);
      setEditName(album.name);
      setEditDescription(album.description || '');
      setEditCoverPhotoId(album.cover_photo_id || '');
    } catch (error) {
      console.error('Error fetching photos for album:', error);
    }
  };

  const handleDeleteAlbum = async () => {
    if (!selectedAlbum) return;
    if (!window.confirm('Are you sure you want to delete this album and all its photos?')) return;
    setDeleting(true);
    try {
      await deleteAlbumById(selectedAlbum.album_id);
      setShowModal(false);
      // Refresh albums list
      const userAlbums = await getUserAlbums(userId);
      setAlbums(userAlbums);

      // Refresh photo counts
      const counts: { [key: string]: number } = {};
      for (const album of userAlbums) {
        const albumPhotos = await getPhotosByAlbum(album.album_id);
        counts[album.album_id] = albumPhotos.length;
      }
      setPhotoCounts(counts);
    } catch (error) {
      alert('Failed to delete album.');
    } finally {
      setDeleting(false);
    }
  };

  const handlePhotoCheckbox = (photoId: string) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    );
  };

  const handleAddSelectedPhotos = async () => {
    if (!selectedAlbum) return;
    setAddingPhotos(true);
    try {
      for (const photoId of selectedPhotoIds) {
        await addPhotoToAlbum(photoId, selectedAlbum.album_id);
      }
      // Refresh album photos
      const albumPhotos = await getPhotosByAlbum(selectedAlbum.album_id);
      setPhotos(albumPhotos);
      setShowAddPhotos(false);
      setSelectedPhotoIds([]);
    } catch (error) {
      alert('Failed to add photos.');
    } finally {
      setAddingPhotos(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedAlbum) return;
    setSavingEdit(true);
    try {
      await updateAlbum(selectedAlbum.album_id, {
        name: editName,
        description: editDescription,
        cover_photo_id: editCoverPhotoId,
      });
      // Refresh albums list
      const userAlbums = await getUserAlbums(userId);
      setAlbums(userAlbums);
      // Update selectedAlbum with new values
      setSelectedAlbum((prev) =>
        prev
          ? {
              ...prev,
              name: editName,
              description: editDescription,
              cover_photo_id: editCoverPhotoId,
            }
          : null
      );
      setEditing(false);
    } catch (error) {
      alert('Failed to update album.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="p-4 bg-white shadow-lg rounded-lg relative">
      {auth && (
        <>
      <h2 className="text-xl mb-2 text-black">Create Album</h2>
      <p className="mt-2 italic">Create a new album to organize your photos.</p>
      <div className="mt-4 mb-2">
        <input
          type="text"
          placeholder="Album Name"
          value={albumName}
          onChange={(e) => setAlbumName(e.target.value)}
          className="input input-bordered w-full mb-2 bg-gray-200"
        />
        <input
          type="text"
          placeholder="Album Description"
          value={albumDescription}
          onChange={(e) => setAlbumDescription(e.target.value)}
          className="input input-bordered w-full bg-gray-200"
        />
      </div>
      <button onClick={handleCreateAlbum} className="btn btn-primary w-full mb-6">
        Create Album
      </button>

      {/* <h2 className="text-xl font-bold mb-4 text-black">Add Photo to Album</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Photo ID"
          value={photoId}
          onChange={(e) => setPhotoId(e.target.value)}
          className="input input-bordered w-full"
        />
      </div>
      <button onClick={handleAddPhotoToAlbum} className="btn btn-secondary w-full">
        Add Photo
      </button> */}
      </>
      )}

      {showToast && (
        <div className="toast toast-top toast-end">
          <div className="alert alert-success">
            <span>Album created successfully!</span>
          </div>
        </div>
      )}

      <h2 className="text-xl mb-2 text-black">Albums</h2>
      <div className="space-y-4">
        {albums.map((album) => (
          <>
            <div
              key={album.album_id}
              className="p-4 bg-gray-100 rounded-lg shadow cursor-pointer w-2/5"
              onClick={() => handleAlbumClick(album)}
              >
              <h3 className="text-lg font-semibold text-black">{album.name}</h3>
              <p className="text-sm text-black">{album.description}</p>
              <p className="text-xs text-gray-500">Created on: {new Date(album.created_date).toLocaleDateString()}</p>
              <p className="text-xs text-gray-500">Photos: {photoCounts[album.album_id] || 0}</p>
            </div>
          </>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-3/4 max-w-2xl relative">
            <h2 className="text-xl font-bold mb-4 text-black">
              {editing ? (
                <input
                  className="input input-bordered w-full bg-gray-200"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={savingEdit}
                />
              ) : (
                selectedAlbum?.name
              )}
            </h2>
            {auth && !editing && (
              <button
                className="btn btn-outline btn-sm absolute right-6 top-6"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            )}
            {editing ? (
              <div className="mb-4">
                <label className="block text-black font-semibold mb-1">Description</label>
                <input
                  className="input input-bordered w-full mb-2 bg-gray-200"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  disabled={savingEdit}
                  placeholder="Enter description"
                />
                <div className="flex gap-2 mt-4">
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                  >
                    {savingEdit ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setEditing(false)}
                    disabled={savingEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-black mb-2">{selectedAlbum?.description}</p>
                {selectedAlbum?.cover_photo_id && (
                  <div className="mb-4">
                    <span className="text-xs text-gray-500">Cover Photo:</span>
                    <div>
                      {photos
                        .filter((p) => p.photo_id === selectedAlbum.cover_photo_id)
                        .map((photo) => (
                          <Image
                            key={photo.photo_id}
                            src={photo.url}
                            alt={photo.metadata?.description || ''}
                            className="rounded-lg mt-1"
                            width={150}
                            height={100}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              {photos.map((photo) => (
                <div key={photo.photo_id} className="p-2 bg-gray-200 rounded-lg relative">
                  {showRemovePhotos && (
                    <input
                      type="checkbox"
                      className="absolute top-2 left-2 z-10"
                      checked={selectedRemovePhotoIds.includes(photo.photo_id)}
                      onChange={() => {
                        setSelectedRemovePhotoIds((prev) =>
                          prev.includes(photo.photo_id)
                            ? prev.filter((id) => id !== photo.photo_id)
                            : [...prev, photo.photo_id]
                        );
                      }}
                      disabled={removingPhotos}
                    />
                  )}
                  {photo.url ? (
                    <Image src={photo.url} alt={photo.metadata?.description || ''} className="w-full h-auto rounded-lg" width={500} height={300} />
                  ) : (
                    <div className="w-full h-auto rounded-lg bg-gray-300">No Image Available</div>
                  )}
                  <p className="text-sm text-black">{photo.metadata?.description || ''}</p>
                </div>
              ))}
            </div>

            {showAddPhotos && (
              <div className="my-4 border rounded p-4 bg-gray-50">
                <h3 className="font-semibold mb-2 text-black">Select photos to add:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                  {userPhotos
                    .filter(
                      (photo) =>
                        !photos.some((p) => p.photo_id === photo.photo_id)
                    )
                    .map((photo) => (
                      <label key={photo.photo_id} className="flex flex-col items-center cursor-pointer border-2 border-gray-300 rounded-lg p-2">
                        <input
                          type="checkbox"
                          className="mb-1"
                          checked={selectedPhotoIds.includes(photo.photo_id)}
                          onChange={() => handlePhotoCheckbox(photo.photo_id)}
                          disabled={addingPhotos}
                        />
                        {photo.url ? (
                          <Image
                            src={photo.url}
                            alt={photo.metadata?.description || ''}
                            className="rounded-lg"
                            width={100}
                            height={70}
                          />
                        ) : (
                          <div className="w-[100px] h-[70px] bg-gray-300 rounded-lg flex items-center justify-center text-xs">
                            No Image
                          </div>
                        )}
                        <span className="text-xs text-black text-center">{photo.metadata?.description || ''}</span>
                      </label>
                    ))}
                </div>
                <button
                  className="btn btn-success mt-3"
                  onClick={handleAddSelectedPhotos}
                  disabled={addingPhotos || selectedPhotoIds.length === 0}
                >
                  {addingPhotos ? 'Adding...' : 'Add Selected Photos'}
                </button>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowAddPhotos((v) => !v);
                  setShowRemovePhotos(false);
                  setSelectedRemovePhotoIds([]);
                }}
                disabled={addingPhotos || removingPhotos}
              >
                {showAddPhotos ? 'Cancel' : 'Add Photos'}
              </button>
              <button
                className="btn btn-warning"
                onClick={() => {
                  setShowRemovePhotos((v) => !v);
                  setShowAddPhotos(false);
                  setSelectedPhotoIds([]);
                }}
                disabled={removingPhotos || addingPhotos}
              >
                {showRemovePhotos ? 'Cancel' : 'Remove Photos'}
              </button>

              {showRemovePhotos && (
                <button
                  className="btn btn-error"
                  onClick={async () => {
                    if (!selectedAlbum) return;
                    setRemovingPhotos(true);
                    try {
                      for (const photoId of selectedRemovePhotoIds) {
                        // You need to implement this function in your hooks/dynamoDB
                        await removePhotoFromAlbum(photoId, selectedAlbum.album_id);
                      }
                      // Refresh album photos
                      const albumPhotos = await getPhotosByAlbum(selectedAlbum.album_id);
                      setPhotos(albumPhotos);
                      setShowRemovePhotos(false);
                      setSelectedRemovePhotoIds([]);
                    } catch (error) {
                      alert('Failed to remove photos.');
                    } finally {
                      setRemovingPhotos(false);
                    }
                  }}
                  disabled={removingPhotos || selectedRemovePhotoIds.length === 0}
                >
                  {removingPhotos ? 'Removing...' : 'Remove Selected Photos'}
                </button>
              )}
            </div>

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-secondary"
                disabled={deleting || addingPhotos}
              >
                Close
              </button>
              {auth && (
                <>
                  <button
                    onClick={handleDeleteAlbum}
                    className="btn btn-error"
                    disabled={deleting || addingPhotos}
                    >
                      {deleting ? 'Deleting...' : 'Delete Album'}
                    </button>
                  </>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbumsCard;