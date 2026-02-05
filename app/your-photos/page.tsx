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

export default function YourPhotos() {
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

      // Get auth token to include in request
      let authHeaders: HeadersInit = {};
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if (token) {
          authHeaders = {
            'Authorization': `Bearer ${token}`,
          };
        }
      } catch (authError) {
        console.warn('Could not get auth token, relying on cookies:', authError);
      }

      const response = await fetch(`/api/photos?userId=${encodeURIComponent(user.userId)}`, {
        headers: authHeaders,
        credentials: 'include', // Ensure cookies are sent
      });

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API error:', errorData);
        setUserPhotos([]);
        return;
      }

      const data = await response.json();
      
      // Check if data.photos exists and is an array before filtering
      if (!data || !Array.isArray(data.photos)) {
        console.warn('Invalid API response format:', data);
        setUserPhotos([]);
        return;
      }
      
      const filteredPhotos = data.photos.filter((photo: Photo) => 
        photo.uploaded_by === user.userId
      );

      setUserPhotos(filteredPhotos);
    } catch (error) {
      console.error("Error fetching user photos:", error);
      setUserPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Your Photos</h1>
        <p>Loading your photos...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Your Photos</h1>
      
      {userPhotos.length === 0 ? (
        <p>You haven't uploaded any photos yet.</p>
      ) : (
        <>
          <p className="mb-4">Total photos: {userPhotos.length}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {userPhotos.map((photo, index) => (
              <div key={photo.photo_id} className="relative aspect-square">
                <Image
                  src={photo.url || ''}
                  alt={`Photo ${index + 1}`}
                  fill
                  className="object-cover rounded-lg hover:opacity-90 transition-opacity"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}