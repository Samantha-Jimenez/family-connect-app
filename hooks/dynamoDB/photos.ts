/**
 * Photos, album-photo links, favorites, photo comments, and deleteAlbumById.
 */

import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getCurrentUser } from 'aws-amplify/auth';
import { getUserFamilyGroup, normalizeFamilyGroup } from '@/utils/demoConfig';
import { dynamoDB, s3Client, TABLES } from './client';
import { getAlbumById } from './albums';
import { getUserNameById, getProfilePhotoById } from './family';
import { createNotification } from './notifications';
import type { PhotoData, TaggedPerson } from './types';

const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;

function buildPhotoItem(
  photoData: PhotoData,
  finalFamilyGroup: string
): Record<string, import('@aws-sdk/client-dynamodb').AttributeValue> {
  const item: Record<string, import('@aws-sdk/client-dynamodb').AttributeValue> = {
    photo_id: { S: photoData.photo_id },
    s3_key: { S: `photos/${photoData.s3_key.replace(/^photos\//g, '')}` },
    uploaded_by: { S: photoData.uploaded_by },
    upload_date: { S: photoData.upload_date },
    family_group: { S: finalFamilyGroup },
    album_ids: { L: (photoData.album_ids || []).map((id) => ({ S: id })) },
  };
  if (photoData.metadata?.description)
    item.description = { S: photoData.metadata.description };
  if (photoData.metadata?.location) {
    item.location = {
      M: {
        country: { S: photoData.metadata.location.country || '' },
        state: { S: photoData.metadata.location.state || '' },
        city: { S: photoData.metadata.location.city || '' },
        neighborhood: { S: photoData.metadata.location.neighborhood || '' },
      },
    };
  }
  if (photoData.metadata?.date_taken)
    item.date_taken = { S: photoData.metadata.date_taken };
  if (
    photoData.metadata?.people_tagged &&
    photoData.metadata.people_tagged.length > 0
  ) {
    item.people_tagged = {
      L: photoData.metadata.people_tagged.map((person) => ({
        M: { id: { S: person.id }, name: { S: person.name } },
      })),
    };
  }
  return item;
}

export const savePhotoToDB = async (photoData: PhotoData): Promise<void> => {
  try {
    const existingData = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photoData.photo_id } },
      })
    );
    const isNewPhoto = !existingData.Item;

    let taggerId = photoData.uploaded_by;
    let photoFamilyGroup: string | null = null;
    const user = await getCurrentUser();
    if (!user?.userId) throw new Error('User is not authenticated');
    taggerId = user.userId;
    photoFamilyGroup = getUserFamilyGroup(user.userId);
    if (photoFamilyGroup === null || photoFamilyGroup === undefined)
      throw new Error('Unable to determine family group for photo');

    const existingTaggedIds = new Set<string>();
    if (existingData.Item?.people_tagged?.L) {
      existingData.Item.people_tagged.L.forEach(
        (person: { M?: { id?: { S?: string } } }) => {
          const id = person.M?.id?.S;
          if (id) existingTaggedIds.add(id);
        }
      );
    }
    const newTags = photoData.metadata?.people_tagged || [];
    const newlyTaggedPeople = newTags.filter(
      (person) => person.id && !existingTaggedIds.has(person.id)
    );
    const finalPhotoFamilyGroup =
      existingData.Item?.family_group?.S || photoFamilyGroup;

    const item = buildPhotoItem(photoData, finalPhotoFamilyGroup);
    if (
      existingData.Item?.comments?.L &&
      existingData.Item.comments.L.length > 0
    ) {
      item.comments = existingData.Item.comments;
    }

    await dynamoDB.send(
      new PutItemCommand({ TableName: TABLES.PHOTOS, Item: item })
    );

    if (newlyTaggedPeople.length > 0) {
      try {
        const taggerName = await getUserNameById(taggerId);
        const taggerDisplayName = taggerName
          ? `${taggerName.firstName} ${taggerName.lastName}`
          : 'Someone';
        for (const taggedPerson of newlyTaggedPeople) {
          if (taggedPerson.id === taggerId) continue;
          await createNotification(
            taggedPerson.id,
            'photo_tag',
            'You were tagged in a photo',
            `${taggerDisplayName} tagged you in a photo`,
            photoData.photo_id,
            { tagger_id: taggerId, tagger_name: taggerDisplayName }
          );
        }
      } catch (notificationError) {
        console.error('❌ Error creating photo tag notifications:', notificationError);
      }
    }
  } catch (error) {
    console.error('❌ Error saving user to DynamoDB:', error);
    throw error;
  }
}

export const adminSavePhotoAsDemoMember = async (
  photoData: PhotoData,
  familyGroup: string = 'demo'
): Promise<void> => {
  try {
    const existingData = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photoData.photo_id } },
      })
    );
    const existingTaggedIds = new Set<string>();
    if (existingData.Item?.people_tagged?.L) {
      existingData.Item.people_tagged.L.forEach(
        (person: { M?: { id?: { S?: string } } }) => {
          const id = person.M?.id?.S;
          if (id) existingTaggedIds.add(id);
        }
      );
    }
    const newTags = photoData.metadata?.people_tagged || [];
    const newlyTaggedPeople = newTags.filter(
      (person) => person.id && !existingTaggedIds.has(person.id)
    );
    const finalPhotoFamilyGroup =
      existingData.Item?.family_group?.S || familyGroup;

    const item = buildPhotoItem(photoData, finalPhotoFamilyGroup);
    if (
      existingData.Item?.comments?.L &&
      existingData.Item.comments.L.length > 0
    ) {
      item.comments = existingData.Item.comments;
    }
    await dynamoDB.send(
      new PutItemCommand({ TableName: TABLES.PHOTOS, Item: item })
    );

    if (newlyTaggedPeople.length > 0) {
      try {
        const uploaderName = await getUserNameById(photoData.uploaded_by);
        const uploaderDisplayName = uploaderName
          ? `${uploaderName.firstName} ${uploaderName.lastName}`
          : 'Someone';
        for (const taggedPerson of newlyTaggedPeople) {
          if (taggedPerson.id === photoData.uploaded_by) continue;
          await createNotification(
            taggedPerson.id,
            'photo_tag',
            'You were tagged in a photo',
            `${uploaderDisplayName} tagged you in a photo`,
            photoData.photo_id,
            { tagger_id: photoData.uploaded_by, tagger_name: uploaderDisplayName }
          );
        }
      } catch (notificationError) {
        console.error('❌ Error creating photo tag notifications:', notificationError);
      }
    }
  } catch (error) {
    console.error('❌ Error saving admin photo to DynamoDB:', error);
    throw error;
  }
}

export const addPhotoToAlbum = async (
  photo_id: string,
  album_id: string
): Promise<void> => {
  try {
    const user = await getCurrentUser();
    if (!user?.userId) throw new Error('User is not authenticated');
    const albumData = await getAlbumById(album_id);
    if (!albumData || albumData.created_by !== user.userId) {
      throw new Error('Album not found or user doesn\'t have permission');
    }
    const photoData = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photo_id } },
      })
    );
    if (!photoData.Item) throw new Error('Photo not found');
    const currentAlbumIds =
      photoData.Item.album_ids?.L?.map((id: { S?: string }) => id.S) || [];
    if (currentAlbumIds.includes(album_id)) return;
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photo_id } },
        UpdateExpression:
          'SET album_ids = list_append(if_not_exists(album_ids, :emptyList), :albumId)',
        ExpressionAttributeValues: {
          ':albumId': { L: [{ S: album_id }] },
          ':emptyList': { L: [] },
        },
      })
    );
  } catch (error) {
    console.error('❌ Error adding photo to album:', error);
    throw error;
  }
}

export const adminAddPhotoToAlbum = async (
  photo_id: string,
  album_id: string
): Promise<void> => {
  try {
    const photoData = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photo_id } },
      })
    );
    if (!photoData.Item) throw new Error('Photo not found');
    const currentAlbumIds =
      photoData.Item.album_ids?.L?.map((id: { S?: string }) => id.S) || [];
    if (currentAlbumIds.includes(album_id)) return;
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photo_id } },
        UpdateExpression:
          'SET album_ids = list_append(if_not_exists(album_ids, :emptyList), :albumId)',
        ExpressionAttributeValues: {
          ':albumId': { L: [{ S: album_id }] },
          ':emptyList': { L: [] },
        },
      })
    );
  } catch (error) {
    console.error('❌ Error adding photo to album:', error);
    throw error;
  }
}

async function signPhotoUrl(s3Key: string): Promise<string> {
  if (!bucketName) throw new Error('Missing bucket name');
  const url = await getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: bucketName, Key: s3Key }),
    { expiresIn: 86400 }
  );
  return url;
}

export const getPhotoById = async (
  photoId: string
): Promise<PhotoData | null> => {
  try {
    const response = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photoId } },
      })
    );
    if (!response.Item) return null;
    const item = response.Item;
    const s3Key = item.s3_key?.S || '';
    if (!s3Key) return null;
    const url = await signPhotoUrl(s3Key);
    const peopleTagged: TaggedPerson[] = item.people_tagged?.L
      ? await Promise.all(
          item.people_tagged.L.map(
            async (tagged: { M?: { id?: { S?: string } } }) => {
              const userId = tagged.M?.id?.S || '';
              const userName = await getUserNameById(userId);
              return {
                id: userId,
                name: userName
                  ? `${userName.firstName} ${userName.lastName}`
                  : 'Unknown User',
              };
            }
          )
        )
      : [];
    return {
      photo_id: item.photo_id?.S || '',
      s3_key: s3Key,
      uploaded_by: item.uploaded_by?.S || '',
      upload_date: item.upload_date?.S || '',
      family_group: normalizeFamilyGroup(item.family_group?.S),
      album_ids: item.album_ids?.L?.map((id: { S?: string }) => id.S || '') || [],
      url,
      metadata: {
        location: {
          country: item.location?.M?.country?.S || '',
          state: item.location?.M?.state?.S || '',
          city: item.location?.M?.city?.S || '',
          neighborhood: item.location?.M?.neighborhood?.S || '',
        },
        description: item.description?.S || '',
        date_taken: item.date_taken?.S || '',
        people_tagged: peopleTagged,
      },
      lastModified: item.lastModified?.S || '',
    };
  } catch (error) {
    console.error('❌ Error fetching photo by ID:', error);
    return null;
  }
}

export const getPhotosByAlbum = async (
  albumId: string
): Promise<PhotoData[]> => {
  try {
    const response = await dynamoDB.send(
      new ScanCommand({
        TableName: TABLES.PHOTOS,
        FilterExpression: 'contains(album_ids, :albumId)',
        ExpressionAttributeValues: { ':albumId': { S: albumId } },
      })
    );
    if (!response.Items) return [];
    const photos = await Promise.all(
      response.Items.map(async (item) => {
        const s3Key = item.s3_key?.S || '';
        try {
          const url = await signPhotoUrl(s3Key);
          const peopleTagged: TaggedPerson[] = item.people_tagged?.L
            ? await Promise.all(
                item.people_tagged.L.map(
                  async (tagged: { M?: { id?: { S?: string } } }) => {
                    const userId = tagged.M?.id?.S || '';
                    const userName = await getUserNameById(userId);
                    return {
                      id: userId,
                      name: userName
                        ? `${userName.firstName} ${userName.lastName}`
                        : 'Unknown User',
                    };
                  }
                )
              )
            : [];
          return {
            photo_id: item.photo_id?.S || '',
            s3_key: s3Key,
            uploaded_by: item.uploaded_by?.S || '',
            upload_date: item.upload_date?.S || '',
            family_group: normalizeFamilyGroup(item.family_group?.S),
            album_ids: item.album_ids?.L?.map((id: { S?: string }) => id.S || '') || [],
            url,
            metadata: {
              location: {
                country: item.location?.M?.country?.S || '',
                state: item.location?.M?.state?.S || '',
                city: item.location?.M?.city?.S || '',
                neighborhood: item.location?.M?.neighborhood?.S || '',
              },
              description: item.description?.S || '',
              date_taken: item.date_taken?.S || '',
              people_tagged: peopleTagged,
            },
            lastModified: item.lastModified?.S || '',
          };
        } catch (err) {
          console.error('Error generating signed URL for key:', s3Key, err);
          return null;
        }
      })
    );
    return photos.filter((p) => p != null) as PhotoData[];
  } catch (error) {
    console.error('❌ Error fetching photos by album:', error);
    return [];
  }
}

export const deletePhotoById = async (photoId: string): Promise<void> => {
  try {
    await dynamoDB.send(
      new DeleteItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photoId } },
      })
    );
  } catch (error) {
    console.error('❌ Error deleting photo:', error);
    throw error;
  }
}

export const addPhotoToFavorites = async (
  userId: string,
  photoId: string
): Promise<void> => {
  try {
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photoId } },
        UpdateExpression: 'ADD favorited_by :userId',
        ExpressionAttributeValues: { ':userId': { SS: [userId] } },
      })
    );
  } catch (error) {
    console.error('❌ Error adding photo to favorites:', error);
    throw error;
  }
}

export const removePhotoFromFavorites = async (
  userId: string,
  photoId: string
): Promise<void> => {
  try {
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photoId } },
        UpdateExpression: 'DELETE favorited_by :userId',
        ExpressionAttributeValues: { ':userId': { SS: [userId] } },
      })
    );
  } catch (error) {
    console.error('❌ Error removing photo from favorites:', error);
    throw error;
  }
}

export const checkIfPhotoIsFavorited = async (
  userId: string,
  photoId: string
): Promise<boolean> => {
  try {
    const data = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photoId } },
      })
    );
    if (!data.Item?.favorited_by) return false;
    const favoritedBy = data.Item.favorited_by as { SS?: string[] };
    return favoritedBy.SS?.includes(userId) ?? false;
  } catch (error) {
    console.error('❌ Error checking if photo is favorited:', error);
    return false;
  }
}

export const getFavoritedPhotosByUser = async (
  userId: string
): Promise<PhotoData[]> => {
  try {
    const response = await dynamoDB.send(
      new ScanCommand({
        TableName: TABLES.PHOTOS,
        FilterExpression: 'contains(favorited_by, :userId)',
        ExpressionAttributeValues: { ':userId': { S: userId } },
      })
    );
    if (!response.Items) return [];
    const photos = await Promise.all(
      response.Items.map(async (item) => {
        const s3Key = item.s3_key?.S || '';
        try {
          const url = await signPhotoUrl(s3Key);
          const peopleTagged: TaggedPerson[] = item.people_tagged?.L
            ? await Promise.all(
                item.people_tagged.L.map(
                  async (tagged: { M?: { id?: { S?: string } } }) => {
                    const uid = tagged.M?.id?.S || '';
                    const userName = await getUserNameById(uid);
                    return {
                      id: uid,
                      name: userName
                        ? `${userName.firstName} ${userName.lastName}`
                        : 'Unknown User',
                    };
                  }
                )
              )
            : [];
          return {
            photo_id: item.photo_id?.S || '',
            s3_key: s3Key,
            uploaded_by: item.uploaded_by?.S || '',
            upload_date: item.upload_date?.S || '',
            family_group: normalizeFamilyGroup(item.family_group?.S),
            album_ids: item.album_ids?.L?.map((id: { S?: string }) => id.S || '') || [],
            url,
            metadata: {
              location: {
                country: item.location?.M?.country?.S || '',
                state: item.location?.M?.state?.S || '',
                city: item.location?.M?.city?.S || '',
                neighborhood: item.location?.M?.neighborhood?.S || '',
              },
              description: item.description?.S || '',
              date_taken: item.date_taken?.S || '',
              people_tagged: peopleTagged,
            },
            lastModified: item.lastModified?.S || '',
          };
        } catch (err) {
          console.error('Error generating signed URL for key:', s3Key, err);
          return null;
        }
      })
    );
    return photos.filter((p) => p != null) as PhotoData[];
  } catch (error) {
    console.error('❌ Error fetching favorited photos:', error);
    return [];
  }
}

export const addCommentToPhoto = async (
  photoId: string,
  userId: string,
  comment: string,
  author: string,
  profilePhoto: string
): Promise<void> => {
  try {
    const photoData = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photoId } },
      })
    );
    const uploadedBy = photoData.Item?.uploaded_by?.S;
    const taggedPeopleIds = new Set<string>();
    if (photoData.Item?.people_tagged?.L) {
      photoData.Item.people_tagged.L.forEach(
        (person: { M?: { id?: { S?: string } } }) => {
          const id = person.M?.id?.S;
          if (id) taggedPeopleIds.add(id);
        }
      );
    }
    const timestamp = new Date().toISOString();
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photoId } },
        UpdateExpression:
          'SET comments = list_append(if_not_exists(comments, :emptyList), :comment)',
        ExpressionAttributeValues: {
          ':comment': {
            L: [
              {
                M: {
                  userId: { S: userId },
                  text: { S: comment },
                  author: { S: author },
                  timestamp: { S: timestamp },
                  profilePhoto: { S: profilePhoto },
                },
              },
            ],
          },
          ':emptyList': { L: [] },
        },
      })
    );
    const commentPreview =
      comment.length > 50 ? comment.substring(0, 50) + '...' : comment;
    if (uploadedBy && uploadedBy !== userId) {
      try {
        await createNotification(
          uploadedBy,
          'photo_comment',
          'New comment on your photo',
          `${author} commented: "${commentPreview}"`,
          photoId,
          { commenter_id: userId, comment_preview: commentPreview }
        );
      } catch (e) {
        console.error('❌ Error creating photo comment notification:', e);
      }
    }
    for (const taggedUserId of taggedPeopleIds) {
      if (taggedUserId === userId || taggedUserId === uploadedBy) continue;
      try {
        await createNotification(
          taggedUserId,
          'photo_comment',
          "New comment on a photo you're tagged in",
          `${author} commented: "${commentPreview}"`,
          photoId,
          { commenter_id: userId, comment_preview: commentPreview }
        );
      } catch (e) {
        console.error('❌ Error creating photo comment notification:', e);
      }
    }
  } catch (error) {
    console.error('❌ Error adding comment to photo:', error);
    throw error;
  }
}

export const getCommentsForPhoto = async (
  photoId: string
): Promise<
  Array<{
    text: string;
    author: string;
    userId: string;
    timestamp: string;
    profilePhoto: string;
  }>
> => {
  try {
    const data = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photoId } },
      })
    );
    if (!data.Item?.comments?.L) return [];
    return Promise.all(
      data.Item.comments.L.map(
        async (c: { M?: { userId?: { S?: string }; text?: { S?: string }; timestamp?: { S?: string }; profilePhoto?: { S?: string } } }) => {
          const userId = c.M?.userId?.S || '';
          const userName = await getUserNameById(userId);
          const currentPhoto = await getProfilePhotoById(userId);
          return {
            userId,
            text: c.M?.text?.S || '',
            author: userName
              ? `${userName.firstName} ${userName.lastName}`
              : 'Unknown',
            timestamp: c.M?.timestamp?.S || '',
            profilePhoto: currentPhoto || '',
          };
        }
      )
    );
  } catch (error) {
    console.error('❌ Error fetching comments for photo:', error);
    return [];
  }
}

export const deleteCommentFromPhoto = async (
  photoId: string,
  userId: string,
  commentIndex: number
): Promise<void> => {
  try {
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photoId } },
        UpdateExpression: `REMOVE comments[${commentIndex}]`,
        ConditionExpression: `comments[${commentIndex}].userId = :userId`,
        ExpressionAttributeValues: { ':userId': { S: userId } },
      })
    );
  } catch (error) {
    console.error('❌ Error deleting comment from photo:', error);
    throw error;
  }
}

export const editCommentInPhoto = async (
  photoId: string,
  userId: string,
  commentIndex: number,
  newText: string
): Promise<void> => {
  try {
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photoId } },
        UpdateExpression: `SET comments[${commentIndex}].#text = :newText`,
        ConditionExpression: `comments[${commentIndex}].userId = :userId`,
        ExpressionAttributeNames: { '#text': 'text' },
        ExpressionAttributeValues: { ':newText': { S: newText }, ':userId': { S: userId } },
      })
    );
  } catch (error) {
    console.error('❌ Error editing comment in photo:', error);
    throw error;
  }
}

export const getAllPhotosByTagged = async (
  taggedUserIds: string[]
): Promise<PhotoData[]> => {
  try {
    const response = await dynamoDB.send(
      new ScanCommand({
        TableName: TABLES.PHOTOS,
        FilterExpression: 'contains(people_tagged, :taggedUserId)',
        ExpressionAttributeValues: {
          ':taggedUserId': { S: taggedUserIds.join(',') },
        },
      })
    );
    if (!response.Items) return [];
    return Promise.all(
      response.Items.map(async (item) => {
        const peopleTagged: TaggedPerson[] = item.people_tagged?.L
          ? await Promise.all(
              item.people_tagged.L.map(
                async (tagged: { M?: { id?: { S?: string } } }) => {
                  const uid = tagged.M?.id?.S || '';
                  const userName = await getUserNameById(uid);
                  return {
                    id: uid,
                    name: userName
                      ? `${userName.firstName} ${userName.lastName}`
                      : 'Unknown User',
                  };
                }
              )
            )
          : [];
        return {
          photo_id: item.photo_id?.S || '',
          s3_key: item.s3_key?.S || '',
          uploaded_by: item.uploaded_by?.S || '',
          upload_date: item.upload_date?.S || '',
          album_ids: item.album_ids?.L?.map((id: { S?: string }) => id.S || '') || [],
          url: item.url?.S || '',
          metadata: {
            location: {
              country: item.location?.M?.country?.S || '',
              state: item.location?.M?.state?.S || '',
              city: item.location?.M?.city?.S || '',
              neighborhood: item.location?.M?.neighborhood?.S || '',
            },
            description: item.description?.S || '',
            date_taken: item.date_taken?.S || '',
            people_tagged: peopleTagged,
          },
          lastModified: item.lastModified?.S || '',
        };
      })
    );
  } catch (error) {
    console.error('❌ Error fetching photos by tagged users:', error);
    return [];
  }
}

export const getUserPhotos = async (userId: string): Promise<PhotoData[]> => {
  try {
    const response = await dynamoDB.send(
      new ScanCommand({
        TableName: TABLES.PHOTOS,
        FilterExpression: 'uploaded_by = :userId',
        ExpressionAttributeValues: { ':userId': { S: userId } },
      })
    );
    if (!response.Items) return [];
    const photos = await Promise.all(
      response.Items.map(async (item) => {
        const s3Key = item.s3_key?.S || '';
        try {
          const url = await signPhotoUrl(s3Key);
          const peopleTagged: TaggedPerson[] = item.people_tagged?.L
            ? await Promise.all(
                item.people_tagged.L.map(
                  async (tagged: { M?: { id?: { S?: string } } }) => {
                    const uid = tagged.M?.id?.S || '';
                    const userName = await getUserNameById(uid);
                    return {
                      id: uid,
                      name: userName
                        ? `${userName.firstName} ${userName.lastName}`
                        : 'Unknown User',
                    };
                  }
                )
              )
            : [];
          return {
            photo_id: item.photo_id?.S || '',
            s3_key: s3Key,
            uploaded_by: item.uploaded_by?.S || '',
            upload_date: item.upload_date?.S || '',
            family_group: normalizeFamilyGroup(item.family_group?.S),
            album_ids: item.album_ids?.L?.map((id: { S?: string }) => id.S || '') || [],
            url,
            metadata: {
              location: {
                country: item.location?.M?.country?.S || '',
                state: item.location?.M?.state?.S || '',
                city: item.location?.M?.city?.S || '',
                neighborhood: item.location?.M?.neighborhood?.S || '',
              },
              description: item.description?.S || '',
              date_taken: item.date_taken?.S || '',
              people_tagged: peopleTagged,
            },
            lastModified: item.lastModified?.S || '',
          };
        } catch (err) {
          console.error('Error generating signed URL for key:', s3Key, err);
          return null;
        }
      })
    );
    return photos.filter((p) => p != null) as PhotoData[];
  } catch (error) {
    console.error('❌ Error fetching user photos:', error);
    return [];
  }
}

export const removePhotoFromAlbum = async (
  photo_id: string,
  album_id: string
): Promise<void> => {
  try {
    const photoData = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photo_id } },
      })
    );
    if (!photoData.Item) throw new Error('Photo not found');
    const currentAlbumIds =
      photoData.Item.album_ids?.L?.map((id: { S?: string }) => id.S) || [];
    const indexToRemove = currentAlbumIds.indexOf(album_id);
    if (indexToRemove === -1) return;
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photo_id } },
        UpdateExpression: `REMOVE album_ids[${indexToRemove}]`,
      })
    );
  } catch (error) {
    console.error(`❌ Error removing photo ${photo_id} from album ${album_id}:`, error);
    throw error;
  }
}

export const removeTagFromPhoto = async (
  photo_id: string,
  user_id: string
): Promise<void> => {
  try {
    const photoData = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photo_id } },
      })
    );
    if (!photoData.Item) throw new Error('Photo not found');
    const currentTaggedPeople = photoData.Item.people_tagged?.L || [];
    const indexToRemove = currentTaggedPeople.findIndex(
      (person: { M?: { id?: { S?: string } } }) => person.M?.id?.S === user_id
    );
    if (indexToRemove === -1) return;
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.PHOTOS,
        Key: { photo_id: { S: photo_id } },
        UpdateExpression: `REMOVE people_tagged[${indexToRemove}]`,
      })
    );
  } catch (error) {
    console.error(`❌ Error untagging user ${user_id} from photo ${photo_id}:`, error);
    throw error;
  }
}

export const deleteAlbumById = async (albumId: string): Promise<void> => {
  try {
    const photos = await getPhotosByAlbum(albumId);
    for (const photo of photos) {
      await removePhotoFromAlbum(photo.photo_id, albumId);
    }
    await dynamoDB.send(
      new DeleteItemCommand({
        TableName: TABLES.ALBUMS,
        Key: { album_id: { S: albumId } },
      })
    );
  } catch (error) {
    console.error('❌ Error deleting album:', error);
    throw error;
  }
}
