"use client";

import React, { useState, useEffect, MouseEvent, useMemo } from 'react'
import Image from 'next/image';
import PhotoUpload from '@/components/PhotoUpload';
import { Range, getTrackBackground } from 'react-range';
import { FamilyMemberProps } from '../familytree/page'; // Adjust the import path as necessary
import { familyTreeData } from '../familytree/familyTreeData'; // Import familyTreeData
import { FamilyMember, getAllFamilyMembers, getAllPhotosByTagged, PhotoData, TaggedPerson } from '@/hooks/dynamoDB'; // Import the functions

interface DateRange {
  min: number;
  max: number;
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

const dateToTimestamp = (date: string): number => {
  if (!date) {
    console.warn('Empty date string encountered, using default date');
    return new Date('1970-01-01').getTime(); // Use a default date
  }
  
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    console.error('Invalid date string:', date);
    return new Date('1970-01-01').getTime(); // Use a default date
  }
  return parsedDate.getTime();
};

const timestampToDate = (timestamp: number): string => {
  return formatDate(new Date(timestamp).toISOString());
};

// Add this helper function after the existing helper functions
const formatPhotoCount = (filtered: number, total: number) => {
  return `Showing ${filtered} of ${total} photos`;
};

// Add this new component function
const PhotoCount = ({ filtered, total }: { filtered: number, total: number }) => {
  return (
    <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {formatPhotoCount(filtered, total)}
      </span>
    </div>
  );
};

// Utility function to extract all family member names
const extractFamilyMemberNames = (member: FamilyMemberProps): string[] => {
  let names = [member.first_name];
  if (member.spouse) {
    names.push(member.spouse.first_name);
  }
  if (member.children) {
    member.children.forEach(child => {
      names = names.concat(extractFamilyMemberNames(child));
    });
  }
  if (member.previousSpouses) {
    member.previousSpouses.forEach(spouse => {
      names.push(`${spouse.first_name} ${spouse.last_name}`);
      spouse.children.forEach(child => {
        names = names.concat(extractFamilyMemberNames(child));
      });
    });
  }
  return names;
};

