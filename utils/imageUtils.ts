export const getFullImageUrl = (key: string) => {
  return `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_PROJECT_REGION}.amazonaws.com/${key}`;
}; 