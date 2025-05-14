import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, ScanCommand, DeleteItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { fetchUserAttributes } from '@aws-amplify/auth';
import { getCurrentUser } from "aws-amplify/auth";
import { v4 as uuidv4 } from 'uuid';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Set up DynamoDB client
const dynamoDB = new DynamoDBClient({ 
  region: process.env.NEXT_PUBLIC_AWS_PROJECT_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  }
});

const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_PROJECT_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  },
});

// Add these table name constants at the top of the file after the imports
const TABLES = {
  FAMILY: "Family",
  PHOTOS: "Photos",
  ALBUMS: "Albums",
  RELATIONSHIPS: "Relationships",
  // EVENTS: "Events",
  EVENT_RSVP: "EventRSVPs"
} as const;

// Export all interfaces
export interface TaggedPerson {
  id: string;
  name: string;
}

export interface PhotoData {
  album_id: string;
  photo_id: string;
  url: string;
  s3_key: string;
  uploaded_by: string;
  upload_date: string;
  metadata: {
    location: {
      country: string;
      state: string;
      city: string;
      neighborhood: string;
    };
    description: string;
    date_taken: string;
    people_tagged: TaggedPerson[];
  };
  lastModified: string;
}

export interface AlbumData {
  album_id: string;
  name: string;
  description?: string;
  created_by: string;
  created_date: string;
  cover_photo_id?: string;
}

export interface FamilyMember {
  family_member_id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  bio: string;
  phone_number: string;
  birthday: string;
  birth_city: string;
  birth_state: string;
  profile_photo: string;
  current_city: string;
  current_state: string;
}

// Define relationship types
export type RelationshipType = 'parent' | 'sibling' | 'spouse' | 'child' | 'grandchild' | 'niece/nephew';

// Export all functions
export const saveUserToDB = async (
  first_name: string, 
  last_name: string, 
  email: string, 
  username: string, 
  bio: string, 
  phone_number: string, 
  birthday: string,
  birth_city: string,
  birth_state: string,
  profile_photo?: string,
  current_city?: string,
  current_state?: string
) => {
  try {
    const userAttributes = await fetchUserAttributes();
    const user = await getCurrentUser();
    
    if (!user || !user.userId) {
      throw new Error("User is not authenticated or missing userId.");
    }

    const userId = user.userId;
    const userEmail = userAttributes.email || email;

    if (!userId || !userEmail) {
      throw new Error("Missing userId or email.");
    }

    // Prepare data for DynamoDB
    const params = {
      TableName: TABLES.FAMILY,
      Item: {
        family_member_id: { S: userId },
        first_name: { S: first_name },
        last_name: { S: last_name },
        email: { S: userEmail },
        username: { S: username },
        bio: { S: bio },
        phone_number: { S: phone_number },
        birthday: { S: birthday },
        birth_city: { S: birth_city },
        birth_state: { S: birth_state },
        profile_photo: { S: profile_photo || '' },
        current_city: { S: current_city || '' },
        current_state: { S: current_state || '' }
      },
    };

    await dynamoDB.send(new PutItemCommand(params));
    console.log("✅ User data saved to DynamoDB!");
  } catch (error) {
    console.error("❌ Error saving user to DynamoDB:", error);
    throw error;
  }
};

export const getUserData = async (userId: string) => {
  try {
    if (!userId) {
      throw new Error("❌ userId is required.");
    }

    const params = {
      TableName: TABLES.FAMILY,
      Key: {
        family_member_id: { S: userId },
      },
    };

    const data = await dynamoDB.send(new GetItemCommand(params));

    if (!data.Item) {
      throw new Error('User not found');
    }

    return {
      first_name: data.Item.first_name?.S || '',
      last_name: data.Item.last_name?.S || '',
      email: data.Item.email?.S || '',
      username: data.Item.username?.S || '',
      bio: data.Item.bio?.S || '',
      phone_number: data.Item.phone_number?.S || '',
      birthday: data.Item.birthday?.S || '',
      birth_city: data.Item.birth_city?.S || '',
      birth_state: data.Item.birth_state?.S || '',
      profile_photo: data.Item.profile_photo?.S || undefined,
      current_city: data.Item.current_city?.S || '',
      current_state: data.Item.current_state?.S || '',
      city: data.Item.city?.S || '',
      state: data.Item.state?.S || '',
      cta_visible: data.Item.cta_visible?.BOOL,
    };
  } catch (error) {
    console.error("❌ Error fetching user data:", error);
    return null;
  }
};

export const createAlbum = async (name: string, description?: string) => {
  try {
    const user = await getCurrentUser();
    const userId = user.userId;
    
    if (!userId) {
      throw new Error("User is not authenticated.");
    }

    const album_id = `album_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const params = {
      TableName: TABLES.ALBUMS,
      Item: {
        album_id: { S: album_id },
        name: { S: name },
        description: { S: description || '' },
        created_by: { S: userId },
        created_date: { S: new Date().toISOString() }
      }
    };

    await dynamoDB.send(new PutItemCommand(params));
    return album_id;
  } catch (error) {
    console.error("Error creating album:", error);
    throw error;
  }
};

export const savePhotoToDB = async (photoData: PhotoData) => {
  try {
    // Create the base item with required fields
    const item: Record<string, any> = {
      photo_id: { S: photoData.photo_id },
      // Remove any existing photos/ prefix and ensure single prefix
      s3_key: { S: `photos/${photoData.s3_key.replace(/^photos\//g, '')}` },
      uploaded_by: { S: photoData.uploaded_by },
      upload_date: { S: photoData.upload_date },
      album_id: { S: photoData.album_id || "" },
    };

    // Log the s3_key being saved
    console.log('Saving photo with s3_key:', item.s3_key.S);

    // Add optional fields only if they exist
    if (photoData.metadata.description) {
      item.description = { S: photoData.metadata.description };
    }

    if (photoData.metadata.location) {
      item.location = {
        M: {
          country: { S: photoData.metadata.location.country || '' },
          state: { S: photoData.metadata.location.state || '' },
          city: { S: photoData.metadata.location.city || '' },
          neighborhood: { S: photoData.metadata.location.neighborhood || '' }
        }
      };
    }

    if (photoData.metadata.date_taken) {
      item.date_taken = { S: photoData.metadata.date_taken };
    }

    if (photoData.metadata.people_tagged && photoData.metadata.people_tagged.length > 0) {
      item.people_tagged = {
        L: photoData.metadata.people_tagged.map(person => ({
          M: {
            id: { S: person.id },
            name: { S: person.name }
          }
        }))
      };
    }

    const command = new PutItemCommand({
      TableName: TABLES.PHOTOS,
      Item: item
    });

    await dynamoDB.send(command);
    console.log('✅ Photo saved to DynamoDB successfully');
  } catch (error) {
    console.error('❌ Error saving photo to DynamoDB:', error);
    throw error;
  }
};

export const addPhotoToAlbum = async (photo_id: string, album_id: string) => {
  try {
    const user = await getCurrentUser();
    const userId = user.userId;
    
    if (!userId) {
      throw new Error("User is not authenticated.");
    }

    // First verify the album exists and belongs to the user
    const getAlbumParams = {
      TableName: TABLES.ALBUMS,
      Key: {
        album_id: { S: album_id }
      }
    };

    const albumData = await dynamoDB.send(new GetItemCommand(getAlbumParams));
    
    if (!albumData.Item || albumData.Item.created_by.S !== userId) {
      throw new Error("Album not found or user doesn't have permission");
    }

    // Update the photo's album_id
    const updatePhotoParams = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photo_id }
      },
      UpdateExpression: "SET album_id = :albumId",
      ExpressionAttributeValues: {
        ":albumId": { S: album_id }
      }
    };

    await dynamoDB.send(new UpdateItemCommand(updatePhotoParams));
    console.log("✅ Photo added to album successfully!");
  } catch (error) {
    console.error("❌ Error adding photo to album:", error);
    throw error;
  }
};

export const getAllFamilyMembers = async (): Promise<FamilyMember[]> => {
  try {
    const params = {
      TableName: TABLES.FAMILY,
    };

    const command = new ScanCommand(params);
    const response = await dynamoDB.send(command);

    if (!response.Items) {
      return [];
    }

    return response.Items.map(item => ({
      family_member_id: item.family_member_id?.S || '',
      first_name: item.first_name?.S || '',
      last_name: item.last_name?.S || '',
      email: item.email?.S || '',
      username: item.username?.S || '',
      bio: item.bio?.S || '',
      phone_number: item.phone_number?.S || '',
      birthday: item.birthday?.S || '',
      birth_city: item.birth_city?.S || '',
      birth_state: item.birth_state?.S || '',
      profile_photo: item.profile_photo?.S || '',
      current_city: item.current_city?.S || '',
      current_state: item.current_state?.S || '',
    }));
  } catch (error) {
    console.error("❌ Error fetching family members:", error);
    return [];
  }
};

export const getFamilyMembersWithoutEmail = async (): Promise<FamilyMember[]> => {
  try {
    const params = {
      TableName: TABLES.FAMILY,
      FilterExpression: "attribute_not_exists(email) OR email = :emptyString",
      ExpressionAttributeValues: {
        ":emptyString": { S: "" }
      }
    };

    const command = new ScanCommand(params);
    const response = await dynamoDB.send(command);

    if (!response.Items) {
      return [];
    }

    return response.Items.map(item => ({
      family_member_id: item.family_member_id?.S || '',
      first_name: item.first_name?.S || '',
      last_name: item.last_name?.S || '',
      email: item.email?.S || '',
      username: item.username?.S || '',
      bio: item.bio?.S || '',
      phone_number: item.phone_number?.S || '',
      birthday: item.birthday?.S || '',
      birth_city: item.birth_city?.S || '',
      birth_state: item.birth_state?.S || '',
      profile_photo: item.profile_photo?.S || '',
      current_city: item.current_city?.S || '',
      current_state: item.current_state?.S || '',
    }));
  } catch (error) {
    console.error("❌ Error fetching family members without email:", error);
    return [];
  }
};

export const updateFamilyMember = async (familyMemberId: string, data: { email: string, username: string, profile_photo: string }) => {
  try {
    const params = {
      TableName: TABLES.FAMILY,
      Key: {
        family_member_id: { S: familyMemberId }
      },
      UpdateExpression: "SET email = :email, username = :username, profile_photo = :profile_photo",
      ExpressionAttributeValues: {
        ":email": { S: data.email },
        ":username": { S: data.username },
        ":profile_photo": { S: data.profile_photo }
      }
    };

    await dynamoDB.send(new UpdateItemCommand(params));
    console.log("✅ Family member updated successfully!");
  } catch (error) {
    console.error("❌ Error updating family member:", error);
    throw error;
  }
};

// Function to add a relationship
export const addFamilyRelationship = async (
  sourceId: string,
  targetId: string,
  relationshipType: RelationshipType
) => {
  try {
    const params = {
      TableName: TABLES.RELATIONSHIPS,
      Item: {
        relationship_id: { S: uuidv4() },
        source_id: { S: sourceId },
        target_id: { S: targetId },
        relationship_type: { S: relationshipType }
      }
    };

    await dynamoDB.send(new PutItemCommand(params));
    console.log("✅ Relationship added successfully!");
  } catch (error) {
    console.error("❌ Error adding relationship:", error);
    throw error;
  }
};

// Function to get relationships for a family member
export const getFamilyRelationships = async (familyMemberId: string) => {
  try {
    const params = {
      TableName: TABLES.RELATIONSHIPS,
      FilterExpression: "source_id = :id OR target_id = :id",
      ExpressionAttributeValues: {
        ":id": { S: familyMemberId }
      }
    };

    const command = new ScanCommand(params);
    const response = await dynamoDB.send(command);

    if (!response.Items) {
      return [];
    }

    return response.Items.map(item => ({
      source_id: item.source_id.S || '',
      target_id: item.target_id.S || '',
      relationship_type: item.relationship_type.S || ''
    }));
  } catch (error) {
    console.error("❌ Error fetching relationships:", error);
    return [];
  }
};

// Function to remove a relationship
export const removeFamilyRelationship = async (
  sourceId: string,
  targetId: string
) => {
  try {
    const params = {
      TableName: TABLES.RELATIONSHIPS,
      Key: {
        source_id: { S: sourceId },
        target_id: { S: targetId }
      }
    };

    await dynamoDB.send(new DeleteItemCommand(params));
    console.log("✅ Relationship removed successfully!");
  } catch (error) {
    console.error("❌ Error removing relationship:", error);
    throw error;
  }
};

