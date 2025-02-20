import { NextResponse } from 'next/server';
import AWS from 'aws-sdk';

type UploadError = {
  message: string;
  code?: string;
};

export async function POST(req: Request) {
  try {
    console.log('Starting upload process...');
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.log('No file provided');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('File received:', file.name, file.type);

    // Verify environment variables
    if (!process.env.AWS_S3_ACCESS_KEY_ID || 
        !process.env.AWS_S3_SECRET_ACCESS_KEY || 
        !process.env.AWS_REGION || 
        !process.env.AWS_S3_BUCKET_NAME) {
      console.error('Missing AWS configuration');
      throw new Error('AWS configuration is incomplete');
    }

    // Convert File to Buffer for S3 upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('Configuring AWS S3...');

    // Configure AWS SDK for S3
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });

    const params: AWS.S3.PutObjectRequest = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `photos/${Date.now()}_${file.name}`,
      Body: buffer,
      ContentType: file.type,
    };

    console.log('Attempting S3 upload...');

    const data = await s3.upload(params).promise();

    console.log('Upload successful:', data.Location);

    return NextResponse.json({
      message: 'File uploaded successfully!',
      url: data.Location
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