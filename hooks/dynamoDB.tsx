import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, ScanCommand, DeleteItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { fetchUserAttributes, getCurrentUser } from "aws-amplify/auth";
import { v4 as uuidv4 } from 'uuid';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ReturnValue } from "@aws-sdk/client-dynamodb";

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
  EVENT_RSVP: "EventRSVPs",
  HOBBY_COMMENTS: "HobbyComments",
  NOTIFICATIONS: "Notifications"
} as const;

// Export all interfaces
export interface TaggedPerson {
  id: string;
  name: string;
}

export interface PhotoData {
  album_ids: string[];  // Changed from album_id to album_ids to support multiple albums
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
  middle_name: string;
  nick_name: string;
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
  death_date: string;
  use_first_name: boolean;
  use_middle_name: boolean;
  use_nick_name: boolean;
  social_media?: {
    platform: string;
    url: string;
  }[];
}

// Notification types
export type NotificationType = 'birthday' | 'hobby_comment' | 'photo_comment' | 'photo_tag' | 'event_rsvp' | 'event_reminder' | 'event_cancelled';

export interface Notification {
  notification_id: string;
  user_id: string; // Who should see this notification
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id?: string; // e.g., member_id for birthday, photo_id for photo tag, hobby name for hobby comment
  metadata?: Record<string, any>; // Additional data
}

// Enhanced relationship types
export type RelationshipType = 
  // Direct relationships
  | 'parent' | 'child' | 'sibling'
  // Spousal relationships  
  | 'spouse' | 'ex_spouse' | 'partner'
  // Extended family
  | 'grandparent' | 'grandchild' | 'great_grandparent' | 'great_grandchild'
  | 'aunt' | 'uncle' | 'niece' | 'nephew'
  | 'grand_aunt' | 'grand_uncle' | 'grand_niece' | 'grand_nephew'
  | 'great_grand_aunt' | 'great_grand_uncle' | 'great_grand_niece' | 'great_grand_nephew'
  | 'cousin' | 'second_cousin' | 'cousin_once_removed'
  // Step relationships
  | 'step_parent' | 'step_child' | 'step_sibling'
  // In-law relationships
  | 'parent_in_law' | 'child_in_law' | 'sibling_in_law'
  | 'son_in_law' | 'daughter_in_law'
  | 'father_in_law' | 'mother_in_law'
  | 'brother_in_law' | 'sister_in_law'
  | 'uncle_in_law' | 'aunt_in_law' | 'niece_in_law' | 'nephew_in_law'
  | 'cousin_in_law'
  // Other relationships
  | 'guardian' | 'ward' | 'godparent' | 'godchild';

// Enhanced relationship interface
export interface FamilyRelationship {
  relationship_id: string;
  person_a_id: string;
  person_b_id: string;
  relationship_type: RelationshipType;
  relationship_subtype?: string; // e.g., "maternal", "paternal", "adoptive"
  start_date?: string; // for marriages, adoptions, etc.
  end_date?: string; // for divorces, deaths, etc.
  is_active: boolean;
  notes?: string;
  created_date: string;
  created_by: string;
}

// Relationship validation result
export interface RelationshipValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

// Relationship inference rules
export const RELATIONSHIP_RULES: Record<RelationshipType, { 
  inverse?: RelationshipType; 
  bidirectional: boolean;
  autoCreateInverse?: boolean;
}> = {
  // Direct relationships
  parent: { inverse: 'child', bidirectional: true, autoCreateInverse: true },
  child: { inverse: 'parent', bidirectional: true, autoCreateInverse: true },
  sibling: { inverse: 'sibling', bidirectional: true, autoCreateInverse: true },
  
  // Spousal relationships
  spouse: { inverse: 'spouse', bidirectional: true, autoCreateInverse: true },
  ex_spouse: { inverse: 'ex_spouse', bidirectional: true, autoCreateInverse: true },
  partner: { inverse: 'partner', bidirectional: true, autoCreateInverse: true },
  
  // Extended family
  grandparent: { inverse: 'grandchild', bidirectional: true, autoCreateInverse: true },
  grandchild: { inverse: 'grandparent', bidirectional: true, autoCreateInverse: true },
  great_grandparent: { inverse: 'great_grandchild', bidirectional: true, autoCreateInverse: true },
  great_grandchild: { inverse: 'great_grandparent', bidirectional: true, autoCreateInverse: true },
  aunt: { inverse: 'niece', bidirectional: false, autoCreateInverse: false },
  uncle: { inverse: 'nephew', bidirectional: false, autoCreateInverse: false },
  niece: { inverse: 'aunt', bidirectional: false, autoCreateInverse: false },
  nephew: { inverse: 'uncle', bidirectional: false, autoCreateInverse: false },
  grand_aunt: { inverse: 'grand_niece', bidirectional: false, autoCreateInverse: false },
  grand_uncle: { inverse: 'grand_nephew', bidirectional: false, autoCreateInverse: false },
  grand_niece: { inverse: 'grand_aunt', bidirectional: false, autoCreateInverse: false },
  grand_nephew: { inverse: 'grand_uncle', bidirectional: false, autoCreateInverse: false },
  great_grand_aunt: { inverse: 'great_grand_niece', bidirectional: false, autoCreateInverse: false },
  great_grand_uncle: { inverse: 'great_grand_nephew', bidirectional: false, autoCreateInverse: false },
  great_grand_niece: { inverse: 'great_grand_aunt', bidirectional: false, autoCreateInverse: false },
  great_grand_nephew: { inverse: 'great_grand_uncle', bidirectional: false, autoCreateInverse: false },
  cousin: { inverse: 'cousin', bidirectional: true, autoCreateInverse: true },
  second_cousin: { inverse: 'second_cousin', bidirectional: true, autoCreateInverse: true },
  cousin_once_removed: { inverse: 'cousin_once_removed', bidirectional: true, autoCreateInverse: true },
  
  // Step relationships
  step_parent: { inverse: 'step_child', bidirectional: true, autoCreateInverse: true },
  step_child: { inverse: 'step_parent', bidirectional: true, autoCreateInverse: true },
  step_sibling: { inverse: 'step_sibling', bidirectional: true, autoCreateInverse: true },
  
  // In-law relationships
  parent_in_law: { inverse: 'child_in_law', bidirectional: true, autoCreateInverse: true },
  child_in_law: { inverse: 'parent_in_law', bidirectional: true, autoCreateInverse: true },
  sibling_in_law: { inverse: 'sibling_in_law', bidirectional: true, autoCreateInverse: true },
  son_in_law: { inverse: 'father_in_law', bidirectional: false, autoCreateInverse: false },
  daughter_in_law: { inverse: 'mother_in_law', bidirectional: false, autoCreateInverse: false },
  father_in_law: { inverse: 'son_in_law', bidirectional: false, autoCreateInverse: false },
  mother_in_law: { inverse: 'daughter_in_law', bidirectional: false, autoCreateInverse: false },
  brother_in_law: { inverse: 'sister_in_law', bidirectional: false, autoCreateInverse: false },
  sister_in_law: { inverse: 'brother_in_law', bidirectional: false, autoCreateInverse: false },
  uncle_in_law: { inverse: 'niece_in_law', bidirectional: false, autoCreateInverse: false },
  aunt_in_law: { inverse: 'nephew_in_law', bidirectional: false, autoCreateInverse: false },
  niece_in_law: { inverse: 'uncle_in_law', bidirectional: false, autoCreateInverse: false },
  nephew_in_law: { inverse: 'aunt_in_law', bidirectional: false, autoCreateInverse: false },
  cousin_in_law: { inverse: 'cousin_in_law', bidirectional: true, autoCreateInverse: true },
  
  // Other relationships
  guardian: { inverse: 'ward', bidirectional: true, autoCreateInverse: true },
  ward: { inverse: 'guardian', bidirectional: true, autoCreateInverse: true },
  godparent: { inverse: 'godchild', bidirectional: true, autoCreateInverse: true },
  godchild: { inverse: 'godparent', bidirectional: true, autoCreateInverse: true },
};

// Export all functions
export const saveUserToDB = async (
  first_name: string, 
  last_name: string, 
  middle_name: string,
  nick_name: string,
  email: string, 
  username: string, 
  bio: string, 
  phone_number: string, 
  birthday: string,
  birth_city: string,
  birth_state: string,
  profile_photo?: string,
  current_city?: string,
  current_state?: string,
  show_zodiac?: boolean,
  social_media?: { platform: string; url: string }[],
  pets?: { name: string; birthday: string; death_date?: string; image?: string }[],
  hobbies?: string[],
  languages?: { name: string; proficiency: string }[],
  use_first_name?: boolean,
  use_middle_name?: boolean,
  use_nick_name?: boolean
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
    const item: any = {
      family_member_id: { S: userId },
      first_name: { S: first_name },
      last_name: { S: last_name },
      middle_name: { S: middle_name },
      nick_name: { S: nick_name },
      email: { S: userEmail },
      username: { S: username },
      bio: { S: bio },
      phone_number: { S: phone_number },
      birthday: { S: birthday },
      birth_city: { S: birth_city },
      birth_state: { S: birth_state },
      profile_photo: { S: profile_photo || '' },
      current_city: { S: current_city || '' },
      current_state: { S: current_state || '' },
      show_zodiac: { BOOL: show_zodiac ?? false },
      use_first_name: { BOOL: use_first_name ?? true },
      use_middle_name: { BOOL: use_middle_name ?? false },
      use_nick_name: { BOOL: use_nick_name ?? false }
    };

    // Add social media data if provided
    if (social_media && social_media.length > 0) {
      item.social_media = {
        L: social_media.map(sm => ({
          M: {
            platform: { S: sm.platform },
            url: { S: sm.url }
          }
        }))
      };
    }

    // Add pets data if provided
    if (pets && pets.length > 0) {
      item.pets = {
        L: pets.map(pet => ({
          M: {
            name: { S: pet.name },
            birthday: { S: pet.birthday },
            death_date: { S: pet.death_date || '' },
            image: { S: pet.image || '' }
          }
        }))
      };
    }

    // Add hobbies data if provided
    if (hobbies && hobbies.length > 0) {
      item.hobbies = {
        L: hobbies.map(hobby => ({ S: hobby }))
      };
    }

    // Add languages data if provided
    if (languages && languages.length > 0) {
      item.languages = {
        L: languages.map(lang => ({
          M: {
            name: { S: lang.name },
            proficiency: { S: lang.proficiency }
          }
        }))
      };
    }

    const params = {
      TableName: TABLES.FAMILY,
      Item: item,
    };

    await dynamoDB.send(new PutItemCommand(params));
    console.log("✅ User data saved to DynamoDB!");
  } catch (error) {
    console.error("❌ Error saving user to DynamoDB:", error);
    throw error;
  }
};

interface GetUserDataReturn {
  first_name: string;
  last_name: string;
  middle_name: string;
  nick_name: string;
  email: string;
  username: string;
  bio: string;
  phone_number: string;
  birthday: string;
  birth_city: string;
  birth_state: string;
  profile_photo?: string;
  current_city?: string;
  current_state?: string;
  city: string;
  state: string;
  cta_visible?: boolean;
  death_date: string;
  show_zodiac: boolean;
  social_media: { platform: string; url: string }[];
  pets: { name: string; birthday: string; death_date?: string; image?: string }[];
  hobbies: string[];
  languages: { name: string; proficiency: string }[];
  use_first_name: boolean;
  use_middle_name: boolean;
  use_nick_name: boolean;
}

export const getUserData = async (userId: string): Promise<GetUserDataReturn | null> => {
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
      middle_name: data.Item.middle_name?.S || '',
      nick_name: data.Item.nick_name?.S || '',
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
      death_date: data.Item.death_date?.S || '',
      show_zodiac: data.Item.show_zodiac?.BOOL ?? false,
      social_media: data.Item.social_media?.L?.map((item: any) => ({
        platform: item.M?.platform?.S || '',
        url: item.M?.url?.S || ''
      })) || [],
      pets: data.Item.pets?.L?.map((item: any) => ({
        name: item.M?.name?.S || '',
        birthday: item.M?.birthday?.S || '',
        death_date: item.M?.death_date?.S || undefined,
        image: item.M?.image?.S || undefined
      })) || [],
      hobbies: data.Item.hobbies?.L?.map((item: any) => item.S || '') || [],
      languages: data.Item.languages?.L?.map((item: any) => ({
        name: item.M?.name?.S || '',
        proficiency: item.M?.proficiency?.S || ''
      })) || [],
      use_first_name: data.Item.use_first_name?.BOOL ?? true,
      use_middle_name: data.Item.use_middle_name?.BOOL ?? false,
      use_nick_name: data.Item.use_nick_name?.BOOL ?? false,
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
    // Check if photo already exists to determine new vs existing tags
    const getPhotoParams = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photoData.photo_id }
      }
    };

    const existingPhotoData = await dynamoDB.send(new GetItemCommand(getPhotoParams));
    const isNewPhoto = !existingPhotoData.Item;
    
    // Get current user (who is doing the tagging/uploading)
    let taggerId = photoData.uploaded_by; // Default to uploader
    try {
      const user = await getCurrentUser();
      if (user?.userId) {
        taggerId = user.userId;
      }
    } catch (error) {
      // If we can't get current user, use uploader as fallback
      console.log('Could not get current user, using uploader as tagger');
    }

    // Get existing tags if photo already exists
    const existingTaggedIds = new Set<string>();
    if (existingPhotoData.Item?.people_tagged?.L) {
      existingPhotoData.Item.people_tagged.L.forEach((person: any) => {
        const id = person.M?.id?.S;
        if (id) {
          existingTaggedIds.add(id);
        }
      });
    }

    // Determine newly tagged people
    const newTags = photoData.metadata?.people_tagged || [];
    const newlyTaggedPeople = newTags.filter(person => {
      return person.id && !existingTaggedIds.has(person.id);
    });

    // Create the base item with required fields
    const item: Record<string, any> = {
      photo_id: { S: photoData.photo_id },
      // Remove any existing photos/ prefix and ensure single prefix
      s3_key: { S: `photos/${photoData.s3_key.replace(/^photos\//g, '')}` },
      uploaded_by: { S: photoData.uploaded_by },
      upload_date: { S: photoData.upload_date },
      album_ids: { L: (photoData.album_ids || []).map(id => ({ S: id })) },
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

    // Create notifications for newly tagged people
    if (newlyTaggedPeople.length > 0) {
      try {
        // Get tagger's name for the notification
        const taggerName = await getUserNameById(taggerId);
        const taggerDisplayName = taggerName 
          ? `${taggerName.firstName} ${taggerName.lastName}` 
          : 'Someone';

        for (const taggedPerson of newlyTaggedPeople) {
          // Don't notify the tagger if they tagged themselves
          if (taggedPerson.id === taggerId) continue;

          const title = "You were tagged in a photo";
          const message = `${taggerDisplayName} tagged you in a photo`;

          await createNotification(
            taggedPerson.id,
            'photo_tag',
            title,
            message,
            photoData.photo_id, // related_id is the photo_id
            { tagger_id: taggerId, tagger_name: taggerDisplayName }
          );
        }

        if (newlyTaggedPeople.length > 0) {
          const notificationCount = newlyTaggedPeople.filter(p => p.id !== taggerId).length;
          console.log(`✅ Created ${notificationCount} notification(s) for newly tagged people`);
        }
      } catch (notificationError) {
        // Don't fail the photo save if notification creation fails
        console.error("❌ Error creating photo tag notifications:", notificationError);
      }
    }
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

    // Get the current photo data to check if album_id already exists
    const getPhotoParams = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photo_id }
      }
    };

    const photoData = await dynamoDB.send(new GetItemCommand(getPhotoParams));
    
    if (!photoData.Item) {
      throw new Error("Photo not found");
    }

    // Check if album_ids already contains this album
    const currentAlbumIds = photoData.Item.album_ids?.L?.map((item: any) => item.S) || [];
    
    if (currentAlbumIds.includes(album_id)) {
      console.log("✅ Photo is already in this album");
      return; // Photo is already in this album, no need to add again
    }

    // Add the album_id to the album_ids list
    const updatePhotoParams = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photo_id }
      },
      UpdateExpression: "SET album_ids = list_append(if_not_exists(album_ids, :emptyList), :albumId)",
      ExpressionAttributeValues: {
        ":albumId": { L: [{ S: album_id }] },
        ":emptyList": { L: [] }
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
      middle_name: item.middle_name?.S || '',
      nick_name: item.nick_name?.S || '',
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
      death_date: item.death_date?.S || '',
      use_first_name: item.use_first_name?.BOOL ?? true,
      use_middle_name: item.use_middle_name?.BOOL ?? false,
      use_nick_name: item.use_nick_name?.BOOL ?? false,
    }));
  } catch (error) {
    console.error("❌ Error fetching family members:", error);
    return [];
  }
};

// Function to get all unique hobbies from all family members
export const getAllHobbies = async (): Promise<string[]> => {
  try {
    const params = {
      TableName: TABLES.FAMILY,
    };

    const command = new ScanCommand(params);
    const response = await dynamoDB.send(command);

    if (!response.Items) {
      return [];
    }

    const allHobbies = new Set<string>();
    response.Items.forEach(item => {
      if (item.hobbies?.L) {
        item.hobbies.L.forEach((hobby: any) => {
          const hobbyName = hobby.S || '';
          if (hobbyName.trim()) {
            allHobbies.add(hobbyName.trim());
          }
        });
      }
    });

    return Array.from(allHobbies).sort();
  } catch (error) {
    console.error("❌ Error fetching all hobbies:", error);
    return [];
  }
};

