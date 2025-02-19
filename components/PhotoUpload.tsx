'use client';

import { useState } from 'react';

function PhotoUpload() {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState(null);

  const handleFileChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!image) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', image);

    try {
      const res = await fetch('https://family-connect-app.vercel.app/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.url) {
        setUploadUrl(data.url);
      }
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>

      {uploadUrl && (
        <div>
          <h3>Uploaded Photo:</h3>
          <img src={uploadUrl} alt="Uploaded photo" width="300" />
        </div>
      )}
    </div>
  );
}

export default PhotoUpload;
