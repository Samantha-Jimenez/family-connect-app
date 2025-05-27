"use client";

import React, { useState, useEffect, MouseEvent, useMemo } from 'react'
import Image from 'next/image';
import PhotoUpload from '@/components/PhotoUpload';
import { Range, getTrackBackground } from 'react-range';
import { FamilyMemberProps } from '../familytree/page'; // Adjust the import path as necessary
import { familyTreeData } from '../familytree/familyTreeData'; // Import familyTreeData
import { FamilyMember, getAllFamilyMembers, getAllPhotosByTagged, PhotoData, TaggedPerson, getUserData } from '@/hooks/dynamoDB'; // Import the functions
import { getCurrentUser } from 'aws-amplify/auth'; // Import your auth function
import PhotoModal from '@/components/PhotoModal';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';

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
      weekday: 'short',
      year: 'numeric',
      month: 'short',
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
      spouse.children?.forEach(child => {
        names = names.concat(extractFamilyMemberNames(child));
      });
    });
  }
  return names;
};

// Define your options types
interface LocationOption {
  value: string;
  label: string;
}

// State name mapping for normalization
const stateNameMap: { [key: string]: string } = {
  'CA': 'California',
  'NY': 'New York',
  // Add other state abbreviations as needed
};

function cleanAndGroupLocations(data: PhotoData[]) {
  const grouped: { [key: string]: { [key: string]: { [key: string]: string[] } } } = {};

  for (const item of data) {
    const location = item.metadata.location;
    let country = location.country.trim() || "United States";
    let state = location.state.trim();
    let city = location.city.trim();
    let neighborhood = location.neighborhood.trim();

    if (!state && !city) continue; // skip entries with no meaningful location

    state = stateNameMap[state] || state; // normalize short state codes

    if (!grouped[country]) grouped[country] = {};
    if (!grouped[country][state]) grouped[country][state] = {};
    if (!grouped[country][state][city]) grouped[country][state][city] = [];

    if (neighborhood && !grouped[country][state][city].includes(neighborhood)) {
      grouped[country][state][city].push(neighborhood);
    } else if (!neighborhood && !grouped[country][state][city].includes("")) {
      grouped[country][state][city].push("");
    }
  }
  console.log('grouped', grouped);
  return grouped;
}

