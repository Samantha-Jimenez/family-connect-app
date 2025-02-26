import { NextResponse } from 'next/server';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

// Debug log all environment variables
console.log('Environment Variables:', {
  region: process.env.NEXT_PUBLIC_AWS_PROJECT_REGION,
  bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME,
  hasAccessKey: !!process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY
});

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

export async function GET() {
  try {
    const command = new ScanCommand({
      TableName: 'Photos',
    });

    const response = await dynamoDB.send(command);
    if (!response.Items) {
      return NextResponse.json({ photos: [] });
    }

    const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;
    
    // Debug the items we're getting from DynamoDB
    console.log('DynamoDB Items:', JSON.stringify(response.Items, null, 2));
    
    // Generate signed URLs for each photo
    const photos = await Promise.all(response.Items.map(async (item) => {
      // Get the raw s3_key and ensure it has the correct format
      const s3Key = item.s3_key.S?.replace(/^photos\/photos\//g, 'photos/') || '';
      
      // Log the exact key we're using
      console.log('Using S3 key:', s3Key);
      
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });
      
      try {
        const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });
        console.log('Generated signed URL for key:', s3Key);
        
        return {
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
            } : {},
            description: item.description?.S || '',
            dateTaken: item.date_taken?.S || '',
            taggedPeople: item.people_tagged?.L 
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

    // Filter out any null values from failed URL generations
    const validPhotos = photos.filter(photo => photo !== null);
    
    console.log('Number of valid photos:', validPhotos.length);
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