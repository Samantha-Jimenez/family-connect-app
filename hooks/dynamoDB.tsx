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
  EVENT_RSVP: "EventRSVPs"
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
  social_media?: {
    platform: string;
    url: string;
  }[];
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
  | 'cousin' | 'second_cousin' | 'cousin_once_removed'
  // Step relationships
  | 'step_parent' | 'step_child' | 'step_sibling'
  // In-law relationships
  | 'parent_in_law' | 'child_in_law' | 'sibling_in_law'
  | 'son_in_law' | 'daughter_in_law'
  | 'father_in_law' | 'mother_in_law'
  | 'brother_in_law' | 'sister_in_law'
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
  social_media?: { platform: string; url: string }[]
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
      show_zodiac: { BOOL: show_zodiac ?? false }
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
      death_date: item.death_date?.S || '',
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
        "SET first_name = :firstName, last_name = :lastName, email = :email, username = :username, bio = :bio, phone_number = :phoneNumber, birthday = :birthday, birth_city = :birth_city, birth_state = :birth_state, profile_photo = :profile_photo, current_city = :current_city, current_state = :current_state, death_date = :death_date",
      ExpressionAttributeValues: {
        ":firstName": { S: data.firstName },
        ":lastName": { S: data.lastName },
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

    // Check for existing relationships
    const existingRelationships = await getFamilyRelationships(personA);
    const duplicateRelationship = existingRelationships.find(rel => 
      (rel.person_a_id === personA && rel.person_b_id === personB) ||
      (rel.person_a_id === personB && rel.person_b_id === personA)
    );

    if (duplicateRelationship) {
      return { 
        valid: false, 
        error: `Relationship already exists between these members: ${duplicateRelationship.relationship_type}` 
      };
    }

    // Check for circular parent-child relationships
    if (relationshipType === 'parent') {
      const isAncestor = await checkIfAncestor(personB, personA);
      if (isAncestor) {
        return { valid: false, error: "This would create a circular parent-child relationship" };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error("❌ Error validating relationship:", error);
    return { valid: false, error: "Error validating relationship" };
  }
};

// Function to check if one person is an ancestor of another
const checkIfAncestor = async (ancestorId: string, descendantId: string): Promise<boolean> => {
  try {
    const relationships = await getFamilyRelationships(descendantId);
    
    for (const rel of relationships) {
      if (rel.relationship_type === 'parent') {
        const parentId = rel.person_a_id === descendantId ? rel.person_b_id : rel.person_a_id;
        if (parentId === ancestorId) {
          return true;
        }
        // Recursively check if the parent is an ancestor
        if (await checkIfAncestor(ancestorId, parentId)) {
          return true;
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
      created_by: item.created_by?.S || '',
      cover_photo_id: item.cover_photo_id?.S || ''
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
        const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });
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
        const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });
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