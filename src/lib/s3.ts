import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION ?? "us-east-1";
const bucket = process.env.AWS_S3_BUCKET;

export function getS3Client(): S3Client {
  return new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  });
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300
): Promise<string> {
  if (!bucket) throw new Error("AWS_S3_BUCKET is not set");
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn });
}

export function getS3PublicUrl(key: string): string {
  if (!bucket) return "";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
