'use client';

import { useState } from 'react';
import Image from 'next/image';

function PhotoUpload() {
  const [image, setImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files) {
      setImage(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!image) return;
    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', image);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || `Upload failed with status: ${res.status}`);
      }

      const data = await res.json();
      if (data.url) {
        console.log('Uploaded image URL:', data.url);
        setUploadUrl(data.url);
      }
    } catch (error) {
      console.error('Upload failed', error);
      setError(error instanceof Error ? error.message : 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block mb-2 text-sm font-medium text-gray-500 dark:text-white" 
               htmlFor="photo_upload">
          Upload Photo
        </label>
        <input
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
          id="photo_upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading || !image}
        className={`w-full px-4 py-2 text-white rounded-lg ${
          uploading || !image
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {uploading ? 'Uploading...' : 'Upload Photo'}
      </button>

      {uploadUrl && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Uploaded Photo:</h3>
          <div className="relative w-full h-[300px]">
            <Image
              src={uploadUrl}
              alt="Uploaded photo"
              fill
              className="object-contain rounded-lg"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default PhotoUpload;
