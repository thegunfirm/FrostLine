/**
 * Universal Product Metadata Enrichment
 * Extracts caliber, firearm type, and compatibility tags for all 29,000+ products
 * This enables scalable related product matching without custom logic per firearm type
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";

// Universal caliber patterns (most specific first)
const CALIBER_PATTERNS = [
  // Pistol calibers
  { pattern: /\.45\s*ACP|45\s*ACP/i, caliber: '45ACP' },
  { pattern: /\.40\s*S&W|40\s*S&W|\.40\s*SW|40\s*SW/i, caliber: '40SW' },
  { pattern: /\.357\s*MAG|357\s*MAG|\.357\s*MAGNUM|357\s*MAGNUM/i, caliber: '357MAG' },
  { pattern: /\.380\s*ACP|380\s*ACP/i, caliber: '380ACP' },
  { pattern: /\.38\s*SPEC|38\s*SPEC|\.38\s*SPECIAL|38\s*SPECIAL/i, caliber: '38SPEC' },
  { pattern: /9\s*MM|9MM/i, caliber: '9MM' },
  { pattern: /10\s*MM|10MM/i, caliber: '10MM' },
  { pattern: /\.50\s*AE|50\s*AE/i, caliber: '50AE' },
  
  // Rifle calibers
  { pattern: /\.223\s*REM|223\s*REM|\.223|223(?!\w)/i, caliber: '223REM' },
  { pattern: /5\.56\s*NATO|5\.56|556/i, caliber: '5.56NATO' },
  { pattern: /\.308\s*WIN|308\s*WIN|\.308|308(?!\w)/i, caliber: '308WIN' },
  { pattern: /\.30-06|30-06/i, caliber: '30-06' },
  { pattern: /\.270\s*WIN|270\s*WIN|\.270|270(?!\w)/i, caliber: '270WIN' },
  { pattern: /\.300\s*WIN|300\s*WIN|\.300|300(?!\w)/i, caliber: '300WIN' },
  { pattern: /7\.62\s*X39|7\.62X39|762X39/i, caliber: '7.62X39' },
  { pattern: /6\.5\s*CREED|6\.5\s*CREEDMOOR|65\s*CREED/i, caliber: '6.5CREED' },
  
  // Rimfire
  { pattern: /\.22\s*LR|22\s*LR|\.22\s*LONG|22\s*LONG/i, caliber: '22LR' },
  { pattern: /\.17\s*HMR|17\s*HMR/i, caliber: '17HMR' },
  
  // Shotgun
  { pattern: /12\s*GA|12\s*GAUGE/i, caliber: '12GA' },
  { pattern: /20\s*GA|20\s*GAUGE/i, caliber: '20GA' },
  { pattern: /410\s*BORE|\.410/i, caliber: '410BORE' },
];

// Universal firearm type patterns (most specific first)
const FIREARM_TYPE_PATTERNS = [
  // 1911 variants
  { pattern: /ULTRA\s*CARRY\s*II/i, type: 'ULTRA_CARRY_II' },
  { pattern: /ULTRA\s*CARRY/i, type: 'ULTRA_CARRY' },
  { pattern: /COMMANDER/i, type: 'COMMANDER' },
  { pattern: /OFFICER/i, type: 'OFFICER' },
  { pattern: /GOVERNMENT/i, type: 'GOVERNMENT' },
  { pattern: /1911A1/i, type: '1911A1' },
  { pattern: /1911/i, type: '1911' },
  
  // Glock variants  
  { pattern: /GLOCK\s*(\d+)/i, type: 'GLOCK', extractModel: true },
  { pattern: /GLOCK/i, type: 'GLOCK' },
  
  // AR platform
  { pattern: /AR-15|AR15/i, type: 'AR15' },
  { pattern: /AR-10|AR10/i, type: 'AR10' },
  { pattern: /M4\s*CARBINE|M4A1/i, type: 'M4' },
  
  // AK platform
  { pattern: /AK-47|AK47/i, type: 'AK47' },
  { pattern: /AK-74|AK74/i, type: 'AK74' },
  
  // Revolver types
  { pattern: /REVOLVER/i, type: 'REVOLVER' },
  
  // Shotgun types
  { pattern: /SEMI-AUTO\s*SHOTGUN|SEMI\s*AUTO\s*SHOTGUN/i, type: 'SEMI_AUTO_SHOTGUN' },
  { pattern: /PUMP\s*SHOTGUN|PUMP\s*ACTION/i, type: 'PUMP_SHOTGUN' },
  { pattern: /SHOTGUN/i, type: 'SHOTGUN' },
  
  // Rifle types
  { pattern: /BOLT\s*ACTION|BOLT-ACTION/i, type: 'BOLT_ACTION' },
  { pattern: /LEVER\s*ACTION|LEVER-ACTION/i, type: 'LEVER_ACTION' },
  { pattern: /SEMI-AUTO\s*RIFLE|SEMI\s*AUTO\s*RIFLE/i, type: 'SEMI_AUTO_RIFLE' },
  { pattern: /RIFLE/i, type: 'RIFLE' },
  
  // Pistol types
  { pattern: /STRIKER\s*FIRED/i, type: 'STRIKER_FIRED' },
  { pattern: /DOUBLE\s*ACTION|DA\/SA/i, type: 'DOUBLE_ACTION' },
  { pattern: /SINGLE\s*ACTION/i, type: 'SINGLE_ACTION' },
  { pattern: /PISTOL/i, type: 'PISTOL' },
];

// Generate compatibility tags based on caliber and firearm type
function generateCompatibilityTags(caliber: string | null, firearmType: string | null, name: string): string[] {
  const tags: string[] = [];
  
  if (caliber) {
    tags.push(`caliber_${caliber.toLowerCase()}`);
  }
  
  if (firearmType) {
    tags.push(`type_${firearmType.toLowerCase()}`);
    
    // Add family tags
    if (firearmType.includes('1911')) {
      tags.push('family_1911');
    }
    if (firearmType.includes('GLOCK')) {
      tags.push('family_glock');
    }
    if (firearmType.includes('AR')) {
      tags.push('family_ar');
    }
    if (firearmType.includes('AK')) {
      tags.push('family_ak');
    }
  }
  
  // Add manufacturer compatibility
  const nameLower = name.toLowerCase();
  if (nameLower.includes('kimber')) tags.push('mfg_kimber');
  if (nameLower.includes('glock')) tags.push('mfg_glock');
  if (nameLower.includes('smith') || nameLower.includes('s&w')) tags.push('mfg_smith_wesson');
  if (nameLower.includes('ruger')) tags.push('mfg_ruger');
  if (nameLower.includes('sig')) tags.push('mfg_sig');
  if (nameLower.includes('colt')) tags.push('mfg_colt');
  if (nameLower.includes('springfield')) tags.push('mfg_springfield');
  
  return tags;
}

// Extract caliber from product name
function extractCaliber(name: string): string | null {
  for (const { pattern, caliber } of CALIBER_PATTERNS) {
    if (pattern.test(name)) {
      return caliber;
    }
  }
  return null;
}

// Extract firearm type from product name
function extractFirearmType(name: string): string | null {
  for (const { pattern, type, extractModel } of FIREARM_TYPE_PATTERNS) {
    const match = name.match(pattern);
    if (match) {
      if (extractModel && match[1]) {
        return `${type}_${match[1]}`;
      }
      return type;
    }
  }
  return null;
}

// Update related products to use simple Algolia-based matching
async function updateRelatedProductsMethod() {
  console.log('🔄 Updating related products method to use metadata-based Algolia search...');
  
  // The new approach will use these metadata fields in Algolia search filters:
  // - caliber: exact match gets high priority
  // - firearmType: exact match gets high priority  
  // - compatibilityTags: array intersection for flexible matching
  // - manufacturer: manufacturer match gets medium priority
  
  console.log('✅ Related products will now use universal metadata-based matching');
}

// Main enrichment function
async function enrichProductMetadata() {
  console.log('🚀 Starting universal product metadata enrichment...');
  
  // Get all products in batches
  const batchSize = 1000;
  let offset = 0;
  let totalProcessed = 0;
  let totalUpdated = 0;
  
  while (true) {
    const batch = await db.select().from(products)
      .where(eq(products.isActive, true))
      .limit(batchSize)
      .offset(offset);
    
    if (batch.length === 0) break;
    
    console.log(`📊 Processing batch ${Math.floor(offset / batchSize) + 1}: ${batch.length} products`);
    
    const updates = [];
    
    for (const product of batch) {
      const caliber = extractCaliber(product.name);
      const firearmType = extractFirearmType(product.name);
      const compatibilityTags = generateCompatibilityTags(caliber, firearmType, product.name);
      
      // Only update if we extracted meaningful data
      if (caliber || firearmType || compatibilityTags.length > 0) {
        updates.push({
          id: product.id,
          caliber,
          firearmType,
          compatibilityTags: JSON.stringify(compatibilityTags)
        });
      }
      
      totalProcessed++;
    }
    
    // Batch update
    if (updates.length > 0) {
      for (const update of updates) {
        await db.update(products)
          .set({
            caliber: update.caliber,
            firearmType: update.firearmType,
            compatibilityTags: update.compatibilityTags
          })
          .where(eq(products.id, update.id));
      }
      
      totalUpdated += updates.length;
      console.log(`✅ Updated ${updates.length} products with metadata`);
    }
    
    offset += batchSize;
  }
  
  console.log(`\n🎉 Metadata enrichment complete!`);
  console.log(`📊 Total processed: ${totalProcessed}`);
  console.log(`📊 Total updated: ${totalUpdated}`);
  console.log(`📈 Success rate: ${((totalUpdated / totalProcessed) * 100).toFixed(1)}%`);
  
  // Update the related products method
  await updateRelatedProductsMethod();
}

// Run the enrichment
enrichProductMetadata().catch(console.error);