import React, { useState, useEffect } from 'react';
import { createAlbum, addPhotoToAlbum, getUserAlbums, getPhotosByAlbum } from '../hooks/dynamoDB';
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
    } catch (error) {
      console.error('Error fetching photos for album:', error);
    }
  };

  return (
    <div className="p-4 bg-white shadow-lg rounded-lg relative">
      {auth && (
        <>
      <h2 className="text-xl font-bold mb-2 text-black">Create Album</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Album Name"
          value={albumName}
          onChange={(e) => setAlbumName(e.target.value)}
          className="input input-bordered w-full mb-2"
        />
        <input
          type="text"
          placeholder="Album Description"
          value={albumDescription}
          onChange={(e) => setAlbumDescription(e.target.value)}
          className="input input-bordered w-full"
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

      <h2 className="text-xl font-bold mb-2 text-black">Your Albums</h2>
      <div className="space-y-4">
        {albums.map((album) => (
          <div
            key={album.album_id}
            className="p-4 bg-gray-100 rounded-lg shadow cursor-pointer"
            onClick={() => handleAlbumClick(album)}
          >
            <h3 className="text-lg font-semibold text-black">{album.name}</h3>
            <p className="text-sm text-black">{album.description}</p>
            <p className="text-xs text-gray-500">Created on: {new Date(album.created_date).toLocaleDateString()}</p>
            <p className="text-xs text-gray-500">Photos: {photoCounts[album.album_id] || 0}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-3/4 max-w-2xl">
            <h2 className="text-xl font-bold mb-4 text-black">{selectedAlbum?.name}</h2>
            <div className="grid grid-cols-2 gap-4">
              {photos.map((photo) => (
                <div key={photo.photo_id} className="p-2 bg-gray-200 rounded-lg">
                  {photo.url ? (
                    <Image src={photo.url} alt={photo.metadata?.description || ''} className="w-full h-auto rounded-lg" width={500} height={300} />
                  ) : (
                    <div className="w-full h-auto rounded-lg bg-gray-300">No Image Available</div>
                  )}
                  <p className="text-sm text-black">{photo.metadata?.description || ''}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="btn btn-secondary mt-4"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbumsCard;