import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function GET() {
  try {
    // Add more detailed environment variable logging
    console.log('Checking environment variables...');
    const envVars = {
      AWS_S3_ACCESS_KEY_ID: process.env.AWS_S3_ACCESS_KEY_ID ? '✓ Present' : '✗ Missing',
      AWS_S3_SECRET_ACCESS_KEY: process.env.AWS_S3_SECRET_ACCESS_KEY ? '✓ Present' : '✗ Missing',
      AWS_S3_REGION: process.env.AWS_S3_REGION || '✗ Missing',
      AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || '✗ Missing'
    };
    console.log('Environment variables status:', envVars);

    // Verify environment variables with correct names
    if (!process.env.AWS_S3_ACCESS_KEY_ID || 
        !process.env.AWS_S3_SECRET_ACCESS_KEY || 
        !process.env.AWS_S3_REGION ||
        !process.env.AWS_S3_BUCKET_NAME) {
      
      throw new Error('AWS configuration is incomplete. Please check your .env.local file.');
    }

    const s3Client = new S3Client({
      credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
      },
      region: process.env.AWS_S3_REGION,
    });

    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Prefix: 'photos/',
    });

    const data = await s3Client.send(command);
    
    const photos = data.Contents?.map(item => ({
      url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${item.Key}`
    })) || [];

    return NextResponse.json({ photos });

  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}