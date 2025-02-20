import AWS from 'aws-sdk';

export async function POST(req) {
  try {
    const formData = await req.formData();  // Parse incoming form data (multipart file upload)
    const file = formData.get('file');      // Retrieve file from the form data

    // Configure AWS SDK for S3
    const s3 = new AWS.S3({
      accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
      region: process.env.NEXT_PUBLIC_AWS_REGION,  // Set your AWS region (e.g., 'us-east-1')
    });

    const params = {
      Bucket: 'family-connect-app',  // The name of your S3 bucket
      Key: `photos/${Date.now()}_${file.name}`,  // Unique key for the file (timestamp + file name)
      Body: file.stream(),  // Use the file's stream for upload
      ContentType: file.type,  // Set the content type from the file's type
      ACL: 'public-read',  // Set file to be publicly accessible (adjust if needed)
    };

    const data = await s3.upload(params).promise();  // Upload file to S3

    // Respond with the URL of the uploaded file
    return new Response(JSON.stringify({ message: 'File uploaded successfully!', url: data.Location }), {
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error uploading file', details: err.message }), {
      status: 500,
    });
  }
}
