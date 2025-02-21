'use client';

import { useState } from 'react';
import Image from 'next/image';
import { savePhotoToDB } from '../app/hooks/dynamoDB';
import { getCurrentUser } from 'aws-amplify/auth';

interface PhotoUploadProps {
  onUploadComplete: () => void;
}

const PhotoUpload = ({ onUploadComplete }: PhotoUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [location, setLocation] = useState({
    country: '',
    state: '',
    city: '',
    neighborhood: ''
  });
  const [description, setDescription] = useState('');
  const [dateTaken, setDateTaken] = useState('');
  const [peopleTagged, setPeopleTagged] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLocationChange = (field: keyof typeof location) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setLocation(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Get the current user ID
      const user = await getCurrentUser();
      if (!user?.userId) {
        throw new Error("User not authenticated");
      }

      // First upload to S3
      const formData = new FormData();
      formData.append('file', file);
      formData.append('location', JSON.stringify(location));
      formData.append('description', description);
      formData.append('dateTaken', dateTaken);
      formData.append('peopleTagged', peopleTagged);
      formData.append('uploadedBy', user.userId); // Add user ID to form data

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Upload response:', result); // Debug log
      
      if (!result.key) {
        console.error('Upload response missing key:', result);
        throw new Error('Upload response missing key');
      }

      // Construct the full S3 URL
      const uploadUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/photos/${result.key}`;
      setUploadUrl(uploadUrl);

      // Process people tagged
      const processedPeopleTags = peopleTagged
        ? peopleTagged.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

      // Save to DynamoDB
      await savePhotoToDB({
        photo_id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        s3_key: `photos/${result.key}`,
        uploaded_by: user.userId, // Set the user ID here
        upload_date: new Date().toISOString(),
        description,
        location,
        date_taken: dateTaken,
        people_tagged: processedPeopleTags,
      });

      // Reset form
      setFile(null);
      setLocation({ country: '', state: '', city: '', neighborhood: '' });
      setDescription('');
      setDateTaken('');
      setPeopleTagged('');
      
      // Call onUploadComplete immediately
      onUploadComplete();

    } catch (error) {
      console.error('Upload error details:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Photo
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Location Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Country
            </label>
            <input
              type="text"
              value={location.country}
              onChange={handleLocationChange('country')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter country"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              State/Province
            </label>
            <input
              type="text"
              value={location.state}
              onChange={handleLocationChange('state')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter state/province"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              City
            </label>
            <input
              type="text"
              value={location.city}
              onChange={handleLocationChange('city')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter city"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Neighborhood
            </label>
            <input
              type="text"
              value={location.neighborhood}
              onChange={handleLocationChange('neighborhood')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter neighborhood"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Enter photo description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Date Taken
        </label>
        <input
          type="date"
          value={dateTaken}
          onChange={(e) => setDateTaken(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          People Tagged
        </label>
        <input
          type="text"
          value={peopleTagged}
          onChange={(e) => setPeopleTagged(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Enter names (comma separated)"
        />
      </div>

      <button
        type="submit"
        disabled={!file || uploading}
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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
    </form>
  );
};

export default PhotoUpload;
