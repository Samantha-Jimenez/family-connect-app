"use client";
import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import Image from 'next/image';
import { PhotoData, TaggedPerson } from '@/hooks/dynamoDB';


export default function TaggedPhotosCard() {
  const [taggedPhotos, setTaggedPhotos] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTaggedPhotos();
  }, []);

  const fetchTaggedPhotos = async () => {
    try {
      const user = await getCurrentUser();
      if (!user?.userId) {
        throw new Error("User not authenticated");
      }

      const response = await fetch('/api/photos');
      const data = await response.json();
      // Filter photos where the current user is tagged
      const filteredPhotos = data.photos.filter((photo: PhotoData) => {
        return photo.metadata?.people_tagged?.some((person: TaggedPerson) => person.id === user.userId);
      });
      setTaggedPhotos(filteredPhotos);
    } catch (error) {
      console.error("Error fetching tagged photos:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card bg-white text-black shadow-lg p-6">
        <h2 className="text-xl font-bold">Tagged Photos</h2>
        <p className="mt-2">Loading tagged photos...</p>
      </div>
    );
  }

  return (
    <div className="card bg-white text-black shadow-lg p-6">
      <h2 className="text-xl font-bold">Tagged Photos</h2>
      <p className="mt-2 italic">Photos you&apos;re tagged in ({taggedPhotos.length})</p>
      
      <div className="mt-4 grid grid-cols-3 gap-2">
        {taggedPhotos.slice(0, 6).map((photo, index) => (
          <div key={photo.photo_id} className="relative aspect-square">
            <Image
              src={photo.url || ''}
              alt={`Tagged Photo ${index + 1}`}
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
        View All Tagged Photos
      </button> */}
    </div>
  );
}