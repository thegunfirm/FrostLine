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
  credentials: { accessKeyId: HETZNER_S3_ACCESS_KEY, secretAccessKey: HETZNER_S3_SECRET_KEY },
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
    ACL: "public-read",
  }));
}

async function syncDir(client, remoteDir, prefix) {
  await client.cd(remoteDir);

  // small retry helper for LIST/download
  async function retry(fn, tries = 3) {
    let last; for (let i = 0; i < tries; i++) { try { return await fn(); } catch (e) { last = e; await new Promise(r => setTimeout(r, 1500)); } }
    throw last;
  }

  const list = await retry(() => client.list());
  const files = list.filter(e => e.isFile);

  for (const f of files) {
    const filename = f.name;               // e.g., AAC17-22G3_1.jpg
    const key = `${prefix}/${filename}`;   // e.g., rsr/standard/AAC17-22G3_1.jpg
    if (await objectExists(key)) continue;

    const chunks = [];
    await retry(() => client.downloadTo((c) => chunks.push(c), filename));
    const buf = Buffer.concat(chunks);
    await uploadBuffer(buf, key);
    console.log("Uploaded:", key);
  }

  await client.cdup();
}

async function main() {
  const client = new ftp.Client(20000);
  client.ftp.verbose = false;

  const port = Number(RSR_FTP_PORT || 990);
  console.log(`Connecting FTPS ${RSR_FTP_HOST}:${port}`);

  try {
    await client.access({
      host: RSR_FTP_HOST,
      port,
      user: RSR_FTP_USER,
      password: RSR_FTP_PASS,
      secure: "implicit", // explicit TLS (FTPS)
      secureOptions: {
        servername: RSR_FTP_HOST,
        minVersion: "TLSv1.2",
        rejectUnauthorized: false, // tolerate odd cert chains
      },
      passive: true,
    });

    await syncDir(client, "/ftp_images", "rsr/standard");
    // enable later if needed:
    // await syncDir(client, "/ftp_highres_images", "rsr/highres");
  } finally {
    client.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