export const getUserDataById = async (memberId: string) => {
  try {
    const params = {
      TableName: TABLES.FAMILY,
      Key: {
        family_member_id: { S: memberId }
      }
    };

    const data = await dynamoDB.send(new GetItemCommand(params));
    return data.Item ? data.Item : null;
  } catch (error) {
    console.error("❌ Error fetching user data by ID:", error);
    throw error;
  }
};

export const addFamilyMember = async (memberData: { firstName: string, lastName: string, email: string, profile_photo: string }) => {
  try {
    const params = {
      TableName: TABLES.FAMILY,
      Item: {
        family_member_id: { S: uuidv4() },
        first_name: { S: memberData.firstName },
        last_name: { S: memberData.lastName },
        email: { S: memberData.email },
        profile_photo: { S: memberData.profile_photo }
      }
    };

    await dynamoDB.send(new PutItemCommand(params));
    console.log("✅ Family member added successfully!");
  } catch (error) {
    console.error("❌ Error adding family member:", error);
    throw error;
  }
};

// Add this function to get all photos by tagged users
export const getAllPhotosByTagged = async (taggedUserIds: string[]): Promise<PhotoData[]> => {
  try {
    const params = {
      TableName: TABLES.PHOTOS,
      FilterExpression: "contains(people_tagged, :taggedUserId)",
      ExpressionAttributeValues: {
        ":taggedUserId": { S: taggedUserIds.join(',') }
      }
    };

    const command = new ScanCommand(params);
    const response = await dynamoDB.send(command);
    console.log(response, "response.Items");

    if (!response.Items) {
      return [];
    }

    return response.Items.map(item => ({
      photo_id: item.photo_id?.S || '',
      s3_key: item.s3_key?.S || '',
      uploaded_by: item.uploaded_by?.S || '',
      upload_date: item.upload_date?.S || '',
      album_id: item.album_id?.S || '',
      url: item.url?.S || '',
      metadata: {
        location: {
          country: item.location?.M?.country?.S || '',
          state: item.location?.M?.state?.S || '',
          city: item.location?.M?.city?.S || '',
          neighborhood: item.location?.M?.neighborhood?.S || ''
        },
        description: item.description?.S || '',
        date_taken: item.date_taken?.S || '',
        people_tagged: item.people_tagged?.L ? item.people_tagged.L.map(tagged => ({
          id: tagged.M?.id.S || '',
          name: tagged.M?.name.S || ''
        })) : [],
      },
      lastModified: item.lastModified?.S || ''
    }));
  } catch (error) {
    console.error("❌ Error fetching photos by tagged users:", error);
    return [];
  }
};

export const getUserAlbums = async (userId: string): Promise<AlbumData[]> => {
  try {
    const params = {
      TableName: TABLES.ALBUMS,
      FilterExpression: "created_by = :userId",
      ExpressionAttributeValues: {
        ":userId": { S: userId }
      }
    };

    const command = new ScanCommand(params);
    const response = await dynamoDB.send(command);

    if (!response.Items) {
      return [];
    }

    return response.Items.map(item => ({
      album_id: item.album_id?.S || '',
      name: item.name?.S || '',
      description: item.description?.S || '',
      created_date: item.created_date?.S || '',
      created_by: item.created_by?.S || ''
    }));
  } catch (error) {
    console.error("❌ Error fetching user albums:", error);
    return [];
  }
};

export const getPhotosByAlbum = async (albumId: string) => {
  try {
    const params = {
      TableName: TABLES.PHOTOS,
      FilterExpression: "album_id = :albumId",
      ExpressionAttributeValues: {
        ":albumId": { S: albumId }
      }
    };

    const command = new ScanCommand(params);
    const response = await dynamoDB.send(command);

    if (!response.Items) {
      return [];
    }

    const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;

    const photos = await Promise.all(response.Items.map(async (item) => {
      const s3Key = item.s3_key?.S || '';

      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      try {
        const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });
        return {
          photo_id: item.photo_id?.S || '',
          s3_key: s3Key,
          uploaded_by: item.uploaded_by?.S || '',
          upload_date: item.upload_date?.S || '',
          album_id: item.album_id?.S || '',
          url,
          metadata: {
            location: {
              country: item.location?.M?.country?.S || '',
              state: item.location?.M?.state?.S || '',
              city: item.location?.M?.city?.S || '',
              neighborhood: item.location?.M?.neighborhood?.S || ''
            },
            description: item.description?.S || '',
            date_taken: item.date_taken?.S || '',
            people_tagged: item.people_tagged?.L ? item.people_tagged.L.map(tagged => ({
              id: tagged.M?.id.S || '',
              name: tagged.M?.name.S || ''
            })) : [],
          },
          lastModified: item.lastModified?.S || ''
        };
      } catch (error) {
        console.error('Error generating signed URL for key:', s3Key, error);
        return null;
      }
    }));

    return photos.filter(photo => photo !== null);
  } catch (error) {
    console.error("❌ Error fetching photos by album:", error);
    return [];
  }
};

