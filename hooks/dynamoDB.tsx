import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { fetchUserAttributes } from '@aws-amplify/auth';
import { getCurrentUser } from "aws-amplify/auth";

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
  ALBUMS: "Albums"
} as const;

// Add these new interfaces at the top of the file
interface TaggedPerson {
  id: string;
  name: string;
}

interface PhotoData {
  photo_id: string;
  s3_key: string;
  uploaded_by: string;
  upload_date: string;
  description?: string;
  location?: {
    country?: string;
    state?: string;
    city?: string;
    neighborhood?: string;
  };
  date_taken?: string;
  people_tagged: TaggedPerson[];
  album_id?: string;
}

interface AlbumData {
  album_id: string;
  name: string;
  description?: string;
  created_by: string;
  created_date: string;
  cover_photo_id?: string;
}

interface FamilyMember {
  family_member_id: string;
  first_name: string;
  last_name: string;
}

export async function saveUserToDB(first_name: string, last_name: string, email: string, username: string, bio: string, phone_number: string, birthday: string) {
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
        birthday: { S: birthday }
      },
    };

    await dynamoDB.send(new PutItemCommand(params));
    console.log("✅ User data saved to DynamoDB!");
  } catch (error) {
    console.error("❌ Error saving user to DynamoDB:", error);
    throw error;
  }
}

export async function getUserData(userId: string) {
  try {
    if (!userId) {
      throw new Error("❌ userId is required.");
    }

    // Add logging to help debug
    console.log('Attempting to fetch user data for userId:', userId);

    const params = {
      TableName: TABLES.FAMILY,
      Key: {
        family_member_id: { S: userId },
      },
    };

    console.log('DynamoDB params:', params);
    const data = await dynamoDB.send(new GetItemCommand(params));
    console.log('DynamoDB response:', data);
    
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
}

// Add these new functions after the existing ones
export async function createAlbum(name: string, description?: string) {
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
}

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
    if (photoData.description) {
      item.description = { S: photoData.description };
    }

    if (photoData.location) {
      item.location = {
        M: {
          country: { S: photoData.location.country || '' },
          state: { S: photoData.location.state || '' },
          city: { S: photoData.location.city || '' },
          neighborhood: { S: photoData.location.neighborhood || '' }
        }
      };
    }

    if (photoData.date_taken) {
      item.date_taken = { S: photoData.date_taken };
    }

    if (photoData.people_tagged && photoData.people_tagged.length > 0) {
      item.people_tagged = {
        L: photoData.people_tagged.map(person => ({
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

export async function addPhotoToAlbum(photo_id: string, album_id: string) {
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
}

export async function getAllFamilyMembers(): Promise<FamilyMember[]> {
  try {
    const params = {
      TableName: TABLES.FAMILY,
      // No specific key needed as we want all items
    };

    const command = new ScanCommand(params);
    const response = await dynamoDB.send(command);

    if (!response.Items) {
      return [];
    }

    return response.Items.map(item => ({
      family_member_id: item.family_member_id.S || '',
      first_name: item.first_name.S || '',
      last_name: item.last_name.S || ''
    }));
  } catch (error) {
    console.error("❌ Error fetching family members:", error);
    return [];
  }
}
