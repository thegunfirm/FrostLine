/**
 * Continuous Glock Fix - Batch Processing
 * Processes Glock handgun tag fixes in smaller batches to avoid timeouts
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { products } from "@shared/schema";
import { eq, and, like } from "drizzle-orm";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema: { products } });

/**
 * Identify ACTUAL handgun products (complete firearms)
 */
function isActualHandgun(name: string): boolean {
  const nameUpper = name.toUpperCase();
  
  // Exclude obvious non-handgun items
  if (nameUpper.includes('SHIRT') || nameUpper.includes('APPAREL') || 
      nameUpper.includes('HAT') || nameUpper.includes('CAP') ||
      nameUpper.includes('KNIFE') || nameUpper.includes('TOOL') ||
      nameUpper.includes('SAFE') || nameUpper.includes('SIGN') ||
      nameUpper.includes('FIRING PIN') || nameUpper.includes('SPRING') ||
      nameUpper.includes('PLATE') || nameUpper.includes('SCREW')) {
    return false;
  }
  
  // Genuine Glock handgun models
  const handgunModels = [
    'G17', 'G19', 'G20', 'G21', 'G22', 'G23', 'G24', 'G25', 'G26', 'G27', 'G28', 'G29', 'G30',
    'G31', 'G32', 'G33', 'G34', 'G35', 'G36', 'G37', 'G38', 'G39', 'G40', 'G41', 'G42', 'G43', 'G44', 'G45', 'G46', 'G47', 'G48'
  ];
  
  return handgunModels.some(model => nameUpper.includes(model));
}

/**
 * Generate correct tags for Glock handgun products
 */
function generateHandgunTags(name: string): string[] {
  const tags = ['GLOCK', 'Handguns'];
  
  // Add generation info
  if (name.includes('GEN5') || name.includes('GEN 5')) tags.push('Gen 5');
  if (name.includes('GEN4') || name.includes('GEN 4')) tags.push('Gen 4');
  if (name.includes('GEN3') || name.includes('GEN 3')) tags.push('Gen 3');
  
  // Add caliber info
  if (name.includes('9MM') || name.includes('9 MM')) tags.push('9mm');
  if (name.includes('40') && name.includes('S&W')) tags.push('.40 S&W');
  if (name.includes('45 ACP') || name.includes('.45')) tags.push('.45 ACP');
  if (name.includes('10MM') || name.includes('10 MM')) tags.push('10mm');
  if (name.includes('380') || name.includes('.380')) tags.push('.380 ACP');
  
  // Add special features
  if (name.includes('MOS')) tags.push('MOS');
  if (name.includes('FS') && !name.includes('FSS')) tags.push('Front Sight');
  
  return tags;
}

/**
 * Categorize accessories that were incorrectly labeled as handguns
 */
function categorizeAccessory(name: string): string {
  const nameUpper = name.toUpperCase();
  
  if (nameUpper.includes('SHIRT') || nameUpper.includes('APPAREL') || 
      nameUpper.includes('HAT') || nameUpper.includes('CAP')) {
    return 'Accessories';
  }
  
  if (nameUpper.includes('KNIFE') || nameUpper.includes('TOOL') ||
      nameUpper.includes('SAFE') || nameUpper.includes('SIGN')) {
    return 'Accessories';
  }
  
  if (nameUpper.includes('FIRING PIN') || nameUpper.includes('SPRING') ||
      nameUpper.includes('PLATE') || nameUpper.includes('SCREW')) {
    return 'Parts and Components';
  }
  
  return 'Accessories';
}

/**
 * Fix Glock categorization in small batches
 */
async function continuousGlockFix() {
  try {
    console.log('🐘 Connected to Neon serverless PostgreSQL');
    
    let batchNumber = 1;
    let totalFixed = 0;
    
    while (true) {
      // Get next batch of problematic Glock products
      // Use raw SQL for JSON search since tags is JSON array
      const problematicProducts = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.category, 'Handguns'),
            like(products.name, '%GLOCK%')
          )
        )
        .limit(50); // Larger batch since we'll filter manually
      
      // Filter for products with "Accessories" in tags array
      const filteredProducts = problematicProducts.filter(product => {
        if (!product.tags) return false;
        const tags = Array.isArray(product.tags) ? product.tags : [];
        return tags.some((tag: string) => tag && tag.toLowerCase().includes('accessories'));
      });
      
      if (filteredProducts.length === 0) {
        console.log('✅ All Glock products have been fixed!');
        break;
      }
      
      console.log(`📦 Processing batch ${batchNumber} (${filteredProducts.length} products)...`);
      
      for (const product of filteredProducts) {
        const isHandgun = isActualHandgun(product.name);
        
        if (isHandgun) {
          // Keep in Handguns but fix tags
          const newTags = generateHandgunTags(product.name);
          
          await db
            .update(products)
            .set({ 
              tags: newTags,
              updatedAt: new Date()
            })
            .where(eq(products.id, product.id));
          
          console.log(`🔫 Handgun: ${product.name.substring(0, 40)}... -> Fixed tags`);
        } else {
          // Move to appropriate category
          const newCategory = categorizeAccessory(product.name);
          const newTags = ['GLOCK'];
          
          await db
            .update(products)
            .set({ 
              category: newCategory,
              tags: newTags,
              updatedAt: new Date()
            })
            .where(eq(products.id, product.id));
          
          console.log(`👕 Accessory: ${product.name.substring(0, 40)}... -> ${newCategory}`);
        }
        
        totalFixed++;
      }
      
      console.log(`✅ Batch ${batchNumber} completed (${problematicProducts.length} products fixed)`);
      batchNumber++;
      
      // Short pause between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`🎉 Complete! Fixed ${totalFixed} authentic Glock products`);
    
  } catch (error) {
    console.error('❌ Error during Glock fix:', error);
  } finally {
    await pool.end();
  }
}

// Run the fix
continuousGlockFix();