export const getAlbumById = async (albumId: string) => {
  try {
    const params = {
      TableName: TABLES.ALBUMS,
      Key: {
        album_id: { S: albumId }
      }
    };

    const data = await dynamoDB.send(new GetItemCommand(params));

    if (!data.Item) {
      throw new Error('Album not found');
    }

    return {
      album_id: data.Item.album_id?.S || '',
      name: data.Item.name?.S || '',
      description: data.Item.description?.S || '',
      created_date: data.Item.created_date?.S || ''
    };
  } catch (error) {
    console.error("❌ Error fetching album by ID:", error);
    return null;
  }
};

export const deletePhotoById = async (photoId: string) => {
  try {
    const params = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photoId }
      }
    };

    const command = new DeleteItemCommand(params);
    await dynamoDB.send(command);
    console.log(`Photo with ID ${photoId} deleted successfully.`);
  } catch (error) {
    console.error("❌ Error deleting photo:", error);
    throw error;
  }
};

export const addPhotoToFavorites = async (userId: string, photoId: string) => {
  try {
    const params = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photoId }
      },
      UpdateExpression: "ADD favorited_by :userId",
      ExpressionAttributeValues: {
        ":userId": { SS: [userId] }
      }
    };

    await dynamoDB.send(new UpdateItemCommand(params));
    console.log("✅ Photo added to favorites successfully!");
  } catch (error) {
    console.error("❌ Error adding photo to favorites:", error);
    throw error;
  }
};

export const removePhotoFromFavorites = async (userId: string, photoId: string) => {
  try {
    const params = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photoId }
      },
      UpdateExpression: "DELETE favorited_by :userId",
      ExpressionAttributeValues: {
        ":userId": { SS: [userId] }
      }
    };

    await dynamoDB.send(new UpdateItemCommand(params));
    console.log("✅ Photo removed from favorites successfully!");
  } catch (error) {
    console.error("❌ Error removing photo from favorites:", error);
    throw error;
  }
};

export const checkIfPhotoIsFavorited = async (userId: string, photoId: string): Promise<boolean> => {
  try {
    const params = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photoId }
      }
    };

    const data = await dynamoDB.send(new GetItemCommand(params));

    if (!data.Item || !data.Item.favorited_by) {
      return false;
    }

    const favoritedBy = data.Item.favorited_by as { SS: string[] };
    return favoritedBy.SS.includes(userId);
  } catch (error) {
    console.error("❌ Error checking if photo is favorited:", error);
    return false;
  }
};

export const getFavoritedPhotosByUser = async (userId: string): Promise<PhotoData[]> => {
  try {
    const params = {
      TableName: TABLES.PHOTOS,
      FilterExpression: "contains(favorited_by, :userId)",
      ExpressionAttributeValues: {
        ":userId": { S: userId }
      }
    };

    const command = new ScanCommand(params);
    const response = await dynamoDB.send(command);

    if (!response.Items) {
      return [];
    }

    const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;

    const photos = await Promise.all(response.Items.map(async (item) => {
      const s3Key = item.s3_key?.S || '';

      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      try {
        const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });
        return {
          photo_id: item.photo_id?.S || '',
          s3_key: s3Key,
          uploaded_by: item.uploaded_by?.S || '',
          upload_date: item.upload_date?.S || '',
          album_id: item.album_id?.S || '',
          url,
          metadata: {
            location: {
              country: item.location?.M?.country?.S || '',
              state: item.location?.M?.state?.S || '',
              city: item.location?.M?.city?.S || '',
              neighborhood: item.location?.M?.neighborhood?.S || ''
            },
            description: item.description?.S || '',
            date_taken: item.date_taken?.S || '',
            people_tagged: item.people_tagged?.L ? item.people_tagged.L.map(tagged => ({
              id: tagged.M?.id.S || '',
              name: tagged.M?.name.S || ''
            })) : [],
          },
          lastModified: item.lastModified?.S || ''
        };
      } catch (error) {
        console.error('Error generating signed URL for key:', s3Key, error);
        return null;
      }
    }));

    return photos.filter(photo => photo !== null);
  } catch (error) {
    console.error("❌ Error fetching favorited photos:", error);
    return [];
  }
};

