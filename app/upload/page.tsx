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
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12 bg-gray-100 overflow-y-auto md:h-screen min-h-[70rem] md:min-h-0 opacity-0 animate-[fadeIn_0.6s_ease-in_forwards]">
      <div className="mx-auto">
          <div className="rounded-lg p-4 sm:p-6 border border-gray-300 shadow-lg bg-white">
            <h1 className="text-2xl sm:text-3xl md:text-4xl text-black mb-4 mt-1">
              Upload your photos to share with your family
            </h1>
            <PhotoUpload onUploadComplete={handlePhotoUploaded} />
          </div>
      </div>
    </div>
  )
}

export default Upload;