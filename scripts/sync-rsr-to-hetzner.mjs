import ftp from "basic-ftp";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime";

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

  // modest concurrency
  const chunks = 4;
  async function worker(ix) {
    for (let i = ix; i < files.length; i += chunks) {
      const f = files[i];
      const filename = f.name; // AAC17-22G3_1.jpg
      const key = `${prefix}/${filename}`;
      if (await objectExists(key)) continue;

      const w = await client.downloadTo(Buffer.alloc(f.size || 0), filename).catch(async () => {
        // fallback: fetch into memory if size unknown
        const data = [];
        await client.downloadTo((chunk) => data.push(chunk), filename);
        return Buffer.concat(data);
      });
      const buf = Buffer.isBuffer(w) ? w : Buffer.from(w); // normalize
      await uploadBuffer(buf, key);
      console.log("Uploaded:", key);
    }
  }
  await Promise.all([...Array(chunks)].map((_, i) => worker(i)));
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
    await syncDir(client, "/ftp_images", "rsr/standard");
    // Later: high-res
    // await syncDir(client, "/ftp_highres_images", "rsr/highres");
  } finally {
    client.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });