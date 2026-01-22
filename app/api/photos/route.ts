import { NextResponse } from 'next/server';
import { DynamoDBClient, ScanCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getUserFamilyGroup, normalizeFamilyGroup } from '@/utils/demoConfig';

const dynamoDB = new DynamoDBClient({
  region: process.env.NEXT_PUBLIC_AWS_PROJECT_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  },
});

const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_PROJECT_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  },
});

// Helper function to get preferred name for a user
async function getPreferredName(userId: string): Promise<string> {
  try {
    const params = {
      TableName: 'Family',
      Key: {
        family_member_id: { S: userId }
      }
    };

    const data = await dynamoDB.send(new GetItemCommand(params));

    if (!data.Item) {
      return 'Unknown User';
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

    return `${preferredFirstName} ${last_name}`;
  } catch (error) {
    console.error('Error fetching preferred name for user:', userId, error);
    return 'Unknown User';
  }
}

// Helper function to get family member IDs for a user's family group
async function getFamilyMemberIds(userId: string | null): Promise<string[]> {
  if (!userId) {
    return [];
  }
  
  try {
    const familyGroup = getUserFamilyGroup(userId);
    
    const params = {
      TableName: 'Family',
    };
    
    const command = new ScanCommand(params);
    const response = await dynamoDB.send(command);
    
    if (!response.Items) {
      return [];
    }
    
    // Filter by family group and return IDs
    const filteredMembers = response.Items
      .map(item => ({
        id: item.family_member_id?.S || '',
        family_group: normalizeFamilyGroup(item.family_group?.S),
        name: `${item.first_name?.S || ''} ${item.last_name?.S || ''}`.trim(),
      }))
      .filter(member => {
        const memberGroup = normalizeFamilyGroup(member.family_group);
        return memberGroup === familyGroup;
      });
    
    const memberIds = filteredMembers.map(member => member.id);
    
    return memberIds;
  } catch (error) {
    console.error('❌ Error fetching family member IDs:', error);
    return [];
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const taggedUserId = url.searchParams.get('taggedUserId');
  const currentUserId = url.searchParams.get('userId'); // Get current user ID for family group filtering

  try {
    // Get family member IDs for the current user's family group
    const familyMemberIds = currentUserId ? await getFamilyMemberIds(currentUserId) : [];
    
    // If we have a userId but no family members found, return empty (user has no family group data)
    if (currentUserId && familyMemberIds.length === 0) {
      return NextResponse.json({ photos: [] });
    }
    
    const params: any = {
      TableName: 'Photos',
    };
    
    // Note: We don't filter by taggedUserId in DynamoDB because people_tagged is a List of Maps,
    // and DynamoDB's contains() function doesn't work correctly with nested structures.
    // Instead, we'll filter in JavaScript after processing the photos.

    const command = new ScanCommand(params);
    const response = await dynamoDB.send(command);

    if (!response.Items) {
      return NextResponse.json({ photos: [] });
    }
    
    // Filter by family group - only show photos from the user's family group
    // Primary check: family_group field on photo must match user's family group
    // Secondary check: if no family_group set, check if uploaded_by matches family member IDs (backward compatibility)
    // Note: For real users, getUserFamilyGroup returns '' (falsy). We must not use userFamilyGroup in the
    // condition—use currentUserId only. Otherwise real users incorrectly get no photos.
    const userFamilyGroup = currentUserId ? getUserFamilyGroup(currentUserId) : null;
    const filteredItems = currentUserId
      ? response.Items.filter(item => {
          const uploadedBy = item.uploaded_by?.S || '';
          const photoFamilyGroup = item.family_group?.S; // Get family_group from photo (may be undefined for old photos)
          
          // Primary check: if photo has family_group, it must match user's family group
          if (photoFamilyGroup) {
            return photoFamilyGroup === userFamilyGroup;
          }
          
          // Secondary check: if no family_group set (old photos), check if uploaded_by is in family member IDs
          // This is for backward compatibility with photos uploaded before family_group was added
          return familyMemberIds.length > 0 && familyMemberIds.includes(uploadedBy);
        })
      : response.Items; // If no userId, return all (backward compatibility, should be avoided)

    const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;
    
    const photos = await Promise.all(filteredItems.map(async (item) => {
      const s3Key = item.s3_key.S?.replace(/^photos\/photos\//g, 'photos/') || '';
      
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });
      
      try {
        const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 86400 }); // 24 hours instead of 1 hour        
        return {
          album_ids: item.album_ids?.L?.map((id: any) => id.S || '') || [],
          photo_id: item.photo_id.S || '',
          url,
          s3_key: s3Key,
          uploaded_by: item.uploaded_by.S || '',
          upload_date: item.upload_date?.S || '',
          family_group: normalizeFamilyGroup(item.family_group?.S), // Include family_group
          metadata: {
            location: item.location?.M ? {
              country: (item.location.M.country?.S || '').trim(),
              state: (item.location.M.state?.S || '').trim(),
              city: (item.location.M.city?.S || '').trim(),
              neighborhood: (item.location.M.neighborhood?.S || '').trim()
            } : { country: '', state: '', city: '', neighborhood: '' },
            description: (item.description?.S || '').trim(),
            date_taken: item.date_taken?.S || '',
            people_tagged: item.people_tagged?.L 
              ? (await Promise.all(item.people_tagged.L.map(async (person: any) => {
                  const userId = person.M.id.S.trim();
                  // Only include tagged people who are in the user's family group
                  if (currentUserId && familyMemberIds.length > 0 && !familyMemberIds.includes(userId)) {
                    return null; // Filter out people not in the family group
                  }
                  const preferredName = await getPreferredName(userId);
                  return {
                    id: userId,
                    name: preferredName
                  };
                }))).filter((person): person is { id: string; name: string } => person !== null)
              : [],
          },
          lastModified: item.upload_date?.S,
        };
      } catch (error) {
        console.error('Error generating signed URL for key:', s3Key, error);
        return null;
      }
    }));

    const validPhotos = photos.filter(photo => photo !== null);
    
    // Filter by taggedUserId if provided (check if the user is in people_tagged array)
    let finalPhotos = validPhotos;
    if (taggedUserId) {
      finalPhotos = validPhotos.filter(photo => {
        const peopleTagged = photo.metadata?.people_tagged || [];
        return peopleTagged.some(
          (person: { id: string; name: string }) => person.id === taggedUserId
        );
      });
    }
    
    return NextResponse.json({ photos: finalPhotos });
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch photos',
      details: error instanceof Error ? error.message : 'Unknown error',
      env: {
        hasRegion: !!process.env.NEXT_PUBLIC_AWS_PROJECT_REGION,
        hasBucket: !!process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME
      }
    }, { status: 500 });
  }
}