export const addCommentToPhoto = async (photoId: string, userId: string, comment: string, author: string, profilePhoto: string) => {
  try {
    const timestamp = new Date().toISOString();
    const params = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photoId }
      },
      UpdateExpression: "SET comments = list_append(if_not_exists(comments, :emptyList), :comment)",
      ExpressionAttributeValues: {
        ":comment": { L: [{ M: { userId: { S: userId }, text: { S: comment }, author: { S: author }, timestamp: { S: timestamp }, profilePhoto: { S: profilePhoto } } }] },
        ":emptyList": { L: [] }
      }
    };

    await dynamoDB.send(new UpdateItemCommand(params));
    console.log("✅ Comment added to photo successfully!");
  } catch (error) {
    console.error("❌ Error adding comment to photo:", error);
    throw error;
  }
};

export const getCommentsForPhoto = async (photoId: string): Promise<{ text: string; author: string; userId: string; timestamp: string; profilePhoto: string }[]> => {
  try {
    const params = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photoId }
      }
    };

    const data = await dynamoDB.send(new GetItemCommand(params));

    if (!data.Item || !data.Item.comments || !data.Item.comments.L) {
      return [];
    }

    return data.Item.comments.L.map((comment: any) => ({
      userId: comment.M?.userId?.S || '',
      text: comment.M?.text?.S || '',
      author: comment.M?.author?.S || 'Unknown',
      timestamp: comment.M?.timestamp?.S || '',
      profilePhoto: comment.M?.profilePhoto?.S || ''
    }));
  } catch (error) {
    console.error("❌ Error fetching comments for photo:", error);
    return [];
  }
};

export const getUserNameById = async (userId: string): Promise<{ firstName: string; lastName: string } | null> => {
  try {
    const params = {
      TableName: TABLES.FAMILY,
      Key: {
        family_member_id: { S: userId }
      }
    };

    const data = await dynamoDB.send(new GetItemCommand(params));

    if (!data.Item) {
      return null;
    }

    return {
      firstName: data.Item.first_name?.S || '',
      lastName: data.Item.last_name?.S || ''
    };
  } catch (error) {
    console.error("❌ Error fetching user name by ID:", error);
    return null;
  }
};

export const deleteCommentFromPhoto = async (photoId: string, userId: string, commentIndex: number) => {
  try {
    const params = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photoId }
      },
      UpdateExpression: `REMOVE comments[${commentIndex}]`,
      ConditionExpression: `comments[${commentIndex}].userId = :userId`,
      ExpressionAttributeValues: {
        ":userId": { S: userId }
      }
    };

    await dynamoDB.send(new UpdateItemCommand(params));
    console.log("✅ Comment deleted successfully!");
  } catch (error) {
    console.error("❌ Error deleting comment from photo:", error);
    throw error;
  }
};

export const editCommentInPhoto = async (photoId: string, userId: string, commentIndex: number, newText: string) => {
  try {
    const params = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photoId }
      },
      UpdateExpression: `SET comments[${commentIndex}].#text = :newText`,
      ConditionExpression: `comments[${commentIndex}].userId = :userId`,
      ExpressionAttributeNames: {
        "#text": "text"
      },
      ExpressionAttributeValues: {
        ":newText": { S: newText },
        ":userId": { S: userId }
      }
    };

    await dynamoDB.send(new UpdateItemCommand(params));
    console.log("✅ Comment edited successfully!");
  } catch (error) {
    console.error("❌ Error editing comment in photo:", error);
    throw error;
  }
};

export const getProfilePhotoById = async (userId: string): Promise<string | null> => {
  try {
    const params = {
      TableName: TABLES.FAMILY,
      Key: {
        family_member_id: { S: userId }
      }
    };

    const data = await dynamoDB.send(new GetItemCommand(params));

    if (!data.Item || !data.Item.profile_photo) {
      return null;
    }

    return data.Item.profile_photo.S || null;
  } catch (error) {
    console.error("❌ Error fetching profile photo by ID:", error);
    return null;
  }
};

