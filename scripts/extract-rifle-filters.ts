/**
 * Extract Filter Data for Rifles (Department 05)
 * Focused extraction of barrel length, finish, frame size, action type, and sight type for rifles
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

interface FilterExtractionResult {
  barrelLength: string | null;
  finish: string | null;
  frameSize: string | null;
  actionType: string | null;
  sightType: string | null;
}

/**
 * Extract barrel length from product name
 */
function extractBarrelLength(name: string): string | null {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*["″'']/g,  // 16", 18", 20", etc.
    /(\d+(?:\.\d+)?)\s*inch/gi,    // 16 inch, 18 inch
    /(\d+(?:\.\d+)?)\s*in\b/gi,    // 16 in, 18 in
  ];
  
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      const length = parseFloat(match[0].replace(/[^0-9.]/g, ''));
      if (length > 8 && length <= 50) { // Reasonable rifle barrel length range
        return `${length}"`;
      }
    }
  }
  return null;
}

/**
 * Extract finish/color from product name
 */
function extractFinish(name: string): string | null {
  const finishPatterns = [
    /\b(black|blk|matte black|matt black)\b/gi,
    /\b(stainless|ss|stainless steel)\b/gi,
    /\b(od green|odg|olive drab)\b/gi,
    /\b(fde|flat dark earth|dark earth)\b/gi,
    /\b(bronze|burnt bronze)\b/gi,
    /\b(tungsten|gray|grey)\b/gi,
    /\b(tan|desert tan)\b/gi,
    /\b(coyote|coyote brown)\b/gi,
    /\b(blue|blued)\b/gi,
    /\b(nickel|nickel plated)\b/gi,
    /\b(cerakote|cerakoted)\b/gi,
    /\b(anodized|hard anodized)\b/gi,
    /\b(parkerized|parkerizing)\b/gi,
    /\b(chrome|chromed)\b/gi,
    /\b(camouflage|camo|woodland|multicam)\b/gi
  ];
  
  for (const pattern of finishPatterns) {
    const match = name.match(pattern);
    if (match) {
      return match[0].toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase()) // Title case
        .replace(/\bBlk\b/g, 'Black')
        .replace(/\bSs\b/g, 'Stainless Steel')
        .replace(/\bOdg\b/g, 'OD Green')
        .replace(/\bFde\b/g, 'FDE');
    }
  }
  return null;
}

/**
 * Extract frame size/stock type from product name
 */
function extractFrameSize(name: string): string | null {
  const frameSizePatterns = [
    /\b(full size|full-size|fullsize)\b/gi,
    /\b(compact|compct)\b/gi,
    /\b(carbine|rifle)\b/gi,
    /\b(pistol|sbr|short barrel)\b/gi,
    /\b(standard|std)\b/gi,
    /\b(tactical|tac)\b/gi,
    /\b(precision|prec)\b/gi,
    /\b(match|competition)\b/gi,
    /\b(hunting|hunt)\b/gi,
    /\b(scout|patrol)\b/gi
  ];
  
  for (const pattern of frameSizePatterns) {
    const match = name.match(pattern);
    if (match) {
      return match[0].toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace(/\bSbr\b/g, 'SBR')
        .replace(/\bStd\b/g, 'Standard')
        .replace(/\bTac\b/g, 'Tactical')
        .replace(/\bPrec\b/g, 'Precision');
    }
  }
  return null;
}

/**
 * Extract action type from product name
 */
function extractActionType(name: string): string | null {
  const actionPatterns = [
    /\b(semi-auto|semi auto|semiauto)\b/gi,
    /\b(bolt action|bolt-action)\b/gi,
    /\b(lever action|lever-action)\b/gi,
    /\b(pump action|pump-action)\b/gi,
    /\b(single shot|single-shot)\b/gi,
    /\b(break action|break-action)\b/gi,
    /\b(gas operated|gas-operated)\b/gi,
    /\b(straight pull|straight-pull)\b/gi,
    /\b(manual|bolt)\b/gi
  ];
  
  for (const pattern of actionPatterns) {
    const match = name.match(pattern);
    if (match) {
      return match[0].toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace(/\bSemi-auto\b/g, 'Semi-Auto')
        .replace(/\bSemi Auto\b/g, 'Semi-Auto')
        .replace(/\bSemiauto\b/g, 'Semi-Auto');
    }
  }
  return null;
}