// Function to get all family members who have a specific hobby
export const getFamilyMembersWithHobby = async (hobby: string): Promise<Array<{ id: string; name: string; profile_photo?: string }>> => {
  try {
    const params = {
      TableName: TABLES.FAMILY,
    };

    const command = new ScanCommand(params);
    const response = await dynamoDB.send(command);

    if (!response.Items) {
      return [];
    }

    const members: Array<{ id: string; name: string; profile_photo?: string }> = [];
    
    response.Items.forEach(item => {
      if (item.hobbies?.L) {
        const hobbies = item.hobbies.L.map((h: any) => h.S || '').map((h: string) => h.trim().toLowerCase());
        if (hobbies.includes(hobby.trim().toLowerCase())) {
          const firstName = item.first_name?.S || '';
          const lastName = item.last_name?.S || '';
          const memberId = item.family_member_id?.S || '';
          const profilePhoto = item.profile_photo?.S || '';
          
          if (memberId) {
            members.push({
              id: memberId,
              name: `${firstName} ${lastName}`.trim(),
              profile_photo: profilePhoto || undefined
            });
          }
        }
      }
    });

    return members;
  } catch (error) {
    console.error("❌ Error fetching family members with hobby:", error);
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
      middle_name: item.middle_name?.S || '',
      nick_name: item.nick_name?.S || '',
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
      death_date: item.death_date?.S || '',
      use_first_name: item.use_first_name?.BOOL ?? true,
      use_middle_name: item.use_middle_name?.BOOL ?? false,
      use_nick_name: item.use_nick_name?.BOOL ?? false,
    }));
  } catch (error) {
    console.error("❌ Error fetching family members without email:", error);
    return [];
  }
};

export const updateFamilyMember = async (
  familyMemberId: string,
  data: {
    firstName: string;
    lastName: string;
    middleName?: string;
    nickName?: string;
    email: string;
    username: string;
    bio: string;
    phoneNumber: string;
    birthday: string;
    birth_city: string;
    birth_state: string;
    profile_photo: string;
    current_city: string;
    current_state: string;
    death_date: string;
  }
) => {
  try {
    const params = {
      TableName: TABLES.FAMILY,
      Key: {
        family_member_id: { S: familyMemberId },
      },
      UpdateExpression:
        "SET first_name = :firstName, last_name = :lastName, middle_name = :middleName, nick_name = :nickName, email = :email, username = :username, bio = :bio, phone_number = :phoneNumber, birthday = :birthday, birth_city = :birth_city, birth_state = :birth_state, profile_photo = :profile_photo, current_city = :current_city, current_state = :current_state, death_date = :death_date",
      ExpressionAttributeValues: {
        ":firstName": { S: data.firstName },
        ":lastName": { S: data.lastName },
        ":middleName": { S: data.middleName || '' },
        ":nickName": { S: data.nickName || '' },
        ":email": { S: data.email },
        ":username": { S: data.username },
        ":bio": { S: data.bio },
        ":phoneNumber": { S: data.phoneNumber },
        ":birthday": { S: data.birthday },
        ":birth_city": { S: data.birth_city },
        ":birth_state": { S: data.birth_state },
        ":profile_photo": { S: data.profile_photo },
        ":current_city": { S: data.current_city },
        ":current_state": { S: data.current_state },
        ":death_date": { S: data.death_date },
      },
      ReturnValues: "UPDATED_NEW" as ReturnValue,
    };

    await dynamoDB.send(new UpdateItemCommand(params));
    console.log("✅ Family member updated successfully!");
  } catch (error) {
    console.error("❌ Error updating family member:", error);
    throw error;
  }
};

// Function to validate a relationship before creating it
export const validateRelationship = async (
  personA: string, 
  personB: string, 
  relationshipType: RelationshipType
): Promise<RelationshipValidationResult> => {
  try {
    // Check for impossible relationships (e.g., someone can't be their own parent)
    if (personA === personB) {
      return { valid: false, error: "A person cannot have a relationship with themselves" };
    }

    // Check for existing relationships of the same type
    const existingRelationships = await getFamilyRelationships(personA);
    const duplicateRelationship = existingRelationships.find(rel => 
      ((rel.person_a_id === personA && rel.person_b_id === personB) ||
       (rel.person_a_id === personB && rel.person_b_id === personA)) &&
      rel.relationship_type === relationshipType
    );

    if (duplicateRelationship) {
      return { 
        valid: false, 
        error: `Relationship already exists between these members: ${duplicateRelationship.relationship_type}` 
      };
    }

    // Check for circular parent-child relationships with timeout
    if (relationshipType === 'parent') {
      try {
        const validationPromise = checkIfAncestor(personB, personA, new Set());
        const timeoutPromise = new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Validation timeout')), 5000)
        );
        
        const isAncestor = await Promise.race([validationPromise, timeoutPromise]);
        if (isAncestor) {
          return { valid: false, error: "This would create a circular parent-child relationship" };
        }
      } catch (error) {
        console.warn("⚠️ Relationship validation timeout or error:", error);
        // Continue with validation even if ancestry check fails
      }
    }

    return { valid: true };
  } catch (error) {
    console.error("❌ Error validating relationship:", error);
    return { valid: false, error: "Error validating relationship" };
  }
};

// Function to check if one person is an ancestor of another
const checkIfAncestor = async (
  ancestorId: string, 
  descendantId: string, 
  visited: Set<string> = new Set(),
  depth: number = 0,
  maxDepth: number = 10
): Promise<boolean> => {
  try {
    // Prevent infinite loops by tracking visited nodes and limiting depth
    if (visited.has(descendantId) || depth > maxDepth) {
      return false;
    }
    visited.add(descendantId);
    
    const relationships = await getFamilyRelationships(descendantId);
    
    for (const rel of relationships) {
      if (rel.relationship_type === 'parent') {
        // For parent relationships, person_a_id is the parent, person_b_id is the child
        // We're looking for parents of the descendantId, so person_b_id should equal descendantId
        if (rel.person_b_id === descendantId) {
          const parentId = rel.person_a_id;
          if (parentId === ancestorId) {
            return true;
          }
          // Recursively check if the parent is an ancestor, passing the visited set and incrementing depth
          if (await checkIfAncestor(ancestorId, parentId, visited, depth + 1, maxDepth)) {
            return true;
          }
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error("❌ Error checking ancestry:", error);
    return false;
  }
};

// Enhanced function to add a relationship with validation and automatic inverse creation
export const addFamilyRelationship = async (
  sourceId: string,
  targetId: string,
  relationshipType: RelationshipType,
  options?: {
    relationshipSubtype?: string;
    startDate?: string;
    endDate?: string;
    notes?: string;
    autoCreateInverse?: boolean;
  }
) => {
  try {
    // Validate the relationship
    const validation = await validateRelationship(sourceId, targetId, relationshipType);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const relationshipId = uuidv4();
    const currentUser = await getCurrentUser();
    const createdBy = currentUser.userId;

    // Create the main relationship
    const params = {
      TableName: TABLES.RELATIONSHIPS,
      Item: {
        relationship_id: { S: relationshipId },
        source_id: { S: sourceId },
        target_id: { S: targetId },
        relationship_type: { S: relationshipType },
        relationship_subtype: { S: options?.relationshipSubtype || '' },
        start_date: { S: options?.startDate || '' },
        end_date: { S: options?.endDate || '' },
        is_active: { BOOL: true },
        notes: { S: options?.notes || '' },
        created_date: { S: new Date().toISOString() },
        created_by: { S: createdBy }
      }
    };

    await dynamoDB.send(new PutItemCommand(params));

    // Auto-create inverse relationship if specified in rules
    const shouldCreateInverse = options?.autoCreateInverse !== false && 
                               RELATIONSHIP_RULES[relationshipType]?.autoCreateInverse;
    
    if (shouldCreateInverse && RELATIONSHIP_RULES[relationshipType]?.inverse) {
      const inverseType = RELATIONSHIP_RULES[relationshipType].inverse!;
      const inverseRelationshipId = uuidv4();
      
      const inverseParams = {
        TableName: TABLES.RELATIONSHIPS,
        Item: {
          relationship_id: { S: inverseRelationshipId },
          source_id: { S: targetId },
          target_id: { S: sourceId },
          relationship_type: { S: inverseType },
          relationship_subtype: { S: options?.relationshipSubtype || '' },
          start_date: { S: options?.startDate || '' },
          end_date: { S: options?.endDate || '' },
          is_active: { BOOL: true },
          notes: { S: options?.notes || '' },
          created_date: { S: new Date().toISOString() },
          created_by: { S: createdBy }
        }
      };

      await dynamoDB.send(new PutItemCommand(inverseParams));
    }

    console.log("✅ Relationship added successfully!");
    return relationshipId;
  } catch (error) {
    console.error("❌ Error adding relationship:", error);
    throw error;
  }
};

// Function to get relationships for a family member
export const getFamilyRelationships = async (familyMemberId: string): Promise<FamilyRelationship[]> => {
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
      relationship_id: item.relationship_id?.S || '',
      person_a_id: item.source_id?.S || '',
      person_b_id: item.target_id?.S || '',
      relationship_type: item.relationship_type?.S as RelationshipType || 'sibling',
      relationship_subtype: item.relationship_subtype?.S || '',
      start_date: item.start_date?.S || '',
      end_date: item.end_date?.S || '',
      is_active: item.is_active?.BOOL ?? true,
      notes: item.notes?.S || '',
      created_date: item.created_date?.S || '',
      created_by: item.created_by?.S || ''
    }));
  } catch (error) {
    console.error("❌ Error fetching relationships:", error);
    return [];
  }
};

