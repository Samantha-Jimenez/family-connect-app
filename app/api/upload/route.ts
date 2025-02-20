import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

type UploadError = {
  message: string;
  code?: string;
};

export async function POST(req: Request) {
  try {
    console.log('Starting upload process...');
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const location = formData.get('location') as string;
    const description = formData.get('description') as string;
    const dateTaken = formData.get('dateTaken') as string;
    const peopleTagged = formData.get('peopleTagged') as string;
    
    if (!file) {
      console.log('No file provided');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('File received:', file.name, file.type);

    // Update environment variable checks
    if (!process.env.NEXT_PUBLIC_AWS_S3_ACCESS_KEY_ID || 
        !process.env.NEXT_PUBLIC_AWS_S3_SECRET_ACCESS_KEY || 
        !process.env.NEXT_PUBLIC_AWS_S3_REGION ||
        !process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME) {
      console.log('Missing AWS configuration');
      throw new Error('AWS configuration is incomplete');
    }

    // Convert File to Buffer for S3 upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('Configuring AWS S3...');

    // Configure AWS SDK for S3
    const s3Client = new S3Client({
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_S3_SECRET_ACCESS_KEY,
      },
      region: process.env.NEXT_PUBLIC_AWS_S3_REGION,
    });

    const key = `photos/${Date.now()}_${file.name}`;
    const command = new PutObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      Metadata: {
        location: location || '',
        description: description || '',
        datetaken: dateTaken || '',
        peopletagged: peopleTagged || '',
      }
    });

    console.log('Attempting S3 upload...');

    await s3Client.send(command);
    const url = `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_S3_REGION}.amazonaws.com/${key}`;

    console.log('Upload successful:', url);

    return NextResponse.json({
      message: 'File uploaded successfully!',
      url: url,
      metadata: {
        location: location || '',
        description: description || '',
        dateTaken: dateTaken || '',
        peopleTagged: peopleTagged || ''
      }
    });
    
  } catch (err: unknown) {
    const error = err as UploadError;
    console.error('Detailed upload error:', {
      message: error.message,
      code: error.code,
      fullError: error
    });
    return NextResponse.json(
      { error: 'Error uploading file', details: error.message },
      { status: 500 }
    );
  }
} 