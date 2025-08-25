import ftp from "basic-ftp";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime";
import { Writable } from "stream";

const {
  RSR_FTP_HOST, RSR_FTP_USER, RSR_FTP_PASS,
  HETZNER_S3_ENDPOINT, HETZNER_S3_REGION, HETZNER_S3_BUCKET,
  HETZNER_S3_ACCESS_KEY, HETZNER_S3_SECRET_KEY
} = process.env;

const s3 = new S3Client({
  region: HETZNER_S3_REGION,
  endpoint: HETZNER_S3_ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: HETZNER_S3_ACCESS_KEY, secretAccessKey: HETZNER_S3_SECRET_KEY }
});

async function objectExists(Key) {
  try { await s3.send(new HeadObjectCommand({ Bucket: HETZNER_S3_BUCKET, Key })); return true; }
  catch { return false; }
}

async function uploadBuffer(buf, Key) {
  await s3.send(new PutObjectCommand({
    Bucket: HETZNER_S3_BUCKET,
    Key,
    Body: buf,
    ContentType: mime.getType(Key) || "application/octet-stream",
    CacheControl: "public, max-age=31536000, immutable",
    ACL: "public-read"
  }));
}

async function syncDir(client, remoteDir, prefix) {
  await client.cd(remoteDir);
  const list = await client.list();
  const files = list.filter(e => e.isFile);

  // Sequential processing to avoid FTP client issues
  for (const f of files) {
    const filename = f.name; // AAC17-22G3_1.jpg
    const key = `${prefix}/${filename}`;
    if (await objectExists(key)) {
      console.log("Skipped (exists):", key);
      continue;
    }

    try {
      // Download file to memory using proper stream
      const chunks = [];
      const writeStream = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        }
      });
      
      await client.downloadTo(writeStream, filename);
      const buf = Buffer.concat(chunks);
      await uploadBuffer(buf, key);
      console.log("Uploaded:", key, `(${Math.round(buf.length/1024)}KB)`);
    } catch (error) {
      console.error("Failed to sync:", filename, error.message);
    }
  }
  await client.cdup();
}

async function main() {
  const client = new ftp.Client(10000);
  client.ftp.verbose = false;
  try {
    await client.access({ 
      host: RSR_FTP_HOST, 
      port: 2222, 
      user: RSR_FTP_USER, 
      password: RSR_FTP_PASS, 
      secure: true,
      secureOptions: {
        rejectUnauthorized: false
      }
    });
    await syncDir(client, "/ftp_images/new_images", "rsr/standard");
    // Later: high-res
    // await syncDir(client, "/ftp_highres_images", "rsr/highres");
  } finally {
    client.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });