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

async function syncHighResBatch() {
  const client = new ftp.Client(25000);
  
  try {
    console.log('Connecting to RSR FTP...');
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
    
    console.log('📁 Syncing high-res images (first 50)...');
    await client.cd('/ftp_highres_images/new_images');
    const files = await client.list();
    const jpgFiles = files.filter(f => f.isFile && f.name.toLowerCase().includes('.jpg')).slice(0, 50);
    
    console.log(`Found ${jpgFiles.length} high-res images to sync`);
    
    let uploaded = 0, skipped = 0;
    for (const file of jpgFiles) {
      const key = `rsr/highres/${file.name}`;
      
      if (await objectExists(key)) {
        console.log(`⏭️  Skipped ${file.name}`);
        skipped++;
        continue;
      }
      
      try {
        const buffer = await downloadFile(client, file.name);
        await uploadBuffer(buffer, key);
        uploaded++;
        console.log(`✅ Uploaded ${file.name} (${buffer.length} bytes)`);
      } catch (error) {
        console.log(`❌ Failed to upload ${file.name}:`, error.message);
      }
    }
    
    console.log(`🎉 High-res sync complete! Uploaded ${uploaded}, skipped ${skipped}`);
    
  } finally {
    client.close();
  }
}

syncHighResBatch().catch(console.error);
