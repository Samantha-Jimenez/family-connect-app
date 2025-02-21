import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';

export async function GET() {
  try {
    const envVars = {
      NEXT_PUBLIC_AWS_S3_ACCESS_KEY_ID: process.env.NEXT_PUBLIC_AWS_S3_ACCESS_KEY_ID ? '✓ Present' : '✗ Missing',
      NEXT_PUBLIC_AWS_S3_SECRET_ACCESS_KEY: process.env.NEXT_PUBLIC_AWS_S3_SECRET_ACCESS_KEY ? '✓ Present' : '✗ Missing',
      NEXT_PUBLIC_AWS_S3_REGION: process.env.NEXT_PUBLIC_AWS_S3_REGION || '✗ Missing',
      NEXT_PUBLIC_AWS_S3_BUCKET_NAME: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || '✗ Missing'
    };

    // Verify environment variables with correct names
    if (!process.env.NEXT_PUBLIC_AWS_S3_ACCESS_KEY_ID || 
        !process.env.NEXT_PUBLIC_AWS_S3_SECRET_ACCESS_KEY || 
        !process.env.NEXT_PUBLIC_AWS_S3_REGION ||
        !process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME) {
      
      throw new Error('AWS configuration is incomplete');
    }

    const s3Client = new S3Client({
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_S3_SECRET_ACCESS_KEY!,
      },
      region: process.env.NEXT_PUBLIC_AWS_S3_REGION,
    });

    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME!,
      Prefix: 'photos/',
      MaxKeys: 100,
    });

    const data = await s3Client.send(listCommand);
    
    // Get metadata for each photo
    const photos = await Promise.all(
      (data.Contents || [])
        .sort((a, b) => {
          return b.LastModified!.getTime() - a.LastModified!.getTime();
        })
        .map(async (object) => {
          const headCommand = new HeadObjectCommand({
            Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME!,
            Key: object.Key,
          });

          try {
            const headData = await s3Client.send(headCommand);
            // Ensure the object.Key exists and construct the full URL
            if (!object.Key) {
              console.error('Object key is undefined');
              return null;
            }
            
            const url = `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_S3_REGION}.amazonaws.com/${object.Key}`;
            
            // Sanitize the metadata values
            const sanitizeMetadata = (value: string | undefined): string => {
              if (!value) return '';
              // Remove any invalid characters and trim
              return value.toString().trim();
            };
            
            return {
              url,
              metadata: {
                location: sanitizeMetadata(headData.Metadata?.location),
                description: sanitizeMetadata(headData.Metadata?.description),
                dateTaken: sanitizeMetadata(headData.Metadata?.datetaken),
                peopleTagged: sanitizeMetadata(headData.Metadata?.peopletagged),
                uploadedBy: sanitizeMetadata(headData.Metadata?.uploadedby),
              },
              lastModified: object.LastModified,
            };
          } catch (error) {
            console.error('Error fetching metadata for object:', object.Key, error);
            return null;
          }
        })
    );

    // Filter out any null results
    const validPhotos = photos.filter(Boolean);
    
    return NextResponse.json({ photos: validPhotos });
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: 'Error fetching photos' },
      { status: 500 }
    );
  }
}