/**
 * Extract sight type from product name
 */
function extractSightType(name: string): string | null {
  const sightPatterns = [
    /\b(iron sights|iron sight|irons)\b/gi,
    /\b(red dot|rds|red-dot)\b/gi,
    /\b(scope|scoped)\b/gi,
    /\b(reflex|reflex sight)\b/gi,
    /\b(holographic|holo)\b/gi,
    /\b(open sights|open sight)\b/gi,
    /\b(peep sight|peep)\b/gi,
    /\b(ghost ring|ghost rings)\b/gi,
    /\b(fiber optic|fiber optics)\b/gi,
    /\b(night sights|night sight|tritium)\b/gi,
    /\b(adjustable|adj)\b/gi,
    /\b(fixed|fixed sight)\b/gi,
    /\b(flip up|flip-up|folding)\b/gi,
    /\b(no sights|no sight)\b/gi
  ];
  
  for (const pattern of sightPatterns) {
    const match = name.match(pattern);
    if (match) {
      return match[0].toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace(/\bRds\b/g, 'Red Dot')
        .replace(/\bAdj\b/g, 'Adjustable')
        .replace(/\bHolo\b/g, 'Holographic');
    }
  }
  return null;
}

/**
 * Extract all filter data from product name
 */
function extractAllFilters(name: string): FilterExtractionResult {
  return {
    barrelLength: extractBarrelLength(name),
    finish: extractFinish(name),
    frameSize: extractFrameSize(name),
    actionType: extractActionType(name),
    sightType: extractSightType(name)
  };
}

async function extractRifleFilters() {
  try {
    console.log('🔍 Starting rifle filter extraction for Department 05...');
    
    // Get all rifle products
    const rifles = await db.execute(sql`
      SELECT id, name, sku
      FROM products 
      WHERE department_number = '05'
      AND name IS NOT NULL
      ORDER BY id
    `);
    
    console.log(`📊 Found ${rifles.rows.length} rifle products to process`);
    
    let processed = 0;
    let updated = 0;
    
    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < rifles.rows.length; i += batchSize) {
      const batch = rifles.rows.slice(i, i + batchSize);
      
      for (const rifle of batch) {
        const filters = extractAllFilters(rifle.name);
        
        // Only update if we extracted at least one filter
        if (filters.barrelLength || filters.finish || filters.frameSize || filters.actionType || filters.sightType) {
          await db.execute(sql`
            UPDATE products 
            SET 
              barrel_length = ${filters.barrelLength},
              finish = ${filters.finish},
              frame_size = ${filters.frameSize},
              action_type = ${filters.actionType},
              sight_type = ${filters.sightType}
            WHERE id = ${rifle.id}
          `);
          updated++;
        }
        
        processed++;
        
        if (processed % 50 === 0) {
          console.log(`   ✅ Processed ${processed}/${rifles.rows.length} rifles (${updated} updated)`);
        }
      }
    }
    
    console.log(`\n🎉 Rifle filter extraction completed:`);
    console.log(`   - Processed: ${processed} rifles`);
    console.log(`   - Updated: ${updated} rifles with filter data`);
    
    // Show summary statistics
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(barrel_length) as with_barrel_length,
        COUNT(finish) as with_finish,
        COUNT(frame_size) as with_frame_size,
        COUNT(action_type) as with_action_type,
        COUNT(sight_type) as with_sight_type
      FROM products 
      WHERE department_number = '05'
    `);
    
    const rifleStats = stats.rows[0];
    console.log(`\n📈 Rifle filter coverage:`);
    console.log(`   - Total rifles: ${rifleStats.total}`);
    console.log(`   - With barrel length: ${rifleStats.with_barrel_length}`);
    console.log(`   - With finish: ${rifleStats.with_finish}`);
    console.log(`   - With frame size: ${rifleStats.with_frame_size}`);
    console.log(`   - With action type: ${rifleStats.with_action_type}`);
    console.log(`   - With sight type: ${rifleStats.with_sight_type}`);
    
  } catch (error: any) {
    console.error('❌ Error during rifle filter extraction:', error);
    throw error;
  }
}

// Run the extraction
extractRifleFilters().catch(console.error);