export const saveRSVPToDynamoDB = async (eventId: string, userId: string, status: 'yes' | 'no' | 'maybe') => {
    const rsvpParams = {
        TableName: TABLES.EVENT_RSVP,
        Item: {
            rsvp_id: { S: eventId },
            user_id: { S: userId },
            status: { S: status }
        }
    };

    try {
        await dynamoDB.send(new PutItemCommand(rsvpParams));
        console.log("✅ RSVP saved to DynamoDB successfully!");
    } catch (error) {
        console.error("❌ Error saving RSVP to DynamoDB:", error);
    }
};

export async function getRSVPStatus(
  eventId: string,
  userId: string
): Promise<'yes' | 'no' | 'maybe' | null> {
  try {
    const params = {
      TableName: TABLES.EVENT_RSVP,
      Key: {
        rsvp_id: { S: eventId }
      }
    };
    const data = await dynamoDB.send(new GetItemCommand(params));
    if (data.Item && data.Item.status && data.Item.status.S) {
      const status = data.Item.status.S;
      if (status === 'yes' || status === 'no' || status === 'maybe') {
        return status;
      }
    }
    return null;
  } catch (error) {
    console.error("❌ Error fetching RSVP status:", error);
    return null;
  }
}

export async function getEventRSVPs(eventId: string): Promise<{ userId: string; status: 'yes' | 'no' | 'maybe' }[]> {
  try {
    const params = {
      TableName: TABLES.EVENT_RSVP,
      IndexName: undefined, // If you have a GSI for eventId, set it here
      FilterExpression: "rsvp_id = :eventId",
      ExpressionAttributeValues: {
        ":eventId": { S: eventId }
      }
    };
    const command = new ScanCommand(params);
    const data = await dynamoDB.send(command);
    if (!data.Items) return [];
    return data.Items
      .map(item => {
        const userId = item.user_id?.S;
        const status = item.status?.S;
        if (
          typeof userId === 'string' &&
          (status === 'yes' || status === 'no' || status === 'maybe')
        ) {
          return { userId, status };
        }
        return null;
      })
      .filter((item): item is { userId: string; status: 'yes' | 'no' | 'maybe' } => item !== null);
  } catch (error) {
    console.error("❌ Error fetching event RSVPs:", error);
    return [];
  }
}

// Add this function to fetch all RSVPs for a user
export async function getUserRSVPs(userId: string): Promise<{ eventId: string; status: 'yes' | 'no' | 'maybe' }[]> {
  try {
    const params = {
      TableName: TABLES.EVENT_RSVP,
      FilterExpression: "user_id = :userId",
      ExpressionAttributeValues: {
        ":userId": { S: userId }
      }
    };
    const command = new ScanCommand(params);
    const data = await dynamoDB.send(command);
    if (!data.Items) return [];
    return data.Items
      .map(item => {
        const eventId = item.rsvp_id?.S;
        const status = item.status?.S;
        if (
          typeof eventId === 'string' &&
          (status === 'yes' || status === 'no' || status === 'maybe')
        ) {
          return { eventId, status };
        }
        return null;
      })
      .filter((item): item is { eventId: string; status: 'yes' | 'no' | 'maybe' } => item !== null);
  } catch (error) {
    console.error("❌ Error fetching user RSVPs:", error);
    return [];
  }
}

// Add this function near other user update functions
export const setUserCTAVisible = async (userId: string, visible: boolean) => {
  try {
    const params = {
      TableName: TABLES.FAMILY,
      Key: {
        family_member_id: { S: userId }
      },
      UpdateExpression: "SET cta_visible = :visible",
      ExpressionAttributeValues: {
        ":visible": { BOOL: visible }
      }
    };
    await dynamoDB.send(new UpdateItemCommand(params));
    console.log(`✅ Set CTA visible to ${visible} for user ${userId}`);
  } catch (error) {
    console.error("❌ Error updating CTA visibility:", error);
    throw error;
  }
};

