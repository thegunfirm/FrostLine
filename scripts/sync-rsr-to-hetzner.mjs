import ftp from "basic-ftp";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime";

const {
  RSR_FTP_HOST, RSR_FTP_USER, RSR_FTP_PASS, RSR_FTP_PORT,
  HETZNER_S3_ENDPOINT, HETZNER_S3_REGION, HETZNER_S3_BUCKET,
  HETZNER_S3_ACCESS_KEY, HETZNER_S3_SECRET_KEY
} = process.env;

const s3 = new S3Client({
  region

cat > scripts/sync-rsr-to-hetzner.mjs <<'EOF'
import ftp from "basic-ftp";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime";

const {
  RSR_FTP_HOST, RSR_FTP_USER, RSR_FTP_PASS, RSR_FTP_PORT,
  HETZNER_S3_ENDPOINT, HETZNER_S3_REGION, HETZNER_S3_BUCKET,
  HETZNER_S3_ACCESS_KEY, HETZNER_S3_SECRET_KEY
} = process.env;

const s3 = new S3Client({
  region: HETZNER_S3_REGION,
  endpoint: HETZNER_S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: HETZNER_S3_ACCESS_KEY,
    secretAccessKey: HETZNER_S3_SECRET_KEY,
  },
});

async function objectExists(Key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: HETZNER_S3_BUCKET, Key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadBuffer(buf, Key) {
  await s3.send(
    new PutObjectCommand({
      Bucket: HETZNER_S3_BUCKET,
      Key,
      Body: buf,
      ContentType: mime.getType(Key) || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
      ACL: "public-read",
    })
  );
}

async function syncDir(client, remoteDir, prefix) {
  await client.cd(remoteDir);
  const list = await client.list();
  const files = list.filter((e) => e.isFile);

  for (const f of files) {
    const filename = f.name;
    const key = `${prefix}/${filename}`;
    if (await objectExists(key)) continue;

    const chunks = [];
    await client.downloadTo((chunk) => chunks.push(chunk), filename);
    const buf = Buffer.concat(chunks);
    await uploadBuffer(buf, key);
    console.log("Uploaded:", key);
  }

  await client.cdup();
}

async function main() {
  const client = new ftp.Client(15000);
  client.ftp.verbose = false;

  const port = Number(RSR_FTP_PORT || 21);
  console.log(`Connecting FTP ${RSR_FTP_HOST}:${port}`);

  try {
    await client.access({
      host: RSR_FTP_HOST,
      port,
      user: RSR_FTP_USER,
      password: RSR_FTP_PASS,
      secure: false,
      passive: true,
    });

    await syncDir(client, "/ftp_images", "rsr/standard");
    // await syncDir(client, "/ftp_highres_images", "rsr/highres");
  } finally {
    client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
