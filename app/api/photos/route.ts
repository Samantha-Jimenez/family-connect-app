import { NextResponse } from 'next/server';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const taggedUserId = url.searchParams.get('taggedUserId');

  try {
    const params = {
      TableName: 'Photos',
      FilterExpression: taggedUserId ? "contains(people_tagged, :taggedUserId)" : undefined,
      ExpressionAttributeValues: taggedUserId ? { ":taggedUserId": { S: taggedUserId } } : undefined,
    };

    const command = new ScanCommand(params);
    const response = await dynamoDB.send(command);

    if (!response.Items) {
      return NextResponse.json({ photos: [] });
    }

    const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;
    
    const photos = await Promise.all(response.Items.map(async (item) => {
      const s3Key = item.s3_key.S?.replace(/^photos\/photos\//g, 'photos/') || '';
      
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });
      
      try {
        const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });        
        return {
          album_id: item.album_id?.S || '',
          photo_id: item.photo_id.S || '',
          url,
          s3_key: s3Key,
          uploaded_by: item.uploaded_by.S || '',
          upload_date: item.upload_date?.S || '',
          metadata: {
            location: item.location?.M ? {
              country: item.location.M.country?.S || '',
              state: item.location.M.state?.S || '',
              city: item.location.M.city?.S || '',
              neighborhood: item.location.M.neighborhood?.S || ''
            } : { country: '', state: '', city: '', neighborhood: '' },
            description: item.description?.S || '',
            date_taken: item.date_taken?.S || '',
            people_tagged: item.people_tagged?.L 
              ? item.people_tagged.L.map((person: any) => ({
                  id: person.M.id.S,
                  name: person.M.name.S
                }))
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
    
    return NextResponse.json({ photos: validPhotos });
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