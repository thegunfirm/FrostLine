/**
 * Update RSR Products with Multiple Images
 * Scans each product for available image angles and updates the database
 */

import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import https from 'https';

/**
 * Check if RSR image exists
 */
async function checkRSRImageExists(stockNo: string, imageNumber: number): Promise<number | null> {
  const imageUrl = `https://img.rsrgroup.com/pimages/${stockNo}_${imageNumber}.jpg`;
  
  return new Promise((resolve) => {
    const options = {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.rsrgroup.com/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      timeout: 5000
    };
    
    const req = https.request(imageUrl, options, (res) => {
      if (res.statusCode === 200) {
        const contentLength = parseInt(res.headers['content-length'] || '0');
        // Only count as valid if larger than placeholder size (>5KB)
        resolve(contentLength > 5000 ? contentLength : null);
      } else {
        resolve(null);
      }
    });
    
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    
    req.setTimeout(5000);
    req.end();
  });
}

/**
 * Get all available images for an RSR product
 */
async function getRSRProductImages(stockNo: string): Promise<any[]> {
  const images: any[] = [];
  
  // Check up to 4 potential image angles
  for (let i = 1; i <= 4; i++) {
    const size = await checkRSRImageExists(stockNo, i);
    
    if (size) {
      images.push({
        image: `/api/rsr-image/${stockNo}?angle=${i}`,
        id: `rsr-${stockNo}-${i}`,
        alt: `${stockNo} - Angle ${i}`,
        size: size
      });
    }
  }
  
  return images;
}

/**
 * Update products with multiple images
 */
async function updateRSRMultiImages() {
  console.log('🖼️ Updating RSR products with multiple images...');
  
  // Get all RSR products
  const allProducts = await db.select().from(products).where(eq(products.distributor, 'RSR'));
  
  console.log(`📦 Found ${allProducts.length} RSR products to update`);
  
  let updated = 0;
  let multiImageProducts = 0;
  let errors = 0;
  
  // Process in batches to avoid overwhelming the server
  const batchSize = 20;
  const totalBatches = Math.ceil(allProducts.length / batchSize);
  
  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, allProducts.length);
    const batch = allProducts.slice(start, end);
    
    console.log(`📦 Processing batch ${i + 1}/${totalBatches}...`);
    
    for (const product of batch) {
      try {
        if (!product.sku) continue;
        
        // Get all available images for this product
        const availableImages = await getRSRProductImages(product.sku);
        
        if (availableImages.length > 0) {
          // Update product with new image array
          await db.update(products)
            .set({ 
              images: availableImages
            })
            .where(eq(products.id, product.id));
          
          updated++;
          
          if (availableImages.length > 1) {
            multiImageProducts++;
            console.log(`✅ ${product.sku}: ${availableImages.length} images found`);
          }
        }
        
      } catch (error: any) {
        errors++;
        console.error(`❌ Error updating ${product.sku}: ${error.message}`);
      }
    }
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Multi-image Update Summary:');
  console.log(`✅ Products updated: ${updated}`);
  console.log(`🖼️ Products with multiple images: ${multiImageProducts}`);
  console.log(`❌ Errors: ${errors}`);
  
  // Show sample products with multiple images
  console.log('\n🔍 Sample products with multiple images:');
  const multiImageSamples = await db.select().from(products)
    .where(eq(products.distributor, 'RSR'))
    .limit(10);
  
  for (const product of multiImageSamples) {
    const images = product.images as any[];
    if (images && images.length > 1) {
      console.log(`📸 ${product.name} (${product.sku}): ${images.length} images`);
    }
  }
  
  return { updated, multiImageProducts, errors };
}

// Execute update
updateRSRMultiImages()
  .then(result => {
    console.log('\n🎉 RSR multi-image update completed!');
    console.log(`📊 Updated ${result.updated} products, ${result.multiImageProducts} have multiple images`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Update failed:', error);
    process.exit(1);
  });