const Photos = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [images, setImages] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [dateRange, setDateRange] = useState<DateRange>({ min: 0, max: 0 });
  const [currentDateRange, setCurrentDateRange] = useState<[number, number]>([0, 0]);
  const [filteredImages, setFilteredImages] = useState<PhotoData[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedPeople, setSelectedPeople] = useState<TaggedPerson[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [uploaderName, setUploaderName] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    location: {
      country: '',
      state: '',
      city: '',
      neighborhood: ''
    },
    description: '',
    peopleTagged: [] as TaggedPerson[]
  });
  const [locationHierarchy, setLocationHierarchy] = useState<any>({}); // Adjust type as needed

  const [countries, setCountries] = useState<LocationOption[]>([]);
  const [states, setStates] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<LocationOption[]>([]);

  const [selectedCountry, setSelectedCountry] = useState<LocationOption[]>([]);
  const [selectedState, setSelectedState] = useState<LocationOption[]>([]);
  const [selectedCity, setSelectedCity] = useState<LocationOption[]>([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<LocationOption[]>([]);

  const animatedComponents = makeAnimated();

  useEffect(() => {
    fetchPhotos();
    fetchFamilyMembers(); // Fetch family members on component mount
    
    // Refresh photos every 45 minutes to ensure URLs don't expire
    const interval = setInterval(fetchPhotos, 45 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const validImages = (filteredImages.length > 0 ? filteredImages : images)
      .filter(img => img.metadata?.date_taken);
  
    if (validImages.length > 0) {
      const timestamps = validImages
        .map(img => dateToTimestamp(img.metadata?.date_taken || ''))
        .filter(ts => !isNaN(ts));
  
      const min = Math.min(...timestamps);
      const max = Math.max(...timestamps);
  
      setDateRange({ min, max });
  
      if (currentDateRange[0] === 0 && currentDateRange[1] === 0) {
        setCurrentDateRange([min, max]);
      }
    }
  }, [images]);

  useEffect(() => {
    if (selectedPhoto?.uploaded_by) {
      fetchUploaderName(selectedPhoto.uploaded_by);
    }
  }, [selectedPhoto]);

  useEffect(() => {
    // Fetch the current user's ID on component mount
    const fetchCurrentUserId = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUserId(user.userId); // Assuming user object has a userId property
      } catch (error) {
        console.error('Error fetching current user ID:', error);
      }
    };

    fetchCurrentUserId();
  }, []);

  useEffect(() => {
    if (selectedPhoto) {
      setFormData({
        location: selectedPhoto.metadata.location,
        description: selectedPhoto.metadata.description || '',
        peopleTagged: selectedPhoto.metadata.people_tagged || []
      });
    }
  }, [selectedPhoto]);

  useEffect(() => {
    const groupedLocations = cleanAndGroupLocations(images);
    setLocationHierarchy(groupedLocations);
  }, [images]);

  useEffect(() => {
    const countriesList = Object.keys(locationHierarchy);
    setCountries(countriesList.map(country => ({ value: country, label: country })));
  }, [locationHierarchy]);

  useEffect(() => {
    if (selectedCountry.length > 0) {
      const statesList = selectedCountry.flatMap(country => 
        Object.keys(locationHierarchy[country.value] || {})
      );
      setStates(statesList.map(state => ({ value: state, label: state })));
    } else {
      setStates([]);
      setSelectedState([]);
      setSelectedCity([]);
      setSelectedNeighborhood([]);
    }
  }, [selectedCountry, locationHierarchy]);

  useEffect(() => {
    if (selectedState.length > 0 && selectedCountry.length > 0) {
      const citiesList = selectedState.flatMap(state => 
        Object.keys(locationHierarchy[selectedCountry[0].value]?.[state.value] || {})
      );
      setCities(citiesList.map(city => ({ value: city, label: city })));
    } else {
      setCities([]);
      setSelectedCity([]);
      setSelectedNeighborhood([]);
    }
  }, [selectedState, selectedCountry, locationHierarchy]);

  useEffect(() => {
    if (selectedCity.length > 0 && selectedState.length > 0 && selectedCountry.length > 0) {
      const neighborhoodsList = selectedCity.flatMap(city => 
        locationHierarchy[selectedCountry[0].value]?.[selectedState[0].value]?.[city.value] || []
      );
      setNeighborhoods(neighborhoodsList.map(neighborhood => ({ value: neighborhood, label: neighborhood })));
    } else {
      setNeighborhoods([]);
      setSelectedNeighborhood([]);
    }
  }, [selectedCity, selectedState, selectedCountry, locationHierarchy]);

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
        current_state: member.current_state || '',
        death_date: member.death_date || '',
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

  const filterImagesByDateRangeLocationAndPeople = (range: [number, number], location: string | null, people: TaggedPerson[]) => {
    const filtered = images.filter(image => {
      const timestamp = dateToTimestamp(image.metadata?.date_taken || '');
      const matchesDateRange = timestamp >= range[0] && timestamp <= range[1];
      const matchesLocation = !location || (image.metadata?.location && Object.values(image.metadata.location).includes(location));
      const matchesPeople = people.every(person => 
        image.metadata?.people_tagged?.some(tagged => tagged.id === person.id)
      );
      return matchesDateRange && matchesLocation && matchesPeople;
    });
    setFilteredImages(filtered);
  };

  const handleRangeChange = (values: number[]) => {
    const rangeValues: [number, number] = [values[0], values[1]];
    setCurrentDateRange(rangeValues);
    filterImagesByDateRangeLocationAndPeople(rangeValues, selectedLocation, selectedPeople);
  };

  const handleLocationChange = async () => {
    const location = selectedNeighborhood?.length > 0 ? selectedNeighborhood.map(n => n.value).join(',') : selectedCity.length > 0 ? selectedCity.map(c => c.value).join(',') : selectedState.length > 0 ? selectedState.map(s => s.value).join(',') : selectedCountry.length > 0 ? selectedCountry.map(c => c.value).join(',') : null;
    if (location) {
      const response = await fetch(`/api/photos?location=${location}`); // Adjust API endpoint
      const data = await response.json();
      setImages(data.photos); // Update images based on the selected location
    }
    filterImagesByDateRangeLocationAndPeople(currentDateRange, location, selectedPeople);
  };

  const handlePersonChange = (selectedOptions: any) => {
    const people = selectedOptions.map((option: any) => ({
      id: mapNameToId(option.value) || '',
      name: option.value,
    }));

    setSelectedPeople(people);
    filterImagesByDateRangeLocationAndPeople(currentDateRange, selectedLocation, people);
  };

  const personOptions = familyMembers.map(member => ({
    value: `${member.first_name} ${member.last_name}`,
    label: `${member.first_name} ${member.last_name}`,
  }));

  const resetFilters = async () => {
    setSelectedLocation(null);
    setSelectedPeople([]);
    setSelectedPersonId(null);
    setCurrentDateRange([dateRange.min, dateRange.max]);
    
    // Fetch all photos again to reset the view
    await fetchPhotos();
    
    // Reset the filtered images to all images
    setFilteredImages(images);
  };

  const renderDateRangeSlider = () => {
    if (!Number.isFinite(dateRange.min) || !Number.isFinite(dateRange.max) || dateRange.min >= dateRange.max) return null;
    const uniqueTimestamps = new Set(
      filteredImages.map(img => dateToTimestamp(img.metadata?.date_taken || ''))
    );
    if (uniqueTimestamps.size <= 1) return null;
  
    return (
      <div className="mb-8">
        <div className="mb-2 flex justify-between text-sm text-gray-600 whitespace-nowrap">
          <span>{timestampToDate(currentDateRange[0])}</span>
          <span>{timestampToDate(currentDateRange[1])}</span>
        </div>
        <Range
          values={currentDateRange}
          step={86400000} // One day
          min={dateRange.min}
          max={dateRange.max}
          onChange={handleRangeChange}
          renderTrack={({ props, children }) => (
            <div
              ref={props.ref}
              onMouseDown={props.onMouseDown}
              onTouchStart={props.onTouchStart}
              style={{
                ...props.style,
                background: getTrackBackground({
                  values: currentDateRange,
                  colors: ["#e5e7eb", "#3b82f6", "#e5e7eb"],
                  min: dateRange.min,
                  max: dateRange.max
                })
              }}
              className="h-2 w-full rounded bg-gray-200 px-4"
            >
              {children}
            </div>
          )}
          renderThumb={({ props, isDragged }) => (
            <div
              {...props}
              className={`h-4 w-4 rounded-full bg-blue-500 focus:outline-none ${isDragged ? 'shadow-lg' : ''}`}
            />
          )}
        />
      </div>
    );
  };

  const fetchUploaderName = async (userId: string) => {
    try {
      const userDetails = await getUserData(userId);
      if (userDetails) {
        setUploaderName(`${userDetails.first_name} ${userDetails.last_name}`);
      } else {
        setUploaderName('Unknown User');
      }
    } catch (error) {
      console.error('Error fetching uploader details:', error);
      setUploaderName('Unknown User');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement the logic to update the photo data
    console.log('Form submitted:', formData);
    setIsEditing(false);
  };

  const renderEditForm = () => (
    <form className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
        <input
          type="text"
          value={formData.location.country}
          onChange={(e) => setFormData({ ...formData, location: { ...formData.location, country: e.target.value } })}
          placeholder="Country"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
        <input
          type="text"
          value={formData.location.state}
          onChange={(e) => setFormData({ ...formData, location: { ...formData.location, state: e.target.value } })}
          placeholder="State"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
        <input
          type="text"
          value={formData.location.city}
          onChange={(e) => setFormData({ ...formData, location: { ...formData.location, city: e.target.value } })}
          placeholder="City"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
        <input
          type="text"
          value={formData.location.neighborhood}
          onChange={(e) => setFormData({ ...formData, location: { ...formData.location, neighborhood: e.target.value } })}
          placeholder="Neighborhood"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">People Tagged</label>
        <input
          type="text"
          value={formData.peopleTagged.map(person => person.name).join(', ')}
          onChange={(e) => {
            const names = e.target.value.split(',').map(name => name.trim());
            setFormData({ ...formData, peopleTagged: names.map(name => ({ id: '', name })) });
          }}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => setIsEditing(false)}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          onClick={handleFormSubmit}
        >
          Save
        </button>
      </div>
    </form>
  );

  // Handler to refresh photos and close modal after deletion
  const handlePhotoDeleted = async () => {
    await fetchPhotos();
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
    <div className="container mx-auto px-4 py-8 bg-gray-100">
      <h1 className="text-4xl mb-6 text-gray-800">Family Photos</h1>

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

        {/* <div className="flex justify-center mb-4">
          <PhotoCount filtered={filteredImages.length} total={images.length} />
        </div> */}

        {/* Location filter dropdown */}
        <div className="flex flex-wrap mb-4">
          <div className="w-1/2 p-2"> {/* First column */}
            <label htmlFor="country-filter" className="block text-sm font-medium text-gray-400 poppins-medium whitespace-nowrap">
              Filter by Country:
            </label>
            <Select
              components={animatedComponents}
              className="basic-multi-select text-black poppins-light"
              options={countries}
              isMulti
              onChange={(options) => {
                setSelectedCountry(options as LocationOption[]);
                setSelectedState([]);
                setSelectedCity([]);
                setSelectedNeighborhood([]);
                handleLocationChange(); // Fetch photos on change
              }}
              placeholder="Country"
            />
          </div>
          <div className="w-1/2 p-2"> {/* Second column */}
            <label htmlFor="state-filter" className="block text-sm font-medium text-gray-400 poppins-medium whitespace-nowrap">
              Filter by State:
            </label>
            <Select
              components={animatedComponents}
              className="basic-multi-select text-black poppins-light"
              options={states}
              isMulti
              onChange={(options) => {
                setSelectedState(options as LocationOption[]);
                setSelectedCity([]);
                setSelectedNeighborhood([]);
                handleLocationChange(); // Fetch photos on change
              }}
              placeholder="State"
              isDisabled={selectedCountry.length === 0}
            />
          </div>
          <div className="w-1/2 p-2"> {/* Third column */}
            <label htmlFor="city-filter" className="block text-sm font-medium text-gray-400 poppins-medium whitespace-nowrap">
              Filter by City:
            </label>
            <Select
              components={animatedComponents}
              className="basic-multi-select text-black poppins-light"
              options={cities}
              isMulti
              onChange={(options) => {
                setSelectedCity(options as LocationOption[]);
                setSelectedNeighborhood([]);
                handleLocationChange(); // Fetch photos on change
              }}  
              placeholder="City"
              isDisabled={selectedState.length === 0}
            />
          </div>
          <div className="w-1/2 p-2"> {/* Fourth column */}
            <label htmlFor="neighborhood-filter" className="block text-sm font-medium text-gray-400 poppins-medium whitespace-nowrap">
              Filter by Neighborhood:
            </label>
            <Select
              components={animatedComponents}
              className="basic-multi-select text-black poppins-light"
              options={neighborhoods}
              isMulti
              onChange={(options) => {
                setSelectedNeighborhood(options as LocationOption[]);
                handleLocationChange(); // Fetch photos on change
              }}
              placeholder="Neighborhood"
              isDisabled={selectedCity.length === 0}
            />
          </div>
        </div>

        {/* Person filter dropdown */}
        <div className="mb-4 px-2">
          <label htmlFor="person-filter" className="block text-sm font-medium text-gray-400 poppins-medium whitespace-nowrap">
            Filter by Person:
          </label>
          <Select
            components={animatedComponents}
            id="person-filter"
            isMulti
            options={personOptions}
            className="basic-multi-select text-black poppins-light"
            classNamePrefix="select"
            onChange={handlePersonChange}
            value={selectedPeople.map(person => ({ value: person.name, label: person.name }))}
          />
        </div>

        {/* Clear Filters Button */}
        <div className="mb-4 px-2">
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 poppins-light"
          >
            Clear Filters
          </button>
        </div>

        {renderDateRangeSlider()}

        <div className="mb-4 text-sm text-gray-500 poppins-light">
          {formatPhotoCount(filteredImages.length, images.length)}
        </div>

        <div id="default-carousel" className="relative w-full" data-carousel="slide">
          <div className="relative h-56 overflow-hidden rounded-lg md:h-96">
            {[...filteredImages].reverse().slice(0,6).map((photo, index) => (
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
          <div className="absolute z-30 flex -translate-x-1/2 bottom-8 left-1/2 space-x-3 rtl:space-x-reverse">
              {[...filteredImages].reverse().slice(0,6).map((_, index) => (
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
        {[...filteredImages.slice().sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())].map((photo, index) => (
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

      <div className="flex justify-center mb-4 mt-10">
          <PhotoCount filtered={filteredImages.length} total={images.length} />
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          uploaderName={uploaderName}
          currentUserId={currentUserId}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          closeModal={closeModal}
          handleImageError={handleImageError}
          renderEditForm={renderEditForm}
          onPhotoDeleted={handlePhotoDeleted}
        />
      )}
    </div>
  )
}

export default Photos