/**
 * Re-exports all DynamoDB/S3 APIs from the split modules.
 * Implementation lives in hooks/dynamoDB/*.ts (types, client, family, relationships, albums, photos, comments, events, notifications).
 */
export * from './dynamoDB/index';
