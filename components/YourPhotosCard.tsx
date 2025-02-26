"use client";

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import Image from 'next/image';

interface Photo {
  photo_id: string;
  s3_key: string;
  uploaded_by: string;
  upload_date: string;
  url?: string;
}

export default function YourPhotosCard() {
  const [userPhotos, setUserPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserPhotos();
  }, []);

  const fetchUserPhotos = async () => {
    try {
      const user = await getCurrentUser();
      if (!user?.userId) {
        throw new Error("User not authenticated");
      }

      const response = await fetch('/api/photos');
      const data = await response.json();
      
      // Simplified filtering - just check the uploaded_by field
      const filteredPhotos = data.photos.filter((photo: Photo) => 
        photo.uploaded_by === user.userId
      );

      console.log('Current user ID:', user.userId); // Debug log
      console.log('Filtered photos:', filteredPhotos); // Debug log
      setUserPhotos(filteredPhotos);
    } catch (error) {
      console.error("Error fetching user photos:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card bg-white text-black shadow-lg p-6">
        <h2 className="text-xl font-bold">Uploaded Photos</h2>
        <p className="mt-2">Loading your photos...</p>
      </div>
    );
  }

  return (
    <div className="card bg-white text-black shadow-lg p-6">
      <h2 className="text-xl font-bold">Uploaded Photos</h2>
      <p className="mt-2 italic">Photos you've uploaded ({userPhotos.length})</p>
      
      <div className="mt-4 grid grid-cols-3 gap-2">
        {userPhotos.slice(0, 6).map((photo, index) => (
          <div key={photo.photo_id} className="relative aspect-square">
            <Image
              src={photo.url || ''}
              alt={`Photo ${index + 1}`}
              fill
              className="object-cover rounded"
              sizes="(max-width: 768px) 33vw, 20vw"
            />
          </div>
        ))}
      </div>

      {/* <button 
        className="btn btn-outline mt-4 bg-[#ffdaad] border-0 text-gray-700 w-full"
        onClick={() => window.location.href = '/your-photos'}
      >
        View All Your Photos
      </button> */}
    </div>
  );
}