const Photos = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [images, setImages] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [dateRange, setDateRange] = useState<DateRange>({ min: 0, max: 0 });
  const [currentDateRange, setCurrentDateRange] = useState<[number, number]>([0, 0]);
  const [filteredImages, setFilteredImages] = useState<PhotoData[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<TaggedPerson | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    fetchPhotos();
    fetchFamilyMembers(); // Fetch family members on component mount
    
    // Refresh photos every 45 minutes to ensure URLs don't expire
    const interval = setInterval(fetchPhotos, 45 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const validFilteredImages = filteredImages.filter(img => img.metadata?.date_taken);
    if (validFilteredImages.length > 0) {
      const timestamps = validFilteredImages
        .map(img => dateToTimestamp(img.metadata?.date_taken || ''))
        .filter(timestamp => !isNaN(timestamp));
      
      const min = Math.min(...timestamps);
      const max = Math.max(...timestamps);
      
      setDateRange({ min, max });
      setCurrentDateRange([min, max]);
    } else if (images.length > 0) {
      // Fallback to all images if no filtered images are present
      const validImages = images.filter(img => img.metadata?.date_taken);
      const timestamps = validImages
        .map(img => dateToTimestamp(img.metadata?.date_taken || ''))
        .filter(timestamp => !isNaN(timestamp));
      
      const min = Math.min(...timestamps);
      const max = Math.max(...timestamps);
      
      setDateRange({ min, max });
      setCurrentDateRange([min, max]);
    }
  }, [images, filteredImages, selectedPerson, selectedLocation, selectedPersonId]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/photos');
      const data = await response.json();

      if (data.error) {
        console.error('API returned error:', data.error);
        return;
      }

      if (data.photos) {
        const photoUrls = data.photos.map((photo: any) => {
          return {
            album_id: photo.album_id,
            photo_id: photo.photo_id,
            s3_key: photo.s3_key,
            uploaded_by: photo.uploaded_by,
            upload_date: photo.upload_date,
            metadata: {
              description: photo.metadata?.description,
              date_taken: photo.metadata?.date_taken,
              people_tagged: photo.metadata?.people_tagged,
              location: {
                country: photo.metadata?.location?.country || '',
                state: photo.metadata?.location?.state || '',
                city: photo.metadata?.location?.city || '',
                neighborhood: photo.metadata?.location?.neighborhood || ''
              },
            },
            url: photo.url,
            lastModified: photo.lastModified ? new Date(photo.lastModified).toISOString() : undefined
          };
        });
        
        setImages(photoUrls);
        setFilteredImages(photoUrls); // Initialize filteredImages with all photos
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotosByTaggedUser = async (id: string) => {
    try {
      setLoading(true);

      const response = await fetch('/api/photos');
      const data = await response.json();

      const filteredPhotos = data.photos.filter((photo: PhotoData) => {
        return photo.metadata?.people_tagged?.some((person: TaggedPerson) => person.id === id);
      });
      setImages(filteredPhotos);
      setFilteredImages(filteredPhotos);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilyMembers = async () => {
    try {
      const members = await getAllFamilyMembers();
      const formattedMembers = members.map(member => ({
        family_member_id: member.family_member_id,
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        username: member.username || '', // Provide default values for missing properties
        bio: member.bio || '',
        phone_number: member.phone_number || '',
        birthday: member.birthday || '',
        birth_city: member.birth_city || '',
        birth_state: member.birth_state || '',
        profile_photo: member.profile_photo || '',
        current_city: member.current_city || '',
        current_state: member.current_state || ''
      }));
      setFamilyMembers(formattedMembers);
    } catch (error) {
      console.error('Error fetching family members:', error);
    }
  };

  const mapNameToId = (name: string): string | undefined => {
    const member = familyMembers.find(member => `${member.first_name} ${member.last_name}` === name);
    return member ? member.family_member_id : undefined;
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex: number) => (prevIndex + 1) % images.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prevIndex: number) => (prevIndex - 1 + images.length) % images.length);
  };

  const handlePhotoUploaded = async () => {
    setRefreshing(true);
    try {
      await fetchPhotos();
      // After fetching photos, set the current index to 0 to show the newest photo
      setCurrentIndex(0);
    } finally {
      setRefreshing(false);
    }
  };

  const handleImageClick = (photo: PhotoData) => {
    setSelectedPhoto(photo);
  };

  const closeModal = () => {
    setSelectedPhoto(null);
  };

  const handleModalClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  // Update the image error handler
  const handleImageError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    console.error('Error loading image:', e.currentTarget.src);
    // Optionally set a fallback image
    // e.currentTarget.src = '/fallback-image.jpg';
  };

  const filterImagesByDateRangeLocationAndPerson = (range: [number, number], location: string | null, person: TaggedPerson | null) => {
    const filtered = images.filter(image => {
      const timestamp = dateToTimestamp(image.metadata?.date_taken || '');
      const matchesDateRange = timestamp >= range[0] && timestamp <= range[1];
      const matchesLocation = !location || (image.metadata?.location && Object.values(image.metadata.location).includes(location));
      const matchesPerson = !person || (image.metadata?.people_tagged && image.metadata.people_tagged.some(tagged => tagged.id === person.id));
      return matchesDateRange && matchesLocation && matchesPerson;
    });
    setFilteredImages(filtered);
  };

  const handleRangeChange = (values: number[]) => {
    const rangeValues: [number, number] = [values[0], values[1]];
    setCurrentDateRange(rangeValues);
    const taggedPerson = selectedPersonId && selectedPerson ? { id: selectedPersonId, name: selectedPerson.name } : null;
    filterImagesByDateRangeLocationAndPerson(rangeValues, selectedLocation, taggedPerson);
  };

  const handleLocationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const location = event.target.value || null;
    setSelectedLocation(location);
    filterImagesByDateRangeLocationAndPerson(currentDateRange, location, selectedPerson);
  };

  const handlePersonChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const personName = event.target.value || null;

    if (personName) {
      const personId = mapNameToId(personName);
      if (personId) {
        const taggedPerson: TaggedPerson = { id: personId, name: personName };
        setSelectedPerson(taggedPerson); // Set as TaggedPerson
        setSelectedPersonId(personId);
        // Fetch photos by tagged user when a person is selected
        await fetchPhotosByTaggedUser(personId);
      } else {
        console.error('No ID found for the selected person');
        setSelectedPerson(null);
        setSelectedPersonId(null);
      }
    } else {
      console.log("no person selected");
      setSelectedPerson(null); // Reset to null if no person is selected
      setSelectedPersonId(null);
      setFilteredImages(images); // Reset to all images if no person is selected
    }
  };

  const uniqueLocations = useMemo(() => {
    const locations = images.map(image => image.metadata?.location).filter(Boolean);
    const locationSet = new Set<string>();
    locations.forEach(location => {
      if (location) {
        Object.values(location).forEach(loc => {
          if (loc) locationSet.add(loc);
        });
      }
    });
    return Array.from(locationSet);
  }, [images]);

  const resetFilters = async () => {
    setSelectedLocation(null);
    setSelectedPerson(null);
    setSelectedPersonId(null);
    setCurrentDateRange([dateRange.min, dateRange.max]);
    
    // Fetch all photos again to reset the view
    await fetchPhotos();
    
    // Reset the filtered images to all images
    setFilteredImages(images);
  };

  const renderDateRangeSlider = () => {
    if (dateRange.min === dateRange.max) return null;

    // Check if there is more than one photo
    // if (filteredImages.length <= 1) return null;

    return (
      <div className="mb-8 px-4">
        {/* Add the photo count display */}
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {formatPhotoCount(filteredImages.length, images.length)}
        </div>

        <div className="mb-2 flex justify-between text-sm text-gray-600">
          <span>{timestampToDate(currentDateRange[0])}</span>
          <span>{timestampToDate(currentDateRange[1])}</span>
        </div>
        <Range
          values={currentDateRange}
          step={86400000} // One day in milliseconds
          min={dateRange.min}
          max={dateRange.max}
          onChange={handleRangeChange}
          renderTrack={({ props, children }) => (
            <div
              {...props}
              className="h-2 w-full rounded bg-gray-200"
              style={{
                background: getTrackBackground({
                  values: currentDateRange,
                  colors: ["#e5e7eb", "#3b82f6", "#e5e7eb"],
                  min: dateRange.min,
                  max: dateRange.max
                })
              }}
            >
              {children}
            </div>
          )}
          renderThumb={({ props, isDragged }) => {
            const { key, ...restProps } = props;
            return (
              <div
                key={key}
                {...restProps}
                className={`h-4 w-4 rounded-full bg-blue-500 focus:outline-none ${isDragged ? 'shadow-lg' : ''}`}
              />
            );
          }}
        />
      </div>
    );
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
      <div className="mx-auto">
        <button 
          onClick={() => setIsUploadOpen(!isUploadOpen)}
          className="w-full text-left text-2xl font-bold mb-2 flex items-center"
        >
          <span>Upload a Photo</span>
          <svg 
            className={`w-6 h-6 ml-2 transition-transform duration-300 ease-in-out ${isUploadOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <div 
          className={`transform transition-all duration-1000 ease-in-out origin-top ${
            isUploadOpen 
              ? 'opacity-100 scale-y-100 max-h-full mb-8' 
              : 'opacity-0 scale-y-0 max-h-0 mb-0'
          }`}
        >
          <div className="rounded-lg p-4">
            <PhotoUpload onUploadComplete={handlePhotoUploaded} />
            {refreshing && (
              <div className="text-sm text-blue-500 mt-2">
                Refreshing gallery...
              </div>
            )}
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-300">
              Upload your photos to share with your family
            </div>
          </div>
        </div>
      </div>

      {/* Gallery section with transition */}
      <div 
        // className={`transition-all duration-500 linear transform ${
        //   isUploadOpen ? 'translate-y-4' : 'translate-y-0'
        // }`}
      >
        {/* <div className="flex items-center justify-center py-4 md:py-8 flex-wrap">
          <button type="button" className="border hover:bg-blue-700 focus:ring-4 focus:outline-none rounded-full text-base font-medium px-5 py-2.5 text-center me-3 mb-3 border-blue-500 text-blue-500 hover:text-white hover:bg-blue-500 bg-gray-900 focus:ring-blue-800">All categories</button>
          <button type="button" className="border border-gray-900 bg-gray-900 hover:border-gray-700 focus:ring-4 focus:outline-none  rounded-full text-base font-medium px-5 py-2.5 text-center me-3 mb-3 text-white focus:ring-gray-800">Shoes</button>
          <button type="button" className="border border-gray-900 bg-gray-900 hover:border-gray-700 focus:ring-4 focus:outline-none  rounded-full text-base font-medium px-5 py-2.5 text-center me-3 mb-3 text-white focus:ring-gray-800">Bags</button>
          <button type="button" className="border border-gray-900 bg-gray-900 hover:border-gray-700 focus:ring-4 focus:outline-none  rounded-full text-base font-medium px-5 py-2.5 text-center me-3 mb-3 text-white focus:ring-gray-800">Electronics</button>
          <button type="button" className="border border-gray-900 bg-gray-900 hover:border-gray-700 focus:ring-4 focus:outline-none  rounded-full text-base font-medium px-5 py-2.5 text-center me-3 mb-3 text-white focus:ring-gray-800">Gaming</button>
        </div> */}

        <div className="flex justify-center mb-4">
          <PhotoCount filtered={filteredImages.length} total={images.length} />
        </div>

        {/* Location filter dropdown */}
        <div className="mb-4">
          <label htmlFor="location-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by Location:
          </label>
          <select
            id="location-filter"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={selectedLocation || ''}
            onChange={handleLocationChange}
          >
            <option value="">All Locations</option>
            {uniqueLocations.map((location, index) => (
              <option key={index} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        {/* Person filter dropdown */}
        <div className="mb-4">
          <label htmlFor="person-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by Person:
          </label>
          <select
            id="person-filter"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={selectedPerson ? selectedPerson.name : ''}
            onChange={handlePersonChange}
          >
            <option value="">All People</option>
            {familyMembers.map((member, index) => (
              <option key={index} value={member.first_name + ' ' + member.last_name}>
                {member.first_name + ' ' + member.last_name}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        <div className="mb-4">
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Clear Filters
          </button>
        </div>

        {renderDateRangeSlider()}

        <div id="default-carousel" className="relative w-full" data-carousel="slide">
          <div className="relative h-56 overflow-hidden rounded-lg md:h-96">
            {filteredImages.map((photo, index) => (
              <div
                key={index}
                className={`absolute w-full h-full transition-opacity duration-700 ease-in-out ${
                  index === currentIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Image
                  src={photo.url || '/fallback-image.jpg'}
                  alt={photo.metadata?.description || 'Photo'}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={index === 0}
                  className="object-cover"
                  onError={handleImageError}
                />
              </div>
            ))}
          </div>
          <div className="absolute z-30 flex -translate-x-1/2 bottom-5 left-1/2 space-x-3 rtl:space-x-reverse">
              {filteredImages.map((_, index) => (
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
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...filteredImages].map((photo, index) => (
          <div 
            key={index} 
            className="relative h-48 cursor-pointer"
            onClick={() => handleImageClick(photo)}
          >
            <Image
              className="rounded-lg object-cover w-full h-full"
              src={photo.url || '/fallback-image.jpg'}
              alt={photo.metadata?.description || 'Photo'}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
              priority={index === 0}
              onError={handleImageError}
            />
          </div>
        ))}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeModal}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full m-4" onClick={handleModalClick}>
            <div className="relative mb-4">
              <Image
                src={selectedPhoto.url || '/fallback-image.jpg'}
                alt="Selected photo"
                width={500}
                height={300}
                className="object-contain rounded-lg"
                onError={handleImageError}
              />
            </div>
            <div className="space-y-2">
              {selectedPhoto.metadata?.location && typeof selectedPhoto.metadata.location === 'object' && Object.values(selectedPhoto.metadata.location).some(val => val) && (
                <div className="text-sm text-gray-800 dark:text-gray-200">
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
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <span className="font-bold">Description: </span>
                  {selectedPhoto.metadata?.description}
                </p>
              )}
              {selectedPhoto.metadata?.date_taken && (
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <span className="font-bold">Date Taken: </span>
                  {formatDate(selectedPhoto.metadata?.date_taken || '')}
                </p>
              )}
              {selectedPhoto.metadata?.people_tagged && (
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <span className="font-bold">People Tagged: </span>
                  {selectedPhoto.metadata?.people_tagged.map(person => person.name).join(', ')}
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