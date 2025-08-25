import ftp from "basic-ftp";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime";

const {
  RSR_FTP_HOST, RSR_FTP_USER, RSR_FTP_PASS, RSR_FTP_PORT,
  HETZNER_S3_ENDPOINT, HETZNER_S3_REGION, HETZNER_S3_BUCKET,
  HETZNER_S3_ACCESS_KEY, HETZNER_S3_SECRET_KEY
} = process.env;

// ---- S3 client ----
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

async function retry(fn, tries = 3, delayMs = 1500) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) { last = e; if (i < tries - 1) await new Promise(r => setTimeout(r, delayMs)); }
  }
  throw last;
}

async function syncDir(client, remoteDir, prefix) {
  await client.cd(remoteDir);
  const list = await retry(() => client.list());
  const files = list.filter(e => e.isFile);

  let uploaded = 0, skipped = 0;
  for (const f of files) {
    const filename = f.name;              // e.g., AAC17-22G3_1.jpg
    const key = `${prefix}/${filename}`;  // e.g., rsr/standard/AAC17-22G3_1.jpg
    if (await objectExists(key)) { skipped++; continue; }

    const chunks = [];
    await retry(() => client.downloadTo((c) => chunks.push(c), filename));
    await uploadBuffer(Buffer.concat(chunks), key);
    uploaded++;
    console.log("Uploaded:", key);
  }
  await client.cdup();
  return { uploaded, skipped, total: files.length };
}

async function main() {
  const client = new ftp.Client(25000);
  client.ftp.verbose = false;
  client.ftp.useEPSV = true;

  const port = Number(RSR_FTP_PORT || 2222);
  console.log(`Connecting FTPS (explicit) ${RSR_FTP_HOST}:${port}`);

  try {
    await client.access({
      host: RSR_FTP_HOST,          // ftps.rsrgroup.com
      port,                        // 2222
      user: RSR_FTP_USER,          // RSR account number
      password: RSR_FTP_PASS,      // FTPS password
      secure: true,                // explicit FTPS
      secureOptions: {
        servername: RSR_FTP_HOST,
        minVersion: "TLSv1.2",
        rejectUnauthorized: false,
      },
      passive: true,
    });

    const a = await syncDir(client, "/ftp_images", "rsr/standard");
    // const b = await syncDir(client, "/ftp_highres_images", "rsr/highres"); // enable later

    const uploaded = a.uploaded /* + (b?.uploaded||0) */;
    const skipped  = a.skipped  /* + (b?.skipped||0)  */;
    const total    = a.total    /* + (b?.total||0)    */;

    console.log(`[summary] uploaded=${uploaded} skipped=${skipped} seen=${total}`);
  } finally {
    client.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });