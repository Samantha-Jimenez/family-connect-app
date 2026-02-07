import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { DynamoDBClient, ScanCommand, GetItemCommand, BatchGetItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getUserFamilyGroup, normalizeFamilyGroup } from '@/utils/demoConfig';
import { verifyAuth, createUnauthorizedResponse } from '@/utils/apiAuth';

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

const BATCH_GET_MAX = 100; // DynamoDB limit per BatchGetItem request

/** Build preferred display name from a Family item (raw DynamoDB attribute map). */
function preferredNameFromItem(item: Record<string, { S?: string; BOOL?: boolean }>): string {
  const first_name = item.first_name?.S || '';
  const last_name = item.last_name?.S || '';
  const middle_name = item.middle_name?.S || '';
  const nick_name = item.nick_name?.S || '';
  const use_middle_name = item.use_middle_name?.BOOL ?? false;
  const use_nick_name = item.use_nick_name?.BOOL ?? false;

  let preferredFirstName = first_name;
  if (use_nick_name && nick_name) {
    preferredFirstName = nick_name;
  } else if (use_middle_name && middle_name) {
    preferredFirstName = middle_name;
  }
  return `${preferredFirstName} ${last_name}`.trim() || 'Unknown User';
}

/** Batch fetch preferred names for many user IDs (avoids N+1 GetItem calls). */
async function getPreferredNamesBatch(userIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  const result = new Map<string, string>();

  for (let i = 0; i < uniqueIds.length; i += BATCH_GET_MAX) {
    const chunk = uniqueIds.slice(i, i + BATCH_GET_MAX);
    const RequestItems = {
      Family: {
        Keys: chunk.map(id => ({ family_member_id: { S: id } })),
      },
    };

    try {
      const response = await dynamoDB.send(new BatchGetItemCommand({ RequestItems }));
      const items = response.Responses?.Family ?? [];
      for (const item of items) {
        const id = item.family_member_id?.S;
        if (id) result.set(id, preferredNameFromItem(item as Record<string, { S?: string; BOOL?: boolean }>));
      }
      // Handle unprocessed keys (retry once if needed)
      const unprocessed = response.UnprocessedKeys?.Family?.Keys;
      if (unprocessed?.length) {
        const retry = await dynamoDB.send(new BatchGetItemCommand({
          RequestItems: { Family: { Keys: unprocessed } },
        }));
        const retryItems = retry.Responses?.Family ?? [];
        for (const item of retryItems) {
          const id = item.family_member_id?.S;
          if (id) result.set(id, preferredNameFromItem(item as Record<string, { S?: string; BOOL?: boolean }>));
        }
      }
    } catch (error) {
      console.error('Error in getPreferredNamesBatch:', error);
    }
  }

  return result;
}

// Helper function to get family member IDs and Cognito user IDs for a user's family group
async function getFamilyMemberInfo(userId: string | null): Promise<{
  familyMemberIds: string[]; // family_member_id values (UUIDs)
  cognitoUserIds: string[]; // Cognito user IDs (for uploaded_by matching)
}> {
  if (!userId) {
    return { familyMemberIds: [], cognitoUserIds: [] };
  }
  
  try {
    const familyGroup = getUserFamilyGroup(userId);
    
    // TODO: Replace with QueryCommand on a GSI (e.g. family_group-index) when available.
    // Scan reads the entire table and is expensive as data grows.
    const params = {
      TableName: 'Family',
    };
    const command = new ScanCommand(params);
    const response = await dynamoDB.send(command);
    
    if (!response.Items) {
      return { familyMemberIds: [], cognitoUserIds: [] };
    }
    
    // Filter by family group and return both types of IDs
    const filteredMembers = response.Items
      .map(item => ({
        family_member_id: item.family_member_id?.S || '',
        // Check if family_member_id matches Cognito ID pattern (UUID) or if it IS the Cognito ID
        // Also check username/email fields which might contain Cognito info
        cognitoId: item.family_member_id?.S || '', // For now, assume family_member_id might be Cognito ID
        username: item.username?.S || '',
        email: item.email?.S || '',
        family_group: normalizeFamilyGroup(item.family_group?.S),
        name: `${item.first_name?.S || ''} ${item.last_name?.S || ''}`.trim(),
      }))
      .filter(member => {
        const memberGroup = normalizeFamilyGroup(member.family_group);
        return memberGroup === familyGroup;
      });
    
    const familyMemberIds = filteredMembers.map(member => member.family_member_id);
    
    // IMPORTANT: In this system, family_member_id IS the Cognito user ID
    // So familyMemberIds contains Cognito user IDs, and uploaded_by also stores Cognito user IDs
    // We need both lists for different purposes:
    // - familyMemberIds: for filtering people_tagged (which uses family_member_id)
    // - cognitoUserIds: for filtering uploaded_by (which uses Cognito ID, same as family_member_id)
    const cognitoUserIds = [userId, ...familyMemberIds]; // Include authenticated user + all family members
    
    // Also ensure the user's own family_member_id is in the list (in case they're not in Family table yet)
    if (!familyMemberIds.includes(userId)) {
      familyMemberIds.push(userId);
    }
    
    return { familyMemberIds, cognitoUserIds };
  } catch (error) {
    console.error('❌ Error fetching family member info:', error);
    return { familyMemberIds: [], cognitoUserIds: [userId] }; // At least include the current user
  }
}

export async function GET(request: NextRequest) {
  // Verify authentication
  let authenticatedUser;
  try {
    authenticatedUser = await verifyAuth(request);
  } catch (error) {
    console.error('Authentication failed:', error);
    return createUnauthorizedResponse(
      error instanceof Error ? error.message : 'Authentication required'
    );
  }

  const url = new URL(request.url);
  const taggedUserId = url.searchParams.get('taggedUserId');
  // Use authenticated user ID instead of query parameter for security
  const currentUserId = authenticatedUser.userId;

  try {
    // Get family member info for the current user's family group
    const { familyMemberIds, cognitoUserIds } = currentUserId 
      ? await getFamilyMemberInfo(currentUserId) 
      : { familyMemberIds: [], cognitoUserIds: [] };
    
    // If we have a userId but no family members found, still allow the user to see their own photos
    // Don't return empty - let the filtering logic handle it
    
    const params: any = {
      TableName: 'Photos',
    };
    
    // Note: We don't filter by taggedUserId in DynamoDB because people_tagged is a List of Maps,
    // and DynamoDB's contains() function doesn't work correctly with nested structures.
    // Instead, we filter in JavaScript after processing the photos.
    // TODO: Replace with QueryCommand on a GSI (e.g. family_group-index or uploaded_by-index) when available.
    const command = new ScanCommand(params);
    const response = await dynamoDB.send(command);

    if (!response.Items) {
      return NextResponse.json({ photos: [] });
    }
    
    // Filter by family group - only show photos from the user's family group
    // Primary check: family_group field on photo must match user's family group
    // Secondary check: if no family_group set, check if uploaded_by matches Cognito user IDs (backward compatibility)
    // Note: uploaded_by stores Cognito user IDs, not family_member_ids
    const userFamilyGroup = currentUserId ? getUserFamilyGroup(currentUserId) : null;
    const normalizedUserFamilyGroup = normalizeFamilyGroup(userFamilyGroup);
    
    const filteredItems = currentUserId
      ? response.Items.filter(item => {
          const uploadedBy = item.uploaded_by?.S || '';
          const photoFamilyGroup = normalizeFamilyGroup(item.family_group?.S); // Normalize: empty/null/undefined -> ''
          
          // ALWAYS include authenticated user's own photos (uploaded_by matches their Cognito ID)
          // This ensures users always see their uploads regardless of family_group status
          if (uploadedBy === currentUserId) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`Photo ${item.photo_id?.S} included: uploaded_by (${uploadedBy}) matches currentUserId`);
            }
            return true;
          }
          
          // Check if user (or the requested taggedUserId) is tagged in this photo
          // This ensures tagged photos are included even if uploaded_by doesn't match
          // Check both: the specific taggedUserId (if provided) OR the current user's family_member_id
          if (item.people_tagged?.L) {
            const isUserTagged = item.people_tagged.L.some((person: any) => {
              const taggedId = person.M?.id?.S?.trim();
              if (!taggedId) return false;
              
              // If taggedUserId is provided, check if it matches
              if (taggedUserId && taggedId === taggedUserId) {
                // Verify the tagged person is in the family
                return familyMemberIds.includes(taggedId) || taggedId === currentUserId;
              }
              
              // Also check if current user is tagged (for general photo view)
              // Find current user's family_member_id by checking if their Cognito ID matches a family_member_id
              // Since family_member_id = Cognito ID, check if taggedId matches currentUserId
              if (!taggedUserId && taggedId === currentUserId) {
                return true; // User is tagged in this photo
              }
              
              // Check if tagged person is in the family
              return familyMemberIds.includes(taggedId);
            });
            
            if (isUserTagged) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`Photo ${item.photo_id?.S} included: user is tagged in photo`);
              }
              return true;
            }
          }
          
          // Primary check: if photo has family_group, it must match user's family group
          // For real users: both will be '' (empty string)
          // For demo users: both will be 'demo'
          const familyGroupMatches = photoFamilyGroup === normalizedUserFamilyGroup;
          
          if (familyGroupMatches) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`Photo ${item.photo_id?.S} included: family_group matches (${photoFamilyGroup} === ${normalizedUserFamilyGroup})`);
            }
            return true;
          }
          
          // Secondary check: if family_group doesn't match or is missing, check if uploaded_by matches any family member
          // This handles backward compatibility for photos uploaded before family_group was implemented
          // Since family_member_id = Cognito ID in this system, check cognitoUserIds (which includes all family members)
          const matches = cognitoUserIds.includes(uploadedBy);
          
          if (process.env.NODE_ENV === 'development') {
            if (matches) {
              console.log(`Photo ${item.photo_id?.S} included: uploaded_by (${uploadedBy}) matches family member (backward compatibility)`);
            } else {
              console.log(`Photo ${item.photo_id?.S} filtered out: family_group (${photoFamilyGroup}) !== userGroup (${normalizedUserFamilyGroup}) and uploaded_by (${uploadedBy}) not in family`);
            }
          }
          return matches;
        })
      : response.Items; // If no userId, return all (backward compatibility, should be avoided)
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📸 Photo Filtering Summary:`);
      console.log(`  - Total photos in DB: ${response.Items.length}`);
      console.log(`  - Filtered photos: ${filteredItems.length}`);
      console.log(`  - User ID: ${currentUserId}`);
      console.log(`  - User Family Group: "${normalizedUserFamilyGroup}" (normalized)`);
      console.log(`  - Cognito User IDs in family: ${cognitoUserIds.length}`);
      console.log(`  - Family Member IDs: ${familyMemberIds.length}`);
      console.log(`  - Sample photo family_groups:`, response.Items.slice(0, 5).map(item => ({
        photo_id: item.photo_id?.S?.substring(0, 20),
        uploaded_by: item.uploaded_by?.S?.substring(0, 20),
        family_group: item.family_group?.S || '(missing)',
        normalized: normalizeFamilyGroup(item.family_group?.S)
      })));
    }

    const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;

    // Collect all unique tagged person IDs and batch-fetch preferred names (avoids N+1 GetItem calls)
    const taggedPersonIds = new Set<string>();
    for (const item of filteredItems) {
      for (const person of item.people_tagged?.L ?? []) {
        const id = person.M?.id?.S?.trim();
        if (!id) continue;
        if (currentUserId && familyMemberIds.length > 0 && !familyMemberIds.includes(id)) continue;
        taggedPersonIds.add(id);
      }
    }
    const preferredNamesMap = await getPreferredNamesBatch([...taggedPersonIds]);

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
              ? item.people_tagged.L.map((person: any) => {
                  const taggedPersonId = person.M?.id?.S?.trim();
                  if (!taggedPersonId) return null;
                  if (currentUserId && familyMemberIds.length > 0 && !familyMemberIds.includes(taggedPersonId)) return null;
                  return { id: taggedPersonId, name: preferredNamesMap.get(taggedPersonId) ?? 'Unknown User' };
                }).filter((p): p is { id: string; name: string } => p !== null)
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