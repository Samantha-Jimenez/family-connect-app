/**
 * Hobby comments (HobbyComments table) and member/memorial comments (Family table).
 */

import { GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { dynamoDB, TABLES } from './client';
import { getFamilyMembersWithHobby } from './family';
import { getProfilePhotoById, getUserNameById } from './family';
import { createNotification } from './notifications';

export const addCommentToHobby = async (
  hobby: string,
  userId: string,
  comment: string,
  author: string,
  profilePhoto: string,
  photoUrl?: string
): Promise<void> => {
  try {
    const timestamp = new Date().toISOString();
    const commentItem: Record<string, { S: string }> = {
      userId: { S: userId },
      text: { S: comment },
      author: { S: author },
      timestamp: { S: timestamp },
      profilePhoto: { S: profilePhoto },
    };
    if (photoUrl) commentItem.photoUrl = { S: photoUrl };

    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.HOBBY_COMMENTS,
        Key: { hobby: { S: hobby } },
        UpdateExpression:
          'SET comments = list_append(if_not_exists(comments, :emptyList), :comment)',
        ExpressionAttributeValues: {
          ':comment': { L: [{ M: commentItem }] },
          ':emptyList': { L: [] },
        },
      })
    );

    try {
      const membersWithHobby = await getFamilyMembersWithHobby(hobby);
      const commentPreview =
        comment.length > 50 ? comment.substring(0, 50) + '...' : comment;
      for (const member of membersWithHobby) {
        if (member.id === userId) continue;
        await createNotification(
          member.id,
          'hobby_comment',
          `New comment in ${hobby}`,
          `${author} commented: "${commentPreview}"`,
          hobby,
          { commenter_id: userId, comment_preview: commentPreview }
        );
      }
    } catch (notificationError) {
      console.error('❌ Error creating hobby comment notifications:', notificationError);
    }
  } catch (error) {
    console.error('❌ Error adding comment to hobby:', error);
    throw error;
  }
};

export const getCommentsForHobby = async (
  hobby: string
): Promise<
  Array<{
    userId: string;
    text: string;
    author: string;
    timestamp: string;
    commenterPhoto: string;
    photoUrl?: string;
  }>
> => {
  try {
    const data = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.HOBBY_COMMENTS,
        Key: { hobby: { S: hobby } },
      })
    );

    if (!data.Item?.comments?.L) return [];

    return Promise.all(
      data.Item.comments.L.map(
        async (comment: { M?: { userId?: { S?: string }; text?: { S?: string }; author?: { S?: string }; timestamp?: { S?: string }; photoUrl?: { S?: string } } }) => {
          const userId = comment.M?.userId?.S || '';
          const userName = await getUserNameById(userId);
          const currentProfilePhoto = await getProfilePhotoById(userId);
          return {
            userId,
            text: comment.M?.text?.S || '',
            author: userName
              ? `${userName.firstName} ${userName.lastName}`
              : comment.M?.author?.S || 'Unknown',
            timestamp: comment.M?.timestamp?.S || '',
            commenterPhoto: currentProfilePhoto || '',
            photoUrl: comment.M?.photoUrl?.S,
          };
        }
      )
    );
  } catch (error) {
    console.error('❌ Error fetching comments for hobby:', error);
    return [];
  }
};

export const deleteCommentFromHobby = async (
  hobby: string,
  userId: string,
  commentIndex: number
): Promise<void> => {
  try {
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.HOBBY_COMMENTS,
        Key: { hobby: { S: hobby } },
        UpdateExpression: `REMOVE comments[${commentIndex}]`,
        ConditionExpression: `comments[${commentIndex}].userId = :userId`,
        ExpressionAttributeValues: { ':userId': { S: userId } },
      })
    );
  } catch (error) {
    console.error('❌ Error deleting comment from hobby:', error);
    throw error;
  }
};

export const editCommentInHobby = async (
  hobby: string,
  userId: string,
  commentIndex: number,
  newText: string
): Promise<void> => {
  try {
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.HOBBY_COMMENTS,
        Key: { hobby: { S: hobby } },
        UpdateExpression: `SET comments[${commentIndex}].#text = :newText`,
        ConditionExpression: `comments[${commentIndex}].userId = :userId`,
        ExpressionAttributeNames: { '#text': 'text' },
        ExpressionAttributeValues: { ':newText': { S: newText }, ':userId': { S: userId } },
      })
    );
  } catch (error) {
    console.error('❌ Error editing comment in hobby:', error);
    throw error;
  }
};

export const addCommentToMember = async (
  memberId: string,
  userId: string,
  comment: string,
  author: string,
  profilePhoto: string
): Promise<void> => {
  try {
    const timestamp = new Date().toISOString();
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.FAMILY,
        Key: { family_member_id: { S: memberId } },
        UpdateExpression:
          'SET memorial_comments = list_append(if_not_exists(memorial_comments, :emptyList), :comment)',
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
  } catch (error) {
    console.error('❌ Error adding memorial comment:', error);
    throw error;
  }
};

export const getCommentsForMember = async (
  memberId: string
): Promise<
  Array<{ text: string; author: string; userId: string; timestamp: string; profilePhoto: string }>
> => {
  try {
    const data = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.FAMILY,
        Key: { family_member_id: { S: memberId } },
      })
    );

    if (!data.Item?.memorial_comments?.L) return [];

    return Promise.all(
      data.Item.memorial_comments.L.map(
        async (comment: { M?: { userId?: { S?: string }; text?: { S?: string }; timestamp?: { S?: string } } }) => {
          const userId = comment.M?.userId?.S || '';
          const userName = await getUserNameById(userId);
          const currentProfilePhoto = await getProfilePhotoById(userId);
          return {
            userId,
            text: comment.M?.text?.S || '',
            author: userName ? `${userName.firstName} ${userName.lastName}` : 'Unknown',
            timestamp: comment.M?.timestamp?.S || '',
            profilePhoto: currentProfilePhoto || '',
          };
        }
      )
    );
  } catch (error) {
    console.error('❌ Error fetching memorial comments:', error);
    return [];
  }
};

export const deleteCommentFromMember = async (
  memberId: string,
  userId: string,
  commentIndex: number
): Promise<void> => {
  try {
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.FAMILY,
        Key: { family_member_id: { S: memberId } },
        UpdateExpression: `REMOVE memorial_comments[${commentIndex}]`,
        ConditionExpression: `memorial_comments[${commentIndex}].userId = :userId`,
        ExpressionAttributeValues: { ':userId': { S: userId } },
      })
    );
  } catch (error) {
    console.error('❌ Error deleting memorial comment:', error);
    throw error;
  }
};

export const editCommentInMember = async (
  memberId: string,
  userId: string,
  commentIndex: number,
  newText: string
): Promise<void> => {
  try {
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.FAMILY,
        Key: { family_member_id: { S: memberId } },
        UpdateExpression: `SET memorial_comments[${commentIndex}].#text = :newText`,
        ConditionExpression: `memorial_comments[${commentIndex}].userId = :userId`,
        ExpressionAttributeNames: { '#text': 'text' },
        ExpressionAttributeValues: { ':newText': { S: newText }, ':userId': { S: userId } },
      })
    );
  } catch (error) {
    console.error('❌ Error editing memorial comment:', error);
    throw error;
  }
};
