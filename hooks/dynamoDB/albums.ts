/**
 * Album CRUD and listing. deleteAlbumById lives in photos.ts (uses getPhotosByAlbum/removePhotoFromAlbum).
 */

import {
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { ReturnValue } from '@aws-sdk/client-dynamodb';
import { getCurrentUser } from 'aws-amplify/auth';
import { dynamoDB, TABLES } from './client';
import type { AlbumData } from './types';

export const createAlbum = async (name: string, description?: string): Promise<string> => {
  try {
    const user = await getCurrentUser();
    const userId = user.userId;

    if (!userId) {
      throw new Error('User is not authenticated.');
    }

    const album_id = `album_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await dynamoDB.send(
      new PutItemCommand({
        TableName: TABLES.ALBUMS,
        Item: {
          album_id: { S: album_id },
          name: { S: name },
          description: { S: description || '' },
          created_by: { S: userId },
          created_date: { S: new Date().toISOString() },
        },
      })
    );
    return album_id;
  } catch (error) {
    console.error('Error creating album:', error);
    throw error;
  }
};

export const adminCreateAlbumAsDemoMember = async (
  name: string,
  demoMemberId: string,
  description?: string
): Promise<string> => {
  try {
    const album_id = `album_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await dynamoDB.send(
      new PutItemCommand({
        TableName: TABLES.ALBUMS,
        Item: {
          album_id: { S: album_id },
          name: { S: name },
          description: { S: description || '' },
          created_by: { S: demoMemberId },
          created_date: { S: new Date().toISOString() },
        },
      })
    );
    return album_id;
  } catch (error) {
    console.error('❌ Error creating album as demo member:', error);
    throw error;
  }
};

export const getUserAlbums = async (userId: string): Promise<AlbumData[]> => {
  try {
    const response = await dynamoDB.send(
      new ScanCommand({
        TableName: TABLES.ALBUMS,
        FilterExpression: 'created_by = :userId',
        ExpressionAttributeValues: { ':userId': { S: userId } },
      })
    );

    if (!response.Items) {
      return [];
    }

    return response.Items.map((item) => ({
      album_id: item.album_id?.S || '',
      name: item.name?.S || '',
      description: item.description?.S || '',
      created_date: item.created_date?.S || '',
      created_by: item.created_by?.S || '',
      cover_photo_id: item.cover_photo_id?.S || '',
    }));
  } catch (error) {
    console.error('❌ Error fetching user albums:', error);
    return [];
  }
};

export const getAlbumById = async (
  albumId: string
): Promise<{ album_id: string; name: string; description: string; created_date: string; created_by?: string } | null> => {
  try {
    const data = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.ALBUMS,
        Key: { album_id: { S: albumId } },
      })
    );

    if (!data.Item) {
      throw new Error('Album not found');
    }

    return {
      album_id: data.Item.album_id?.S || '',
      name: data.Item.name?.S || '',
      description: data.Item.description?.S || '',
      created_date: data.Item.created_date?.S || '',
      created_by: data.Item.created_by?.S,
    };
  } catch (error) {
    console.error('❌ Error fetching album by ID:', error);
    return null;
  }
};

export async function updateAlbum(
  albumId: string,
  updates: { name?: string; description?: string; cover_photo_id?: string }
): Promise<void> {
  const updateFields: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, { S: string }> = {};

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

  await dynamoDB.send(
    new UpdateItemCommand({
      TableName: TABLES.ALBUMS,
      Key: { album_id: { S: albumId } },
      UpdateExpression: 'set ' + updateFields.join(', '),
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: ReturnValue.UPDATED_NEW,
    })
  );
}
