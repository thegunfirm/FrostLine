/**
 * Update Firearms with Complete 7-Image Sets
 * Generates complete image arrays for firearms products with all RSR variants
 */

import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Determine if product is a firearm based on category and FFL requirement
 */
function isFirearm(product: any): boolean {
  const firearmCategories = ['Handguns', 'Used Handguns', 'Long Guns', 'Used Long Guns'];
  return firearmCategories.includes(product.category) || product.requiresFFL;
}

/**
 * Generate complete 7-image set for firearms
 */
function generateFirearmImageSet(stockNo: string, productName: string): any[] {
  return [
    // 3 Main product angles
    {
      image: `/api/rsr-image/${stockNo}?angle=1&size=standard`,
      id: `rsr-${stockNo}-1`,
      alt: `${productName} - Main View`,
      type: 'main',
      angle: 1,
      size: 'standard'
    },
    {
      image: `/api/rsr-image/${stockNo}?angle=2&size=standard`,
      id: `rsr-${stockNo}-2`, 
      alt: `${productName} - Side View`,
      type: 'main',
      angle: 2,
      size: 'standard'
    },
    {
      image: `/api/rsr-image/${stockNo}?angle=3&size=standard`,
      id: `rsr-${stockNo}-3`,
      alt: `${productName} - Rear View`,
      type: 'main', 
      angle: 3,
      size: 'standard'
    },
    // 3 Matching thumbnails
    {
      image: `/api/rsr-image/${stockNo}?angle=1&size=thumb`,
      id: `rsr-${stockNo}-1-thumb`,
      alt: `${productName} - Thumbnail 1`,
      type: 'thumbnail',
      angle: 1,
      size: 'thumb'
    },
    {
      image: `/api/rsr-image/${stockNo}?angle=2&size=thumb`,
      id: `rsr-${stockNo}-2-thumb`,
      alt: `${productName} - Thumbnail 2`,
      type: 'thumbnail',
      angle: 2,
      size: 'thumb'
    },
    {
      image: `/api/rsr-image/${stockNo}?angle=3&size=thumb`,
      id: `rsr-${stockNo}-3-thumb`,
      alt: `${productName} - Thumbnail 3`,
      type: 'thumbnail',
      angle: 3,
      size: 'thumb'
    },
    // 1 High resolution (typically angle 1)
    {
      image: `/api/rsr-image/${stockNo}?size=highres`,
      id: `rsr-${stockNo}-hr`,
      alt: `${productName} - High Resolution`,
      type: 'highres',
      angle: 1,
      size: 'highres'
    }
  ];
}

/**
 * Generate standard image set for non-firearms (accessories, ammo, etc.)
 */
function generateStandardImageSet(stockNo: string, productName: string): any[] {
  return [
    // Primary image only for non-firearms
    {
      image: `/api/rsr-image/${stockNo}?angle=1&size=standard`,
      id: `rsr-${stockNo}-1`,
      alt: productName,
      type: 'main',
      angle: 1,
      size: 'standard'
    }
  ];
}

/**
 * Update all products with appropriate image sets
 */
async function updateProductsWithCompleteImages() {
  console.log('🖼️ Updating RSR products with complete image sets...');
  
  // Get all RSR products
  const allProducts = await db.select().from(products).where(eq(products.distributor, 'RSR'));
  
  console.log(`📦 Found ${allProducts.length} RSR products to update`);
  
  let firearmsUpdated = 0;
  let accessoriesUpdated = 0;
  let errors = 0;
  
  // Process in batches
  const batchSize = 50;
  const totalBatches = Math.ceil(allProducts.length / batchSize);
  
  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, allProducts.length);
    const batch = allProducts.slice(start, end);
    
    console.log(`📦 Processing batch ${i + 1}/${totalBatches}...`);
    
    for (const product of batch) {
      try {
        if (!product.sku) continue;
        
        let imageSet: any[];
        
        if (isFirearm(product)) {
          // Generate 7-image set for firearms
          imageSet = generateFirearmImageSet(product.sku, product.name);
          firearmsUpdated++;
          
          if (firearmsUpdated <= 5) {
            console.log(`🔫 Firearm: ${product.name} (${product.sku}) - 7 images`);
          }
        } else {
          // Generate standard image set for accessories/ammo
          imageSet = generateStandardImageSet(product.sku, product.name);
          accessoriesUpdated++;
        }
        
        // Update product with new image array
        await db.update(products)
          .set({ images: imageSet })
          .where(eq(products.id, product.id));
        
      } catch (error: any) {
        errors++;
        console.error(`❌ Error updating ${product.sku}: ${error.message}`);
      }
    }
    
    if (i % 10 === 0) {
      console.log(`Progress: ${firearmsUpdated} firearms, ${accessoriesUpdated} accessories updated`);
    }
  }
  
  console.log('\n📊 Image Update Summary:');
  console.log(`🔫 Firearms updated (7 images each): ${firearmsUpdated}`);
  console.log(`🛠️ Accessories updated (1 image each): ${accessoriesUpdated}`);
  console.log(`❌ Errors: ${errors}`);
  
  // Show sample firearms with complete image sets
  console.log('\n🔍 Sample firearms with 7-image sets:');
  const firearmSamples = await db.select().from(products)
    .where(and(
      eq(products.distributor, 'RSR'),
      eq(products.requiresFFL, true)
    ))
    .limit(5);
  
  for (const firearm of firearmSamples) {
    const images = firearm.images as any[];
    if (images && images.length >= 7) {
      console.log(`🔫 ${firearm.name} (${firearm.sku}):`);
      console.log(`   📸 Main angles: ${images.filter(img => img.type === 'main').length}`);
      console.log(`   🖼️ Thumbnails: ${images.filter(img => img.type === 'thumbnail').length}`);
      console.log(`   🔍 High-res: ${images.filter(img => img.type === 'highres').length}`);
    }
  }
  
  return { firearmsUpdated, accessoriesUpdated, errors };
}

// Execute update
updateProductsWithCompleteImages()
  .then(result => {
    console.log('\n🎉 Complete image set update finished!');
    console.log(`🔫 ${result.firearmsUpdated} firearms now have 7 complete images each`);
    console.log(`🛠️ ${result.accessoriesUpdated} accessories have standard images`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Update failed:', error);
    process.exit(1);
  });