import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test with a few RSR products we know exist
const TEST_PRODUCTS = [
  'GLPG1950203',  // Glock 19 Gen5
  'SWMP9SPC',     // S&W M&P Shield Plus
  'RUG1022C'      // Ruger 10/22 Carbine
];

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images', 'products');
const RSR_USERNAME = process.env.RSR_USERNAME;
const RSR_PASSWORD = process.env.RSR_PASSWORD;

// Ensure directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const credentials = Buffer.from(`${RSR_USERNAME}:${RSR_PASSWORD}`).toString('base64');
    
    const options = {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
      }
    };

    https.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      const writeStream = fs.createWriteStream(outputPath);
      res.pipe(writeStream);
      
      writeStream.on('error', reject);
      writeStream.on('finish', () => {
        const stats = fs.statSync(outputPath);
        console.log(`Downloaded ${path.basename(outputPath)} (${stats.size} bytes)`);
        resolve();
      });
    }).on('error', reject);
  });
}

async function downloadTestImages() {
  console.log('Downloading test RSR images...');
  
  for (const productCode of TEST_PRODUCTS) {
    const sizes = [
      { name: 'thumb', url: `https://www.rsrgroup.com/images/inventory/thumb/${productCode}.jpg` },
      { name: 'standard', url: `https://www.rsrgroup.com/images/inventory/${productCode}.jpg` },
      { name: 'large', url: `https://www.rsrgroup.com/images/inventory/large/${productCode}.jpg` }
    ];
    
    for (const size of sizes) {
      const fileName = `${productCode}_${size.name}.jpg`;
      const outputPath = path.join(IMAGES_DIR, fileName);
      
      try {
        await downloadImage(size.url, outputPath);
      } catch (error) {
        console.log(`Failed to download ${fileName}: ${error.message}`);
      }
    }
  }
  
  console.log('Download complete!');
}

downloadTestImages().catch(console.error);