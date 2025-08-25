import ftp from "basic-ftp";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime";
import { Writable } from "stream";

const s3 = new S3Client({
  region: process.env.HETZNER_S3_REGION,
  endpoint: process.env.HETZNER_S3_ENDPOINT,
  forcePathStyle: true,
  credentials: { 
    accessKeyId: process.env.HETZNER_S3_ACCESS_KEY, 
    secretAccessKey: process.env.HETZNER_S3_SECRET_KEY 
  },
});

async function uploadBuffer(buf, Key) {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.HETZNER_S3_BUCKET,
    Key,
    Body: buf,
    ContentType: mime.getType(Key) || "application/octet-stream",
    CacheControl: "public, max-age=31536000, immutable",
    ACL: "public-read",
  }));
}

async function objectExists(Key) {
  try { 
    await s3.send(new HeadObjectCommand({ 
      Bucket: process.env.HETZNER_S3_BUCKET, 
      Key 
    })); 
    return true; 
  } catch { 
    return false; 
  }
}

async function downloadFile(client, filename) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const writable = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
        callback();
      }
    });
    
    writable.on('finish', () => {
      resolve(Buffer.concat(chunks));
    });
    
    writable.on('error', reject);
    
    client.downloadTo(writable, filename)
      .then(() => writable.end())
      .catch(reject);
  });
}

async function syncDirectory(client, remotePath, bucketPrefix, maxFiles = 1000) {
  console.log(`📁 Syncing ${remotePath} -> ${bucketPrefix}`);
  
  try {
    await client.cd(remotePath);
    const files = await client.list();
    const jpgFiles = files.filter(f => f.isFile && f.name.toLowerCase().includes('.jpg')).slice(0, maxFiles);
    
    console.log(`Found ${jpgFiles.length} images to sync`);
    
    let uploaded = 0, skipped = 0, errors = 0;
    
    for (const file of jpgFiles) {
      const key = `${bucketPrefix}/${file.name}`;
      
      if (await objectExists(key)) {
        skipped++;
        if (skipped % 100 === 0) console.log(`⏭️  Skipped ${skipped} files...`);
        continue;
      }
      
      try {
        const buffer = await downloadFile(client, file.name);
        await uploadBuffer(buffer, key);
        uploaded++;
        console.log(`✅ Uploaded ${file.name} (${buffer.length} bytes)`);
      } catch (error) {
        errors++;
        console.log(`❌ Failed ${file.name}: ${error.message}`);
      }
    }
    
    console.log(`📊 ${remotePath}: Uploaded ${uploaded}, Skipped ${skipped}, Errors ${errors}`);
    await client.cdup();
    
    return { uploaded, skipped, errors };
    
  } catch (error) {
    console.log(`❌ Could not sync ${remotePath}: ${error.message}`);
    return { uploaded: 0, skipped: 0, errors: 1 };
  }
}

async function comprehensiveSync() {
  const client = new ftp.Client(30000);
  
  try {
    console.log('🚀 Starting comprehensive RSR image sync...');
    await client.access({
      host: process.env.RSR_FTP_HOST,
      port: 2222,
      user: process.env.RSR_FTP_USER,
      password: process.env.RSR_FTP_PASS,
      secure: true,
      secureOptions: {
        servername: process.env.RSR_FTP_HOST,
        minVersion: "TLSv1.2",
        rejectUnauthorized: false,
      },
      passive: true,
    });
    
    const results = [];
    
    // 1. Finish high-res images (remaining)
    results.push(await syncDirectory(client, "/ftp_highres_images/new_images", "rsr/highres", 2000));
    
    // 2. Standard new images (if any remaining) 
    results.push(await syncDirectory(client, "/ftp_images/new_images", "rsr/standard", 5000));
    
    // 3. Sample manufacturer images (5.11 Tactical has 10k+ images)
    await client.cd("/ftp_images/manufacturers/#");
    results.push(await syncDirectory(client, "5.11-tactical", "rsr/manufacturers/5.11-tactical", 500));
    await client.cdup();
    
    // 4. Sample RSR number directory (start with 't' directory - has 10k+ images)
    await client.cd("/ftp_images/rsr_number");
    results.push(await syncDirectory(client, "t", "rsr/products/t", 2000));
    await client.cdup();
    
    const totalUploaded = results.reduce((sum, r) => sum + r.uploaded, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
    
    console.log(`🎉 Sync complete! Uploaded: ${totalUploaded}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`);
    
  } catch (error) {
    console.log('❌ Sync failed:', error.message);
  } finally {
    client.close();
  }
}

comprehensiveSync().catch(console.error);
