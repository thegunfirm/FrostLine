import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: process.env.HETZNER_S3_REGION,
  endpoint: process.env.HETZNER_S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.HETZNER_S3_ACCESS_KEY!,
    secretAccessKey: process.env.HETZNER_S3_SECRET_KEY!,
  },
});