export const deleteAlbumById = async (albumId: string) => {
  try {
    // Delete all photos in the album
    const photos = await getPhotosByAlbum(albumId);
    for (const photo of photos) {
      await deletePhotoById(photo.photo_id);
    }

    // Delete the album itself
    const params = {
      TableName: TABLES.ALBUMS,
      Key: {
        album_id: { S: albumId }
      }
    };
    await dynamoDB.send(new DeleteItemCommand(params));
    console.log(`Album with ID ${albumId} deleted successfully.`);
  } catch (error) {
    console.error("❌ Error deleting album:", error);
    throw error;
  }
};

/**
 * Removes a photo from an album by setting its album_id to an empty string.
 * @param photo_id The ID of the photo to update.
 * @param album_id The ID of the album to remove the photo from (not strictly needed, but for API consistency).
 */
export const removePhotoFromAlbum = async (photo_id: string, album_id: string) => {
  try {
    // Just set album_id to empty string for the photo
    const params = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photo_id }
      },
      UpdateExpression: "SET album_id = :empty",
      ExpressionAttributeValues: {
        ":empty": { S: "" }
      }
    };

    await dynamoDB.send(new UpdateItemCommand(params));
    console.log(`✅ Photo ${photo_id} removed from album ${album_id}`);
  } catch (error) {
    console.error(`❌ Error removing photo ${photo_id} from album ${album_id}:`, error);
    throw error;
  }
};

/**
 * Fetch all photos uploaded by a specific user.
 * Returns an array of PhotoData with signed S3 URLs.
 */
export const getUserPhotos = async (userId: string): Promise<PhotoData[]> => {
  try {
    const params = {
      TableName: TABLES.PHOTOS,
      FilterExpression: "uploaded_by = :userId",
      ExpressionAttributeValues: {
        ":userId": { S: userId }
      }
    };

    const command = new ScanCommand(params);
    const response = await dynamoDB.send(command);

    if (!response.Items) {
      return [];
    }

    const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;

    // Map and sign URLs
    const photos = await Promise.all(response.Items.map(async (item) => {
      const s3Key = item.s3_key?.S || '';

      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      try {
        const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });
        return {
          photo_id: item.photo_id?.S || '',
          s3_key: s3Key,
          uploaded_by: item.uploaded_by?.S || '',
          upload_date: item.upload_date?.S || '',
          album_id: item.album_id?.S || '',
          url,
          metadata: {
            location: {
              country: item.location?.M?.country?.S || '',
              state: item.location?.M?.state?.S || '',
              city: item.location?.M?.city?.S || '',
              neighborhood: item.location?.M?.neighborhood?.S || ''
            },
            description: item.description?.S || '',
            date_taken: item.date_taken?.S || '',
            people_tagged: item.people_tagged?.L ? item.people_tagged.L.map(tagged => ({
              id: tagged.M?.id.S || '',
              name: tagged.M?.name.S || ''
            })) : [],
          },
          lastModified: item.lastModified?.S || ''
        };
      } catch (error) {
        console.error('Error generating signed URL for key:', s3Key, error);
        return null;
      }
    }));

    return photos.filter(photo => photo !== null);
  } catch (error) {
    console.error("❌ Error fetching user photos:", error);
    return [];
  }
};

export async function updateAlbum(
  albumId: string,
  updates: { name?: string; description?: string; cover_photo_id?: string }
) {
  const updateFields = [];
  const expressionAttributeNames: any = {};
  const expressionAttributeValues: any = {};

  if (updates.name !== undefined) {
    updateFields.push('#name = :name');
    expressionAttributeNames['#name'] = 'name';
    expressionAttributeValues[':name'] = { S: updates.name };
  }
  if (updates.description !== undefined) {
    updateFields.push('#desc = :desc');
    expressionAttributeNames['#desc'] = 'description';
    expressionAttributeValues[':desc'] = { S: updates.description };
  }
  if (updates.cover_photo_id !== undefined) {
    updateFields.push('#cover = :cover');
    expressionAttributeNames['#cover'] = 'cover_photo_id';
    expressionAttributeValues[':cover'] = { S: updates.cover_photo_id };
  }

  if (updateFields.length === 0) return;

  const params = {
    TableName: TABLES.ALBUMS,
    Key: { album_id: { S: albumId } },
    UpdateExpression: 'set ' + updateFields.join(', '),
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'UPDATED_NEW',
  };

  await dynamoDB.send(new UpdateItemCommand(params));
}