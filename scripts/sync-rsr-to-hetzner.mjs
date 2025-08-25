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
  const files = list.filter(e => e.isFile && e.name.toLowerCase().includes('.jpg'));

  let uploaded = 0, skipped = 0;
  for (const f of files) {
    const filename = f.name;              // e.g., AAC17-22G3_1.jpg
    const key = `${prefix}/${filename}`;  // e.g., rsr/standard/AAC17-22G3_1.jpg
    if (await objectExists(key)) { skipped++; continue; }

    const chunks = [];
    await retry(() => client.downloadTo((c) => chunks.push(c), filename));
    const buffer = Buffer.concat(chunks);
    await uploadBuffer(buffer, key);
    uploaded++;
    console.log("Uploaded:", key);
  }
  await client.cdup();
  return { uploaded, skipped, total: files.length };
}

async function syncManufacturerDir(client, remoteDir, prefix) {
  await client.cd(remoteDir);
  const mfgList = await retry(() => client.list());
  const mfgDirs = mfgList.filter(e => e.isDirectory);

  let totalUploaded = 0, totalSkipped = 0, totalFiles = 0;
  
  for (const mfgDir of mfgDirs) {
    try {
      await client.cd(mfgDir.name);
      const brandList = await retry(() => client.list());
      const brandDirs = brandList.filter(e => e.isDirectory);
      
      for (const brandDir of brandDirs) {
        try {
          await client.cd(brandDir.name);
          const files = await retry(() => client.list());
          const jpgFiles = files.filter(f => f.isFile && f.name.toLowerCase().includes('.jpg'));
          
          for (const file of jpgFiles) {
            const key = `${prefix}/${mfgDir.name}/${brandDir.name}/${file.name}`;
            if (await objectExists(key)) { 
              totalSkipped++; 
              continue; 
            }
            
            const chunks = [];
            await retry(() => client.downloadTo((c) => chunks.push(c), file.name));
            const buffer = Buffer.concat(chunks);
            await uploadBuffer(buffer, key);
            totalUploaded++;
            console.log("Uploaded:", key);
          }
          
          totalFiles += jpgFiles.length;
          await client.cdup();
        } catch (e) {
          console.log(`Error accessing brand ${brandDir.name}:`, e.message);
        }
      }
      
      await client.cdup();
    } catch (e) {
      console.log(`Error accessing manufacturer ${mfgDir.name}:`, e.message);
    }
  }
  
  await client.cdup();
  return { uploaded: totalUploaded, skipped: totalSkipped, total: totalFiles };
}

async function syncRSRNumberDir(client, remoteDir, prefix, maxDirs = 5) {
  await client.cd(remoteDir);
  const letterDirs = await retry(() => client.list());
  const dirs = letterDirs.filter(e => e.isDirectory).slice(0, maxDirs);

  let totalUploaded = 0, totalSkipped = 0, totalFiles = 0;
  
  for (const letterDir of dirs) {
    try {
      console.log(`Processing RSR directory: ${letterDir.name}/`);
      await client.cd(letterDir.name);
      const files = await retry(() => client.list());
      const jpgFiles = files.filter(f => f.isFile && f.name.toLowerCase().includes('.jpg'));
      
      for (const file of jpgFiles) {
        const key = `${prefix}/${letterDir.name}/${file.name}`;
        if (await objectExists(key)) { 
          totalSkipped++; 
          continue; 
        }
        
        const chunks = [];
        await retry(() => client.downloadTo((c) => chunks.push(c), file.name));
        const buffer = Buffer.concat(chunks);
        await uploadBuffer(buffer, key);
        totalUploaded++;
        console.log("Uploaded:", key);
      }
      
      totalFiles += jpgFiles.length;
      await client.cdup();
    } catch (e) {
      console.log(`Error accessing RSR directory ${letterDir.name}:`, e.message);
    }
  }
  
  await client.cdup();
  return { uploaded: totalUploaded, skipped: totalSkipped, total: totalFiles };
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

    // Sync all image sources
    console.log("🚀 Starting comprehensive image sync...");
    
    const results = [];
    
    // 1. New images (standard resolution)
    console.log("📁 Syncing new images (standard)...");
    results.push(await syncDir(client, "/ftp_images/new_images", "rsr/standard"));
    
    // 2. New images (high resolution)  
    console.log("📁 Syncing new images (high-res)...");
    results.push(await syncDir(client, "/ftp_highres_images/new_images", "rsr/highres"));
    
    // 3. Manufacturer organized images
    console.log("📁 Syncing manufacturer images...");
    results.push(await syncManufacturerDir(client, "/ftp_images/manufacturers", "rsr/manufacturers"));
    
    // 4. RSR number organized images (sample first - this is huge!)
    console.log("📁 Syncing RSR number images (first 5 directories)...");
    results.push(await syncRSRNumberDir(client, "/ftp_images/rsr_number", "rsr/products", 5));

    const uploaded = results.reduce((sum, r) => sum + r.uploaded, 0);
    const skipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const total = results.reduce((sum, r) => sum + r.total, 0);

    console.log(`[summary] uploaded=${uploaded} skipped=${skipped} seen=${total}`);
  } finally {
    client.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });