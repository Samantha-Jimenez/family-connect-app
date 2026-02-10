/**
 * Shared DynamoDB and S3 clients for all dynamoDB modules.
 * Single place for credentials and table names.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';

const region = process.env.NEXT_PUBLIC_AWS_PROJECT_REGION;

export const dynamoDB = new DynamoDBClient({
  region,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  },
});

export const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  },
});

export const TABLES = {
  FAMILY: 'Family',
  PHOTOS: 'Photos',
  ALBUMS: 'Albums',
  RELATIONSHIPS: 'Relationships',
  EVENTS: 'Events',
  EVENT_RSVP: 'EventRSVPs',
  HOBBY_COMMENTS: 'HobbyComments',
  NOTIFICATIONS: 'Notifications',
} as const;
