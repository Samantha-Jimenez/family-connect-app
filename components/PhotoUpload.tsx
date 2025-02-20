'use client';

import { useState } from 'react';
import Image from 'next/image';

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
    const formData = new FormData();
    formData.append('file', file);
    formData.append('location', JSON.stringify(location));
    formData.append('description', description);
    formData.append('dateTaken', dateTaken);
    formData.append('peopleTagged', peopleTagged);

    console.log('Form data being sent:', {
      location,
      description,
      dateTaken,
      peopleTagged
    });

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      const result = await response.json();
      console.log('Upload response:', result);

      setFile(null);
      setLocation({ country: '', state: '', city: '', neighborhood: '' });
      setDescription('');
      setDateTaken('');
      setPeopleTagged('');
      onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
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