// Function to remove a relationship by relationship_id
export const removeFamilyRelationship = async (
  relationshipId: string
) => {
  try {
    const params = {
      TableName: TABLES.RELATIONSHIPS,
      Key: {
        relationship_id: { S: relationshipId }
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

export const addFamilyMember = async (memberData: { 
  firstName: string, 
  lastName: string, 
  middleName?: string,
  nickName?: string,
  email: string, 
  username?: string,
  bio?: string,
  phoneNumber?: string,
  birthday?: string,
  birth_city?: string,
  birth_state?: string,
  profile_photo: string,
  current_city?: string,
  current_state?: string,
  death_date?: string
}) => {
  try {
    const params = {
      TableName: TABLES.FAMILY,
      Item: {
        family_member_id: { S: uuidv4() },
        first_name: { S: memberData.firstName },
        last_name: { S: memberData.lastName },
        middle_name: { S: memberData.middleName || '' },
        nick_name: { S: memberData.nickName || '' },
        email: { S: memberData.email },
        username: { S: memberData.username || '' },
        bio: { S: memberData.bio || '' },
        phone_number: { S: memberData.phoneNumber || '' },
        birthday: { S: memberData.birthday || '' },
        birth_city: { S: memberData.birth_city || '' },
        birth_state: { S: memberData.birth_state || '' },
        profile_photo: { S: memberData.profile_photo },
        current_city: { S: memberData.current_city || '' },
        current_state: { S: memberData.current_state || '' },
        death_date: { S: memberData.death_date || '' },
        use_first_name: { BOOL: true },
        use_middle_name: { BOOL: false },
        use_nick_name: { BOOL: false }
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

    return await Promise.all(response.Items.map(async (item) => ({
      photo_id: item.photo_id?.S || '',
      s3_key: item.s3_key?.S || '',
      uploaded_by: item.uploaded_by?.S || '',
      upload_date: item.upload_date?.S || '',
      album_ids: item.album_ids?.L?.map((id: any) => id.S || '') || [],
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
        people_tagged: item.people_tagged?.L ? await Promise.all(item.people_tagged.L.map(async (tagged) => {
          const userId = tagged.M?.id.S || '';
          const userName = await getUserNameById(userId);
          return {
            id: userId,
            name: userName ? `${userName.firstName} ${userName.lastName}` : 'Unknown User'
          };
        })) : [],
      },
      lastModified: item.lastModified?.S || ''
    })));
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
      created_by: item.created_by?.S || '',
      cover_photo_id: item.cover_photo_id?.S || ''
    }));
  } catch (error) {
    console.error("❌ Error fetching user albums:", error);
    return [];
  }
};

// Get a single photo by photo_id
export const getPhotoById = async (photoId: string): Promise<PhotoData | null> => {
  try {
    const params = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photoId }
      }
    };

    const command = new GetItemCommand(params);
    const response = await dynamoDB.send(command);

    if (!response.Item) {
      return null;
    }

    const item = response.Item;
    const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;
    const s3Key = item.s3_key?.S || '';

    if (!s3Key) {
      return null;
    }

    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });

    try {
      const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 86400 });
      
      return {
        photo_id: item.photo_id?.S || '',
        s3_key: s3Key,
        uploaded_by: item.uploaded_by?.S || '',
        upload_date: item.upload_date?.S || '',
        album_ids: item.album_ids?.L?.map((id: any) => id.S || '') || [],
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
          people_tagged: item.people_tagged?.L ? await Promise.all(item.people_tagged.L.map(async (tagged) => {
            const userId = tagged.M?.id.S || '';
            const userName = await getUserNameById(userId);
            return {
              id: userId,
              name: userName ? `${userName.firstName} ${userName.lastName}` : 'Unknown User'
            };
          })) : [],
        },
        lastModified: item.lastModified?.S || ''
      };
    } catch (error) {
      console.error('Error generating signed URL for key:', s3Key, error);
      return null;
    }
  } catch (error) {
    console.error("❌ Error fetching photo by ID:", error);
    return null;
  }
};

export const getPhotosByAlbum = async (albumId: string) => {
  try {
    const params = {
      TableName: TABLES.PHOTOS,
      FilterExpression: "contains(album_ids, :albumId)",
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
        const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 86400 });
        return {
          photo_id: item.photo_id?.S || '',
          s3_key: s3Key,
          uploaded_by: item.uploaded_by?.S || '',
          upload_date: item.upload_date?.S || '',
          album_ids: item.album_ids?.L?.map((id: any) => id.S || '') || [],
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
            people_tagged: item.people_tagged?.L ? await Promise.all(item.people_tagged.L.map(async (tagged) => {
              const userId = tagged.M?.id.S || '';
              const userName = await getUserNameById(userId);
              return {
                id: userId,
                name: userName ? `${userName.firstName} ${userName.lastName}` : 'Unknown User'
              };
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
        const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 86400 });
        return {
          photo_id: item.photo_id?.S || '',
          s3_key: s3Key,
          uploaded_by: item.uploaded_by?.S || '',
          upload_date: item.upload_date?.S || '',
          album_ids: item.album_ids?.L?.map((id: any) => id.S || '') || [],
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
            people_tagged: item.people_tagged?.L ? await Promise.all(item.people_tagged.L.map(async (tagged) => {
              const userId = tagged.M?.id.S || '';
              const userName = await getUserNameById(userId);
              return {
                id: userId,
                name: userName ? `${userName.firstName} ${userName.lastName}` : 'Unknown User'
              };
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
    // First, get the photo to find who uploaded it and who is tagged
    const getPhotoParams = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photoId }
      }
    };

    const photoData = await dynamoDB.send(new GetItemCommand(getPhotoParams));
    const uploadedBy = photoData.Item?.uploaded_by?.S;
    
    // Get tagged people IDs
    const taggedPeopleIds = new Set<string>();
    if (photoData.Item?.people_tagged?.L) {
      photoData.Item.people_tagged.L.forEach((person: any) => {
        const id = person.M?.id?.S;
        if (id) {
          taggedPeopleIds.add(id);
        }
      });
    }

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

    // Truncate comment for notification message (first 50 chars)
    const commentPreview = comment.length > 50 ? comment.substring(0, 50) + '...' : comment;

    // Create notification for the photo uploader (if they're not the one commenting)
    if (uploadedBy && uploadedBy !== userId) {
      try {
        const title = "New comment on your photo";
        const message = `${author} commented: "${commentPreview}"`;
        
        await createNotification(
          uploadedBy,
          'photo_comment',
          title,
          message,
          photoId, // related_id is the photo_id
          { commenter_id: userId, comment_preview: commentPreview }
        );
        
        console.log(`✅ Notification created for photo uploader (${uploadedBy})`);
      } catch (notificationError) {
        // Don't fail the comment addition if notification creation fails
        console.error("❌ Error creating photo comment notification for uploader:", notificationError);
      }
    }

    // Create notifications for tagged people (excluding commenter and uploader since we already notified uploader)
    if (taggedPeopleIds.size > 0) {
      try {
        for (const taggedUserId of taggedPeopleIds) {
          // Skip the commenter and uploader (uploader already got a notification above)
          if (taggedUserId === userId || taggedUserId === uploadedBy) continue;

          const title = "New comment on a photo you're tagged in";
          const message = `${author} commented: "${commentPreview}"`;
          
          await createNotification(
            taggedUserId,
            'photo_comment',
            title,
            message,
            photoId, // related_id is the photo_id
            { commenter_id: userId, comment_preview: commentPreview }
          );
        }
        
        const notifiedCount = Array.from(taggedPeopleIds).filter(id => id !== userId && id !== uploadedBy).length;
        if (notifiedCount > 0) {
          console.log(`✅ Created ${notifiedCount} notification(s) for tagged members`);
        }
      } catch (notificationError) {
        // Don't fail the comment addition if notification creation fails
        console.error("❌ Error creating photo comment notifications for tagged members:", notificationError);
      }
    }
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

    return await Promise.all(data.Item.comments.L.map(async (comment: any) => {
      const userId = comment.M?.userId?.S || '';
      const userName = await getUserNameById(userId);
      // Fetch current profile photo instead of using stored one
      const currentProfilePhoto = await getProfilePhotoById(userId);
      return {
        userId: userId,
        text: comment.M?.text?.S || '',
        author: userName ? `${userName.firstName} ${userName.lastName}` : 'Unknown',
        timestamp: comment.M?.timestamp?.S || '',
        profilePhoto: currentProfilePhoto || ''
      };
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

    // Get all name fields and preferences
    const first_name = data.Item.first_name?.S || '';
    const last_name = data.Item.last_name?.S || '';
    const middle_name = data.Item.middle_name?.S || '';
    const nick_name = data.Item.nick_name?.S || '';
    const use_first_name = data.Item.use_first_name?.BOOL ?? true;
    const use_middle_name = data.Item.use_middle_name?.BOOL ?? false;
    const use_nick_name = data.Item.use_nick_name?.BOOL ?? false;

    // Determine preferred first name based on user settings
    let preferredFirstName = first_name;
    if (use_nick_name && nick_name) {
      preferredFirstName = nick_name;
    } else if (use_middle_name && middle_name) {
      preferredFirstName = middle_name;
    }

    return {
      firstName: preferredFirstName,
      lastName: last_name
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

// Hobby Comments Functions
export const addCommentToHobby = async (hobby: string, userId: string, comment: string, author: string, profilePhoto: string, photoUrl?: string) => {
  try {
    const timestamp = new Date().toISOString();
    const commentItem: Record<string, any> = {
      userId: { S: userId },
      text: { S: comment },
      author: { S: author },
      timestamp: { S: timestamp },
      profilePhoto: { S: profilePhoto }
    };
    
    // Add photoUrl if provided
    if (photoUrl) {
      commentItem.photoUrl = { S: photoUrl };
    }
    
    const params = {
      TableName: TABLES.HOBBY_COMMENTS,
      Key: {
        hobby: { S: hobby }
      },
      UpdateExpression: "SET comments = list_append(if_not_exists(comments, :emptyList), :comment)",
      ExpressionAttributeValues: {
        ":comment": { L: [{ M: commentItem }] },
        ":emptyList": { L: [] }
      }
    };

    await dynamoDB.send(new UpdateItemCommand(params));
    console.log("✅ Comment added to hobby successfully!");

    // Create notifications for all members who have this hobby (except the commenter)
    try {
      const membersWithHobby = await getFamilyMembersWithHobby(hobby);
      
      // Truncate comment for notification message (first 50 chars)
      const commentPreview = comment.length > 50 ? comment.substring(0, 50) + '...' : comment;
      
      let notificationCount = 0;
      for (const member of membersWithHobby) {
        // Don't notify the person who made the comment
        if (member.id === userId) continue;
        
        const title = `New comment in ${hobby}`;
        const message = `${author} commented: "${commentPreview}"`;
        
        await createNotification(
          member.id,
          'hobby_comment',
          title,
          message,
          hobby, // related_id is the hobby name
          { commenter_id: userId, comment_preview: commentPreview }
        );
        notificationCount++;
      }
      
      if (notificationCount > 0) {
        console.log(`✅ Notifications created for ${notificationCount} member${notificationCount === 1 ? '' : 's'} in ${hobby} hobby`);
      }
    } catch (notificationError) {
      // Don't fail the comment addition if notification creation fails
      console.error("❌ Error creating hobby comment notifications:", notificationError);
    }
  } catch (error) {
    console.error("❌ Error adding comment to hobby:", error);
    throw error;
  }
};

export const getCommentsForHobby = async (hobby: string): Promise<Array<{ userId: string; text: string; author: string; timestamp: string; commenterPhoto: string; photoUrl?: string }>> => {
  try {
    const params = {
      TableName: TABLES.HOBBY_COMMENTS,
      Key: {
        hobby: { S: hobby }
      }
    };

    const data = await dynamoDB.send(new GetItemCommand(params));

    if (!data.Item || !data.Item.comments || !data.Item.comments.L) {
      return [];
    }

    return await Promise.all(data.Item.comments.L.map(async (comment: any) => {
      const userId = comment.M?.userId?.S || '';
      const userName = await getUserNameById(userId);
      // Fetch current profile photo instead of using stored one
      const currentProfilePhoto = await getProfilePhotoById(userId);
      return {
        userId: userId,
        text: comment.M?.text?.S || '',
        author: userName ? `${userName.firstName} ${userName.lastName}` : comment.M?.author?.S || 'Unknown',
        timestamp: comment.M?.timestamp?.S || '',
        commenterPhoto: currentProfilePhoto || '',
        photoUrl: comment.M?.photoUrl?.S || undefined
      };
    }));
  } catch (error) {
    console.error("❌ Error fetching comments for hobby:", error);
    return [];
  }
};

export const deleteCommentFromHobby = async (hobby: string, userId: string, commentIndex: number) => {
  try {
    const params = {
      TableName: TABLES.HOBBY_COMMENTS,
      Key: {
        hobby: { S: hobby }
      },
      UpdateExpression: `REMOVE comments[${commentIndex}]`,
      ConditionExpression: `comments[${commentIndex}].userId = :userId`,
      ExpressionAttributeValues: {
        ":userId": { S: userId }
      }
    };

    await dynamoDB.send(new UpdateItemCommand(params));
    console.log("✅ Comment deleted from hobby successfully!");
  } catch (error) {
    console.error("❌ Error deleting comment from hobby:", error);
    throw error;
  }
};

export const editCommentInHobby = async (hobby: string, userId: string, commentIndex: number, newText: string) => {
  try {
    const params = {
      TableName: TABLES.HOBBY_COMMENTS,
      Key: {
        hobby: { S: hobby }
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
    console.log("✅ Comment edited in hobby successfully!");
  } catch (error) {
    console.error("❌ Error editing comment in hobby:", error);
    throw error;
  }
};

// Memorial Comments Functions (for passed family members)
export const addCommentToMember = async (memberId: string, userId: string, comment: string, author: string, profilePhoto: string) => {
  try {
    const timestamp = new Date().toISOString();
    const params = {
      TableName: TABLES.FAMILY,
      Key: {
        family_member_id: { S: memberId }
      },
      UpdateExpression: "SET memorial_comments = list_append(if_not_exists(memorial_comments, :emptyList), :comment)",
      ExpressionAttributeValues: {
        ":comment": { L: [{ M: { userId: { S: userId }, text: { S: comment }, author: { S: author }, timestamp: { S: timestamp }, profilePhoto: { S: profilePhoto } } }] },
        ":emptyList": { L: [] }
      }
    };

    await dynamoDB.send(new UpdateItemCommand(params));
    console.log("✅ Memorial comment added successfully!");
  } catch (error) {
    console.error("❌ Error adding memorial comment:", error);
    throw error;
  }
};

export const getCommentsForMember = async (memberId: string): Promise<{ text: string; author: string; userId: string; timestamp: string; profilePhoto: string }[]> => {
  try {
    const params = {
      TableName: TABLES.FAMILY,
      Key: {
        family_member_id: { S: memberId }
      }
    };

    const data = await dynamoDB.send(new GetItemCommand(params));

    if (!data.Item || !data.Item.memorial_comments || !data.Item.memorial_comments.L) {
      return [];
    }

    return await Promise.all(data.Item.memorial_comments.L.map(async (comment: any) => {
      const userId = comment.M?.userId?.S || '';
      const userName = await getUserNameById(userId);
      // Fetch current profile photo instead of using stored one
      const currentProfilePhoto = await getProfilePhotoById(userId);
      return {
        userId: userId,
        text: comment.M?.text?.S || '',
        author: userName ? `${userName.firstName} ${userName.lastName}` : 'Unknown',
        timestamp: comment.M?.timestamp?.S || '',
        profilePhoto: currentProfilePhoto || ''
      };
    }));
  } catch (error) {
    console.error("❌ Error fetching memorial comments:", error);
    return [];
  }
};

export const deleteCommentFromMember = async (memberId: string, userId: string, commentIndex: number) => {
  try {
    const params = {
      TableName: TABLES.FAMILY,
      Key: {
        family_member_id: { S: memberId }
      },
      UpdateExpression: `REMOVE memorial_comments[${commentIndex}]`,
      ConditionExpression: `memorial_comments[${commentIndex}].userId = :userId`,
      ExpressionAttributeValues: {
        ":userId": { S: userId }
      }
    };

    await dynamoDB.send(new UpdateItemCommand(params));
    console.log("✅ Memorial comment deleted successfully!");
  } catch (error) {
    console.error("❌ Error deleting memorial comment:", error);
    throw error;
  }
};

export const editCommentInMember = async (memberId: string, userId: string, commentIndex: number, newText: string) => {
  try {
    const params = {
      TableName: TABLES.FAMILY,
      Key: {
        family_member_id: { S: memberId }
      },
      UpdateExpression: `SET memorial_comments[${commentIndex}].#text = :newText`,
      ConditionExpression: `memorial_comments[${commentIndex}].userId = :userId`,
      ExpressionAttributeNames: {
        "#text": "text"
      },
      ExpressionAttributeValues: {
        ":newText": { S: newText },
        ":userId": { S: userId }
      }
    };

    await dynamoDB.send(new UpdateItemCommand(params));
    console.log("✅ Memorial comment edited successfully!");
  } catch (error) {
    console.error("❌ Error editing memorial comment:", error);
    throw error;
  }
};

export const saveRSVPToDynamoDB = async (eventId: string, userId: string, status: 'yes' | 'no' | 'maybe', eventCreatorId?: string) => {
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

        // Create notification for the event creator (if they're not the one RSVPing and we have the creator ID)
        if (eventCreatorId && eventCreatorId !== userId) {
            try {
                // Get the RSVP person's name
                const rsvpPersonName = await getUserNameById(userId);
                const rsvpPersonDisplayName = rsvpPersonName 
                    ? `${rsvpPersonName.firstName} ${rsvpPersonName.lastName}` 
                    : 'Someone';

                const statusText = status === 'yes' ? 'is attending' : status === 'maybe' ? 'might attend' : 'cannot attend';
                const title = "New RSVP for your event";
                const message = `${rsvpPersonDisplayName} ${statusText} your event`;

                await createNotification(
                    eventCreatorId,
                    'event_rsvp',
                    title,
                    message,
                    eventId, // related_id is the event_id
                    { rsvp_user_id: userId, rsvp_status: status }
                );

                console.log(`✅ Notification created for event creator (${eventCreatorId})`);
            } catch (notificationError) {
                // Don't fail the RSVP save if notification creation fails
                console.error("❌ Error creating event RSVP notification:", notificationError);
            }
        }
    } catch (error) {
        console.error("❌ Error saving RSVP to DynamoDB:", error);
        throw error;
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
    // Remove the album from all photos that contain it
    const photos = await getPhotosByAlbum(albumId);
    for (const photo of photos) {
      // Remove album_id from the photo's album_ids array
      await removePhotoFromAlbum(photo.photo_id, albumId);
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
 * Removes a photo from an album by removing the album_id from the photo's album_ids array.
 * @param photo_id The ID of the photo to update.
 * @param album_id The ID of the album to remove the photo from.
 */
export const removePhotoFromAlbum = async (photo_id: string, album_id: string) => {
  try {
    // Get the current photo data to find the index of the album_id
    const getPhotoParams = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photo_id }
      }
    };

    const photoData = await dynamoDB.send(new GetItemCommand(getPhotoParams));
    
    if (!photoData.Item) {
      throw new Error("Photo not found");
    }

    // Get the current album_ids array
    const currentAlbumIds = photoData.Item.album_ids?.L?.map((item: any) => item.S) || [];
    
    // Find the index of the album to remove
    const indexToRemove = currentAlbumIds.indexOf(album_id);
    
    if (indexToRemove === -1) {
      console.log(`Photo ${photo_id} is not in album ${album_id}`);
      return; // Photo is not in this album
    }

    // Remove the album_id from the array
    const params = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photo_id }
      },
      UpdateExpression: `REMOVE album_ids[${indexToRemove}]`
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
        const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 86400 });
        return {
          photo_id: item.photo_id?.S || '',
          s3_key: s3Key,
          uploaded_by: item.uploaded_by?.S || '',
          upload_date: item.upload_date?.S || '',
          album_ids: item.album_ids?.L?.map((id: any) => id.S || '') || [],
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
            people_tagged: item.people_tagged?.L ? await Promise.all(item.people_tagged.L.map(async (tagged) => {
              const userId = tagged.M?.id.S || '';
              const userName = await getUserNameById(userId);
              return {
                id: userId,
                name: userName ? `${userName.firstName} ${userName.lastName}` : 'Unknown User'
              };
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
    ReturnValues: 'UPDATED_NEW' as ReturnValue,
  };

  await dynamoDB.send(new UpdateItemCommand(params));
}

/**
 * Remove a tagged person from a photo's people_tagged array.
 * @param photo_id The ID of the photo to update.
 * @param user_id The ID of the user to untag.
 */
export const removeTagFromPhoto = async (photo_id: string, user_id: string) => {
  try {
    // Get the current photo data to find the index of the tagged person
    const getPhotoParams = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photo_id }
      }
    };

    const photoData = await dynamoDB.send(new GetItemCommand(getPhotoParams));
    
    if (!photoData.Item) {
      throw new Error("Photo not found");
    }

    // Get the current people_tagged array
    const currentTaggedPeople = photoData.Item.people_tagged?.L || [];
    
    // Find the index of the user to untag
    const indexToRemove = currentTaggedPeople.findIndex((person: any) => person.M?.id?.S === user_id);
    
    if (indexToRemove === -1) {
      console.log(`User ${user_id} is not tagged in photo ${photo_id}`);
      return; // User is not tagged in this photo
    }

    // Remove the tag from the array
    const params = {
      TableName: TABLES.PHOTOS,
      Key: {
        photo_id: { S: photo_id }
      },
      UpdateExpression: `REMOVE people_tagged[${indexToRemove}]`
    };

    await dynamoDB.send(new UpdateItemCommand(params));
    console.log(`✅ User ${user_id} untagged from photo ${photo_id}`);
  } catch (error) {
    console.error(`❌ Error untagging user ${user_id} from photo ${photo_id}:`, error);
    throw error;
  }
};

// ==================== FAMILY TREE GENERATION FUNCTIONS ====================

// Interface for family tree node
export interface FamilyTreeNode {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo?: string;
  spouse?: FamilyTreeNode;
  previousSpouses?: FamilyTreeNode[];
  children?: FamilyTreeNode[];
  parents?: FamilyTreeNode[];
  siblings?: FamilyTreeNode[];
  relationships?: Array<{
    personId: string;
    relationshipType: RelationshipType;
    person: FamilyTreeNode;
  }>;
}

// Function to build family tree from relationships
export const buildFamilyTreeFromRelationships = async (rootPersonId: string): Promise<FamilyTreeNode | null> => {
  try {
    const allRelationships = await getAllFamilyRelationships();
    const allMembers = await getAllFamilyMembers();
    
    console.log("🔍 Debug: All relationships found:", allRelationships.length);
    console.log("🔍 Debug: Relationships for root person", rootPersonId, ":", 
      allRelationships.filter(r => r.person_a_id === rootPersonId || r.person_b_id === rootPersonId));
    
    // Build relationship graph
    const relationshipGraph = buildRelationshipGraph(allRelationships);
    
    // Generate tree structure starting from root person
    const tree = await generateTreeStructure(rootPersonId, relationshipGraph, allMembers);
    
    console.log("🔍 Debug: Generated tree for", rootPersonId, ":", tree);
    
    return tree;
  } catch (error) {
    console.error("❌ Error building family tree:", error);
    return null;
  }
};

// Function to get all relationships (enhanced version)
export const getAllFamilyRelationships = async (): Promise<FamilyRelationship[]> => {
  try {
    const params = {
      TableName: TABLES.RELATIONSHIPS,
    };

    const command = new ScanCommand(params);
    const response = await dynamoDB.send(command);

    if (!response.Items) {
      return [];
    }

    return response.Items.map(item => ({
      relationship_id: item.relationship_id?.S || '',
      person_a_id: item.source_id?.S || '',
      person_b_id: item.target_id?.S || '',
      relationship_type: item.relationship_type?.S as RelationshipType || 'sibling',
      relationship_subtype: item.relationship_subtype?.S || '',
      start_date: item.start_date?.S || '',
      end_date: item.end_date?.S || '',
      is_active: item.is_active?.BOOL ?? true,
      notes: item.notes?.S || '',
      created_date: item.created_date?.S || '',
      created_by: item.created_by?.S || ''
    }));
  } catch (error) {
    console.error("❌ Error fetching all relationships:", error);
    return [];
  }
};

// Function to build relationship graph
const buildRelationshipGraph = (relationships: FamilyRelationship[]) => {
  const graph = new Map<string, Set<string>>();
  const relationshipTypes = new Map<string, Map<string, RelationshipType>>();
  
  console.log("🔍 Debug: Building relationship graph from", relationships.length, "relationships");
  
  relationships.forEach(rel => {
    console.log(`🔍 Debug: Processing relationship: ${rel.person_a_id} -> ${rel.person_b_id} (${rel.relationship_type})`);
    
    if (!graph.has(rel.person_a_id)) {
      graph.set(rel.person_a_id, new Set());
      relationshipTypes.set(rel.person_a_id, new Map());
    }
    if (!graph.has(rel.person_b_id)) {
      graph.set(rel.person_b_id, new Set());
      relationshipTypes.set(rel.person_b_id, new Map());
    }
    
    graph.get(rel.person_a_id)!.add(rel.person_b_id);
    graph.get(rel.person_b_id)!.add(rel.person_a_id);
    
    const inverseType = getInverseRelationshipType(rel.relationship_type);
    relationshipTypes.get(rel.person_a_id)!.set(rel.person_b_id, rel.relationship_type);
    relationshipTypes.get(rel.person_b_id)!.set(rel.person_a_id, inverseType);
    
    console.log(`🔍 Debug: Set ${rel.person_a_id} -> ${rel.person_b_id} as ${rel.relationship_type}`);
    console.log(`🔍 Debug: Set ${rel.person_b_id} -> ${rel.person_a_id} as ${inverseType}`);
  });
  
  console.log("🔍 Debug: Final graph:", graph);
  console.log("🔍 Debug: Final relationship types:", relationshipTypes);
  
  return { graph, relationshipTypes };
};

// Function to get inverse relationship type
const getInverseRelationshipType = (relationshipType: RelationshipType): RelationshipType => {
  const rule = RELATIONSHIP_RULES[relationshipType];
  return rule?.inverse || relationshipType;
};

// Function to generate tree structure
const generateTreeStructure = async (
  rootPersonId: string, 
  relationshipGraph: { graph: Map<string, Set<string>>, relationshipTypes: Map<string, Map<string, RelationshipType>> }, 
  allMembers: FamilyMember[]
): Promise<FamilyTreeNode | null> => {
  try {
    const member = allMembers.find(m => m.family_member_id === rootPersonId);
    if (!member) return null;

    const visited = new Set<string>();
    return await buildNode(rootPersonId, relationshipGraph, allMembers, visited);
  } catch (error) {
    console.error("❌ Error generating tree structure:", error);
    return null;
  }
};

// Function to build individual node
const buildNode = async (
  personId: string,
  relationshipGraph: { graph: Map<string, Set<string>>, relationshipTypes: Map<string, Map<string, RelationshipType>> },
  allMembers: FamilyMember[],
  visited: Set<string>,
  depth: number = 0,
  maxDepth: number = 5
): Promise<FamilyTreeNode | null> => {
  console.log(`🔍 Debug: Building node for ${personId}, depth: ${depth}, visited:`, Array.from(visited));
  
  if (depth > maxDepth) {
    console.log(`🔍 Debug: Max depth reached for ${personId}`);
    return null;
  }
  
  if (visited.has(personId)) {
    console.log(`🔍 Debug: ${personId} already visited, returning null`);
    return null;
  }
  visited.add(personId);

  const member = allMembers.find(m => m.family_member_id === personId);
  if (!member) {
    console.log(`🔍 Debug: Member ${personId} not found in allMembers`);
    return null;
  }

  const node: FamilyTreeNode = {
    id: member.family_member_id,
    first_name: member.first_name,
    last_name: member.last_name,
    profile_photo: member.profile_photo,
    relationships: []
  };

  const connectedPersons = relationshipGraph.graph.get(personId) || new Set();
  console.log(`🔍 Debug: Connected persons for ${personId}:`, Array.from(connectedPersons));
  
  // Find spouse, parents, children, and siblings
  let spouse: FamilyTreeNode | undefined;
  const children: FamilyTreeNode[] = [];
  const parents: FamilyTreeNode[] = [];
  const siblings: FamilyTreeNode[] = [];

  for (const connectedPersonId of connectedPersons) {
    const relationshipType = relationshipGraph.relationshipTypes.get(personId)?.get(connectedPersonId);
    console.log(`🔍 Debug: Relationship ${personId} -> ${connectedPersonId}: ${relationshipType}`);
    
    if (!relationshipType) continue;

    // Create a new visited set for this branch to avoid circular references
    const branchVisited = new Set(visited);
    const connectedPerson = await buildNode(connectedPersonId, relationshipGraph, allMembers, branchVisited, depth + 1, maxDepth);
    if (!connectedPerson) {
      console.log(`🔍 Debug: Could not build node for ${connectedPersonId}`);
      continue;
    }

    // Add to relationships array
    node.relationships!.push({
      personId: connectedPersonId,
      relationshipType,
      person: connectedPerson
    });

    // Categorize relationships
    switch (relationshipType) {
      case 'spouse':
        spouse = connectedPerson;
        break;
      case 'child':
        children.push(connectedPerson);
        console.log(`🔍 Debug: Added child ${connectedPersonId} to ${personId}`);
        break;
      case 'parent':
        parents.push(connectedPerson);
        break;
      case 'sibling':
        siblings.push(connectedPerson);
        break;
    }
  }

  if (spouse) node.spouse = spouse;
  if (children.length > 0) {
    node.children = children;
    console.log(`🔍 Debug: Final children count for ${personId}: ${children.length}`);
  }
  if (parents.length > 0) node.parents = parents;
  if (siblings.length > 0) node.siblings = siblings;

  console.log(`🔍 Debug: Built node for ${personId}:`, node);
  return node;
};

// Function to suggest possible relationships between two people
export const suggestPossibleRelationships = async (
  personAId: string, 
  personBId: string
): Promise<Array<{ relationshipType: RelationshipType; confidence: number; reason: string }>> => {
  try {
    const personARelationships = await getFamilyRelationships(personAId);
    const personBRelationships = await getFamilyRelationships(personBId);
    const allMembers = await getAllFamilyMembers();
    
    const suggestions: Array<{ relationshipType: RelationshipType; confidence: number; reason: string }> = [];

    // Analyze existing relationships to infer possible connections
    const personAConnections = personARelationships.map(rel => ({
      personId: rel.person_a_id === personAId ? rel.person_b_id : rel.person_a_id,
      relationshipType: rel.relationship_type
    }));

    const personBConnections = personBRelationships.map(rel => ({
      personId: rel.person_a_id === personBId ? rel.person_b_id : rel.person_a_id,
      relationshipType: rel.relationship_type
    }));

    // Find common connections
    const commonConnections = personAConnections.filter(connA => 
      personBConnections.some(connB => connB.personId === connA.personId)
    );

    // Suggest relationships based on common connections
    for (const commonConn of commonConnections) {
      const personBConnToCommon = personBConnections.find(conn => conn.personId === commonConn.personId);
      if (!personBConnToCommon) continue;

      // If both are children of the same person, they're siblings
      if (commonConn.relationshipType === 'parent' && personBConnToCommon.relationshipType === 'parent') {
        suggestions.push({
          relationshipType: 'sibling',
          confidence: 0.9,
          reason: `Both are children of the same parent (${commonConn.personId})`
        });
      }

      // If one is parent and other is child of same person, they might be grandparent/grandchild
      if (commonConn.relationshipType === 'parent' && personBConnToCommon.relationshipType === 'child') {
        suggestions.push({
          relationshipType: 'grandparent',
          confidence: 0.8,
          reason: `One is parent and other is child of the same person`
        });
      }
    }

    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  } catch (error) {
    console.error("❌ Error suggesting relationships:", error);
    return [];
  }
};

// ========== NOTIFICATION FUNCTIONS ==========

// Helper function to calculate days until birthday
const getDaysUntilBirthday = (birthday: string): number | null => {
  if (!birthday) return null;
  
  try {
    const dateStr = birthday.split('T')[0]; // Get YYYY-MM-DD part
    const [year, month, day] = dateStr.split('-').map(Number);
    
    if (!month || !day) return null;
    
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Create birthday date for this year
    const thisYearBirthday = new Date(currentYear, month - 1, day);
    
    // If birthday already passed this year, use next year
    const nextBirthday = thisYearBirthday < today 
      ? new Date(currentYear + 1, month - 1, day)
      : thisYearBirthday;
    
    const diffTime = nextBirthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (error) {
    console.error("❌ Error calculating days until birthday:", error);
    return null;
  }
};

// Create a notification
export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  relatedId?: string,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const notificationId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const item: Record<string, any> = {
      notification_id: { S: notificationId },
      user_id: { S: userId },
      type: { S: type },
      title: { S: title },
      message: { S: message },
      is_read: { BOOL: false },
      created_at: { S: timestamp }
    };
    
    if (relatedId) {
      item.related_id = { S: relatedId };
    }
    
    if (metadata) {
      item.metadata = { M: {} };
      Object.keys(metadata).forEach(key => {
        if (typeof metadata[key] === 'string') {
          item.metadata.M[key] = { S: metadata[key] };
        } else if (typeof metadata[key] === 'number') {
          item.metadata.M[key] = { N: metadata[key].toString() };
        } else if (typeof metadata[key] === 'boolean') {
          item.metadata.M[key] = { BOOL: metadata[key] };
        }
      });
    }
    
    const params = {
      TableName: TABLES.NOTIFICATIONS,
      Item: item
    };
    
    await dynamoDB.send(new PutItemCommand(params));
    console.log("✅ Notification created successfully!");
  } catch (error) {
    console.error("❌ Error creating notification:", error);
    throw error;
  }
};

// Generate birthday notifications for all family members (for birthdays in next 4 weeks)
// Helper function to calculate days until event
const getDaysUntilEvent = (eventStartDate: string): number | null => {
  try {
    const eventDate = new Date(eventStartDate);
    const today = new Date();
    
    // Set both dates to midnight for accurate day calculation
    const eventMidnight = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const diffTime = eventMidnight.getTime() - todayMidnight.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (error) {
    console.error("❌ Error calculating days until event:", error);
    return null;
  }
};

// Generate event reminder notifications for users who have RSVP'd
// This function accepts events from the client side (localStorage)
export const generateEventReminderNotifications = async (events: Array<{ id?: string; title: string; start: string }>): Promise<void> => {
  try {
    // Get all family members to process their RSVPs
    const familyMembers = await getAllFamilyMembers();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Process each family member's RSVPs
    for (const member of familyMembers) {
      const userId = member.family_member_id;
      
      // Get all RSVPs for this user
      const userRSVPs = await getUserRSVPs(userId);
      
      // Filter to only include RSVPs with status "yes" or "maybe" (exclude "no")
      const relevantRSVPs = userRSVPs.filter(rsvp => rsvp.status === 'yes' || rsvp.status === 'maybe');
      
      for (const rsvp of relevantRSVPs) {
        // Find the event in the events array
        const event = events.find(e => e.id === rsvp.eventId);
        
        if (!event || !event.start) continue;
        
        const daysUntilEvent = getDaysUntilEvent(event.start);
        
        // Only create notifications for upcoming events (not past events)
        if (daysUntilEvent === null || daysUntilEvent < 0) continue;
        
        // Check if we should create a notification at this interval (30 days, 7 days, 1 day, or day of)
        const reminderDays = [30, 7, 1, 0];
        if (!reminderDays.includes(daysUntilEvent)) continue;
        
        // Check if notification already exists for this event at this day interval
        const existingNotifications = await getNotificationsByUser(userId);
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const alreadyNotified = existingNotifications.some(
          n => n.type === 'event_reminder'
            && n.related_id === rsvp.eventId
            && n.metadata?.days_until === daysUntilEvent
            && n.created_at >= todayStart
        );
        
        if (!alreadyNotified) {
          let message = '';
          if (daysUntilEvent === 0) {
            message = `${event.title} is today!`;
          } else if (daysUntilEvent === 1) {
            message = `${event.title} is tomorrow!`;
          } else {
            message = `${event.title} is in ${daysUntilEvent} days`;
          }
          
          await createNotification(
            userId,
            'event_reminder',
            `Upcoming Event: ${event.title}`,
            message,
            rsvp.eventId,
            { days_until: daysUntilEvent }
          );
        }
      }
    }
    
    console.log("✅ Event reminder notifications generated successfully!");
  } catch (error) {
    console.error("❌ Error generating event reminder notifications:", error);
    throw error;
  }
};

// Send cancellation notifications to users who RSVP'd "yes" or "maybe" to an event
export const sendEventCancellationNotifications = async (eventId: string, eventTitle: string): Promise<void> => {
  try {
    // Get all RSVPs for this event
    const eventRSVPs = await getEventRSVPs(eventId);
    
    // Filter to only include RSVPs with status "yes" or "maybe"
    const relevantRSVPs = eventRSVPs.filter(rsvp => rsvp.status === 'yes' || rsvp.status === 'maybe');
    
    // Send notification to each user who RSVP'd yes or maybe
    for (const rsvp of relevantRSVPs) {
      try {
        const title = "Event Cancelled";
        const message = `"${eventTitle}" has been cancelled`;
        
        await createNotification(
          rsvp.userId,
          'event_cancelled',
          title,
          message,
          eventId, // related_id is the event_id
          { event_title: eventTitle }
        );
        
        console.log(`✅ Cancellation notification created for user (${rsvp.userId})`);
      } catch (notificationError) {
        console.error(`❌ Error creating cancellation notification for user ${rsvp.userId}:`, notificationError);
      }
    }
    
    console.log("✅ Event cancellation notifications sent successfully!");
  } catch (error) {
    console.error("❌ Error sending event cancellation notifications:", error);
    throw error;
  }
};

export const generateBirthdayNotifications = async (): Promise<void> => {
  try {
    const familyMembers = await getAllFamilyMembers();
    const today = new Date();
    const fourWeeksFromNow = new Date(today);
    fourWeeksFromNow.setDate(fourWeeksFromNow.getDate() + 28);
    
    for (const member of familyMembers) {
      if (!member.birthday || member.death_date) continue; // Skip if no birthday or deceased
      
      const daysUntilBirthday = getDaysUntilBirthday(member.birthday);
      if (daysUntilBirthday === null || daysUntilBirthday < 0 || daysUntilBirthday > 28) {
        continue; // Skip if not in next 4 weeks
      }
      
      // Create notifications for all other family members
      for (const otherMember of familyMembers) {
        if (otherMember.family_member_id === member.family_member_id) continue; // Don't notify the person themselves
        
        const memberName = member.use_nick_name && member.nick_name 
          ? member.nick_name 
          : member.use_middle_name && member.middle_name 
            ? member.middle_name 
            : member.first_name;
        
        const daysText = daysUntilBirthday === 0 
          ? "today" 
          : daysUntilBirthday === 1 
            ? "tomorrow" 
            : `in ${daysUntilBirthday} days`;
        
        const title = `${memberName} ${member.last_name}'s Birthday`;
        const message = `${memberName} ${member.last_name}'s birthday is ${daysText}! 🎂`;
        
        // Check if notification already exists for this birthday
        const existingNotifications = await getNotificationsByUser(otherMember.family_member_id);
        const alreadyNotified = existingNotifications.some(
          n => n.type === 'birthday' 
            && n.related_id === member.family_member_id
            && n.created_at >= new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
        );
        
        if (!alreadyNotified) {
          await createNotification(
            otherMember.family_member_id,
            'birthday',
            title,
            message,
            member.family_member_id,
            { days_until: daysUntilBirthday }
          );
        }
      }
    }
    
    console.log("✅ Birthday notifications generated successfully!");
  } catch (error) {
    console.error("❌ Error generating birthday notifications:", error);
    throw error;
  }
};

// Get all notifications for a user
export const getNotificationsByUser = async (userId: string): Promise<Notification[]> => {
  try {
    const params = {
      TableName: TABLES.NOTIFICATIONS,
      FilterExpression: "user_id = :userId",
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
      notification_id: item.notification_id?.S || '',
      user_id: item.user_id?.S || '',
      type: (item.type?.S || 'birthday') as NotificationType,
      title: item.title?.S || '',
      message: item.message?.S || '',
      is_read: item.is_read?.BOOL ?? false,
      created_at: item.created_at?.S || '',
      related_id: item.related_id?.S,
      metadata: item.metadata?.M ? Object.keys(item.metadata.M).reduce((acc, key) => {
        const value = item.metadata!.M![key];
        if (value.S) acc[key] = value.S;
        else if (value.N) acc[key] = Number(value.N);
        else if (value.BOOL !== undefined) acc[key] = value.BOOL;
        return acc;
      }, {} as Record<string, any>) : undefined
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    return [];
  }
};

// Get unread notification count for a user
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const notifications = await getNotificationsByUser(userId);
    return notifications.filter(n => !n.is_read).length;
  } catch (error) {
    console.error("❌ Error getting unread notification count:", error);
    return 0;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string, userId: string): Promise<void> => {
  try {
    const params = {
      TableName: TABLES.NOTIFICATIONS,
      Key: {
        notification_id: { S: notificationId }
      },
      UpdateExpression: "SET is_read = :read",
      ConditionExpression: "user_id = :userId",
      ExpressionAttributeValues: {
        ":read": { BOOL: true },
        ":userId": { S: userId }
      }
    };
    
    await dynamoDB.send(new UpdateItemCommand(params));
    console.log("✅ Notification marked as read!");
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    throw error;
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const notifications = await getNotificationsByUser(userId);
    const unreadNotifications = notifications.filter(n => !n.is_read);
    
    for (const notification of unreadNotifications) {
      await markNotificationAsRead(notification.notification_id, userId);
    }
    
    console.log("✅ All notifications marked as read!");
  } catch (error) {
    console.error("❌ Error marking all notifications as read:", error);
    throw error;
  }
};