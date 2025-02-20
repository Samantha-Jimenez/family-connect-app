"use client";

import React, { useState, useEffect } from 'react'
import Image from 'next/image';
import PhotoUpload from '@/components/PhotoUpload';

interface Photo {
  url: string;
  metadata: {
    location?: {
      country?: string;
      state?: string;
      city?: string;
      neighborhood?: string;
    };
    description?: string;
    dateTaken?: string;
    peopleTagged?: string;
  };
  lastModified?: Date;
}

// Add this helper function at the top of the file, before the Photos component
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

const Photos = () => {
  const [currentIndex, setCurrentIndex] = useState(0); // State to track the current index
  const [images, setImages] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const response = await fetch('/api/photos');
      const data = await response.json();
      console.log('Raw API response:', data); // Temporary debug log
      if (data.photos) {
        const photoUrls = data.photos.map((photo: { 
          url: string;
          metadata?: {
            location?: string | {
              country?: string;
              state?: string;
              city?: string;
              neighborhood?: string;
            };
            description?: string;
            dateTaken?: string;
            peopleTagged?: string;
          };
          lastModified?: string;
        }) => {
          // Parse location if it's a string
          let locationData = {};
          if (typeof photo.metadata?.location === 'string') {
            try {
              locationData = JSON.parse(photo.metadata.location);
            } catch (e) {
              console.error('Error parsing location:', e);
            }
          } else if (photo.metadata?.location) {
            locationData = photo.metadata.location;
          }

          const processedPhoto = {
            url: photo.url,
            metadata: {
              location: locationData,
              description: photo.metadata?.description || '',
              dateTaken: photo.metadata?.dateTaken || '',
              peopleTagged: photo.metadata?.peopleTagged || ''
            },
            lastModified: photo.lastModified ? new Date(photo.lastModified) : undefined
          };
          console.log('Processed photo:', processedPhoto); // Temporary debug log
          return processedPhoto;
        });
        setImages(photoUrls);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length); // Cycle to the next image
  };

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length); // Cycle to the previous image
  };

  // Add this function to refresh photos after upload
  const handlePhotoUploaded = () => {
    fetchPhotos();
  };

  const handleImageClick = (photo: Photo) => {
    console.log('Clicked photo:', photo); // Temporary debug log
    setSelectedPhoto(photo);
  };

  const closeModal = () => {
    setSelectedPhoto(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Photo Upload</h1>
      <div className="max-w-lg mx-auto">
        <PhotoUpload onUploadComplete={handlePhotoUploaded} />
        <div className="mt-1 text-sm text-gray-500 dark:text-gray-300">
          Upload your photos to share with your family
        </div>
      </div>
      <div className="flex items-center justify-center py-4 md:py-8 flex-wrap">
          <button type="button" className="border hover:bg-blue-700 focus:ring-4 focus:outline-none rounded-full text-base font-medium px-5 py-2.5 text-center me-3 mb-3 border-blue-500 text-blue-500 hover:text-white hover:bg-blue-500 bg-gray-900 focus:ring-blue-800">All categories</button>
          <button type="button" className="border border-gray-900 bg-gray-900 hover:border-gray-700 focus:ring-4 focus:outline-none  rounded-full text-base font-medium px-5 py-2.5 text-center me-3 mb-3 text-white focus:ring-gray-800">Shoes</button>
          <button type="button" className="border border-gray-900 bg-gray-900 hover:border-gray-700 focus:ring-4 focus:outline-none  rounded-full text-base font-medium px-5 py-2.5 text-center me-3 mb-3 text-white focus:ring-gray-800">Bags</button>
          <button type="button" className="border border-gray-900 bg-gray-900 hover:border-gray-700 focus:ring-4 focus:outline-none  rounded-full text-base font-medium px-5 py-2.5 text-center me-3 mb-3 text-white focus:ring-gray-800">Electronics</button>
          <button type="button" className="border border-gray-900 bg-gray-900 hover:border-gray-700 focus:ring-4 focus:outline-none  rounded-full text-base font-medium px-5 py-2.5 text-center me-3 mb-3 text-white focus:ring-gray-800">Gaming</button>
      </div>

        <div id="default-carousel" className="relative w-full" data-carousel="slide">
          <div className="relative h-56 overflow-hidden rounded-lg md:h-96">
              {images.map((photo, index) => (
                  <div
                      key={index}
                      className={`absolute w-full h-full transition-opacity duration-700 ease-in-out ${
                          index === currentIndex ? 'opacity-100' : 'opacity-0'
                      }`}
                  >
                      <Image
                          src={photo.url}
                          alt={`Slide ${index + 1}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 1200px"
                          className="object-cover"
                          priority={index === 0}
                      />
                  </div>
              ))}
          </div>
          <div className="absolute z-30 flex -translate-x-1/2 bottom-5 left-1/2 space-x-3 rtl:space-x-reverse">
              {images.map((_, index) => (
                  <button
                      key={index}
                      type="button"
                      className={`w-3 h-3 rounded-full ${
                          currentIndex === index 
                              ? 'bg-white dark:bg-gray-800' 
                              : 'bg-white/50 dark:bg-gray-800/50'
                      }`}
                      aria-current={currentIndex === index}
                      aria-label={`Slide ${index + 1}`}
                      onClick={() => setCurrentIndex(index)}
                  />
              ))}
          </div>
          <div className="flex justify-center items-center pt-4">
            <button type="button" className="absolute top-0 start-0 z-30 flex items-center justify-center h-full px-4 cursor-pointer group focus:outline-none" onClick={handlePrev}>
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-800/30 group-hover:bg-gray-800/60 group-focus:ring-4 group-focus:ring-white dark:group-focus:ring-gray-800/70 group-focus:outline-none">
                    <svg className="w-4 h-4 text-white dark:text-gray-800 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 1 1 5l4 4"/>
                    </svg>
                    <span className="sr-only">Previous</span>
                </span>
            </button>
            <button type="button" className="absolute top-0 end-0 z-30 flex items-center justify-center h-full px-4 cursor-pointer group focus:outline-none" onClick={handleNext}>
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-800/30 group-hover:bg-gray-800/60 group-focus:ring-4 group-focus:ring-white dark:group-focus:ring-gray-800/70 group-focus:outline-none">
                    <svg className="w-4 h-4 text-white dark:text-gray-800 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                    </svg>
                    <span className="sr-only">Next</span>
                </span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...images].map((photo, index) => (
            <div 
              key={index} 
              className="relative h-48 cursor-pointer"
              onClick={() => handleImageClick(photo)}
            >
              <Image
                className="rounded-lg object-cover"
                src={photo.url}
                alt={`Gallery image ${index + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                priority={index === 0}
              />
            </div>
          ))}
        </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeModal}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full m-4" onClick={e => e.stopPropagation()}>
            <div className="relative h-96 mb-4">
              <Image
                src={selectedPhoto.url}
                alt="Selected photo"
                fill
                className="object-contain rounded-lg"
              />
            </div>
            <div className="space-y-2">
              {selectedPhoto.metadata?.location && typeof selectedPhoto.metadata.location === 'object' && Object.values(selectedPhoto.metadata.location).some(val => val) && (
                <div className="text-sm">
                  <span className="font-bold">Location: </span>
                  {[
                    selectedPhoto.metadata.location.country,
                    selectedPhoto.metadata.location.state,
                    selectedPhoto.metadata.location.city,
                    selectedPhoto.metadata.location.neighborhood
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              )}
              {selectedPhoto.metadata?.description && (
                <p className="text-sm">
                  <span className="font-bold">Description: </span>
                  {selectedPhoto.metadata.description}
                </p>
              )}
              {selectedPhoto.metadata?.dateTaken && (
                <p className="text-sm">
                  <span className="font-bold">Date Taken: </span>
                  {formatDate(selectedPhoto.metadata.dateTaken)}
                </p>
              )}
              {selectedPhoto.metadata?.peopleTagged && (
                <p className="text-sm">
                  <span className="font-bold">People Tagged: </span>
                  {selectedPhoto.metadata.peopleTagged}
                </p>
              )}
            </div>
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={closeModal}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Photos