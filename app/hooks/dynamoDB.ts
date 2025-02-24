interface TaggedPerson {
  id: string;
  name: string;
}

interface PhotoData {
  photo_id: string;
  s3_key: string;
  uploaded_by: string;
  upload_date: string;
  description: string;
  location: {
    country: string;
    state: string;
    city: string;
    neighborhood: string;
  };
  date_taken: string;
  people_tagged: TaggedPerson[];
}

export const savePhotoToDB = async (photoData: PhotoData) => {
  // Your existing implementation...
}; 