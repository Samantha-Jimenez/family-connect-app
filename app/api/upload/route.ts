import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { verifyAuth, createUnauthorizedResponse } from '@/utils/apiAuth';

const s3 = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_PROJECT_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  // Verify authentication
  let authenticatedUser;
  try {
    authenticatedUser = await verifyAuth(request);
  } catch (error) {
    console.error('Authentication failed:', error);
    return createUnauthorizedResponse(
      error instanceof Error ? error.message : 'Authentication required'
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Log upload for audit purposes (optional)
    console.log(`File upload initiated by user: ${authenticatedUser.userId} (${authenticatedUser.username})`);

    const buffer = await file.arrayBuffer();
    const fileName = file.name.replace(/^photos\//g, '');
    const s3Key = `photos/${Date.now()}_${fileName}`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME,
      Key: s3Key,
      Body: Buffer.from(buffer),
      ContentType: file.type,
    }));

    return NextResponse.json({ key: s3Key });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
} 