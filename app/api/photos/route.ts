import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';

export async function GET() {
  try {
    // Add more detailed environment variable logging
    console.log('Checking environment variables...');
    const envVars = {
      NEXT_PUBLIC_AWS_S3_ACCESS_KEY_ID: process.env.NEXT_PUBLIC_AWS_S3_ACCESS_KEY_ID ? '✓ Present' : '✗ Missing',
      NEXT_PUBLIC_AWS_S3_SECRET_ACCESS_KEY: process.env.NEXT_PUBLIC_AWS_S3_SECRET_ACCESS_KEY ? '✓ Present' : '✗ Missing',
      NEXT_PUBLIC_AWS_S3_REGION: process.env.NEXT_PUBLIC_AWS_S3_REGION || '✗ Missing',
      NEXT_PUBLIC_AWS_S3_BUCKET_NAME: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || '✗ Missing'
    };
    console.log('Environment variables status:', envVars);

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
    });

    const data = await s3Client.send(listCommand);
    
    // Get metadata for each photo
    const photos = await Promise.all(
      (data.Contents || []).map(async (object) => {
        const headCommand = new HeadObjectCommand({
          Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME!,
          Key: object.Key,
        });

        try {
          const headData = await s3Client.send(headCommand);
          console.log('S3 metadata for object:', object.Key, headData.Metadata); // Temporary debug log
          
          const url = `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_S3_REGION}.amazonaws.com/${object.Key}`;
          
          // Make sure metadata keys match exactly
          return {
            url,
            metadata: {
              location: headData.Metadata?.location || '',
              description: headData.Metadata?.description || '',
              dateTaken: headData.Metadata?.datetaken || '', // Note: S3 metadata keys are lowercase
              peopleTagged: headData.Metadata?.peopletagged || '', // Note: S3 metadata keys are lowercase
            },
            lastModified: object.LastModified,
          };
        } catch (error) {
          console.error('Error fetching metadata for object:', object.Key, error);
          return null;
        }
      })
    );

    // Filter out any null results and reverse to show newest first
    const validPhotos = photos.filter(Boolean).reverse();
    console.log('Sending photos with metadata:', validPhotos); // Temporary debug log

    return NextResponse.json({ photos: validPhotos });
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: 'Error fetching photos' },
      { status: 500 }
    );
  }
}