import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, ScanCommand, DeleteItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { fetchUserAttributes } from '@aws-amplify/auth';
import { getCurrentUser } from "aws-amplify/auth";
import { v4 as uuidv4 } from 'uuid';

// Set up DynamoDB client
const dynamoDB = new DynamoDBClient({ 
  region: process.env.NEXT_PUBLIC_AWS_PROJECT_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  }
});

// Add these table name constants at the top of the file after the imports
const TABLES = {
  FAMILY: "Family",
  PHOTOS: "Photos",
  ALBUMS: "Albums",
  RELATIONSHIPS: "Relationships"
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
    
    return data.Item ? data.Item : null;
  } catch (error) {
    console.error("❌ Error fetching user data:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        name: error.name
      });
    }
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

export const updateFamilyMember = async (familyMemberId: string, data: { email: string, username: string }) => {
  try {
    const params = {
      TableName: TABLES.FAMILY,
      Key: {
        family_member_id: { S: familyMemberId }
      },
      UpdateExpression: "SET email = :email, username = :username",
      ExpressionAttributeValues: {
        ":email": { S: data.email },
        ":username": { S: data.username }
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

export const addFamilyMember = async (memberData: { firstName: string, lastName: string, email: string }) => {
  try {
    const params = {
      TableName: TABLES.FAMILY,
      Item: {
        family_member_id: { S: uuidv4() },
        first_name: { S: memberData.firstName },
        last_name: { S: memberData.lastName },
        email: { S: memberData.email }
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
