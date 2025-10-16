'use client';
import PhotoUpload from '@/components/PhotoUpload';
import React, { useState } from 'react'

const Upload = () => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handlePhotoUploaded = () => {
    setRefreshing(true);
  };

  return (
    <div className="container mx-auto px-4 py-12 bg-gray-100 overflow-y-scroll md:h-screen h-[70rem] opacity-0 animate-[fadeIn_0.6s_ease-in_forwards]">
      <div className="mx-auto">
          <div className="rounded-lg p-4 border border-gray-300 shadow-lg bg-white">
            <h1 className="text-4xl text-black mb-4 mt-1">
              Upload your photos to share with your family
            </h1>
            <PhotoUpload onUploadComplete={handlePhotoUploaded} />
          </div>
      </div>
    </div>
  )
}

export default Upload;