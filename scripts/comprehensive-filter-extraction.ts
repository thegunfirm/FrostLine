/**
 * Comprehensive Filter Data Extraction
 * Extracts filter data from ALL product categories using advanced pattern matching
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
 * Enhanced barrel length extraction with more patterns
 */
function extractBarrelLength(name: string): string | null {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*["″'']/g,          // 16", 18", 20", etc.
    /(\d+(?:\.\d+)?)\s*inch/gi,           // 16 inch, 18 inch
    /(\d+(?:\.\d+)?)\s*in\b/gi,           // 16 in, 18 in
    /(\d+(?:\.\d+)?)\s*-?\s*inch/gi,      // 16-inch, 18-inch
    /\b(\d+(?:\.\d+)?)\s*"\s*barrel/gi,   // 16" barrel
    /barrel\s*(\d+(?:\.\d+)?)\s*"/gi,     // barrel 16"
    /(\d+(?:\.\d+)?)\s*"?\s*bbl/gi,       // 16 bbl, 16" bbl
  ];
  
  for (const pattern of patterns) {
    const matches = Array.from(name.matchAll(pattern));
    if (matches.length > 0) {
      for (const match of matches) {
        const length = parseFloat(match[1]);
        if (length >= 3 && length <= 50) { // Reasonable barrel length range
          return `${length}"`;
        }
      }
    }
  }
  return null;
}

/**
 * Enhanced finish extraction with comprehensive patterns
 */
function extractFinish(name: string): string | null {
  const finishPatterns = [
    { pattern: /\b(black|blk|matte black|matt black|flat black)\b/gi, value: 'Black' },
    { pattern: /\b(stainless|ss|stainless steel|stnls)\b/gi, value: 'Stainless Steel' },
    { pattern: /\b(od green|odg|olive drab|olive)\b/gi, value: 'OD Green' },
    { pattern: /\b(fde|flat dark earth|dark earth|earth)\b/gi, value: 'FDE' },
    { pattern: /\b(bronze|burnt bronze|brz)\b/gi, value: 'Bronze' },
    { pattern: /\b(tungsten|gray|grey|gunmetal)\b/gi, value: 'Gray' },
    { pattern: /\b(tan|desert tan|sand|coyote tan)\b/gi, value: 'Tan' },
    { pattern: /\b(coyote|coyote brown|coy)\b/gi, value: 'Coyote' },
    { pattern: /\b(blue|blued|royal blue)\b/gi, value: 'Blue' },
    { pattern: /\b(nickel|nickel plated|nkl)\b/gi, value: 'Nickel' },
    { pattern: /\b(cerakote|cerakoted|cera)\b/gi, value: 'Cerakote' },
    { pattern: /\b(anodized|hard anodized|ano)\b/gi, value: 'Anodized' },
    { pattern: /\b(parkerized|parkerizing|park)\b/gi, value: 'Parkerized' },
    { pattern: /\b(chrome|chromed|chr)\b/gi, value: 'Chrome' },
    { pattern: /\b(camouflage|camo|woodland|multicam|realtree)\b/gi, value: 'Camouflage' },
    { pattern: /\b(white|wht)\b/gi, value: 'White' },
    { pattern: /\b(red|crimson)\b/gi, value: 'Red' },
    { pattern: /\b(green|grn)\b/gi, value: 'Green' },
    { pattern: /\b(pink|rose)\b/gi, value: 'Pink' },
    { pattern: /\b(purple|violet)\b/gi, value: 'Purple' },
    { pattern: /\b(carbon fiber|carbon|cf)\b/gi, value: 'Carbon Fiber' },
    { pattern: /\b(polymer|poly)\b/gi, value: 'Polymer' },
    { pattern: /\b(wood|wooden|walnut|maple)\b/gi, value: 'Wood' },
    { pattern: /\b(aluminum|alloy|al)\b/gi, value: 'Aluminum' },
  ];
  
  for (const { pattern, value } of finishPatterns) {
    const match = name.match(pattern);
    if (match) {
      return value;
    }
  }
  return null;
}

/**
 * Enhanced frame size extraction for different product types
 */
function extractFrameSize(name: string, department: string): string | null {
  const frameSizePatterns = [
    { pattern: /\b(full size|full-size|fullsize|full)\b/gi, value: 'Full Size' },
    { pattern: /\b(compact|compct|comp)\b/gi, value: 'Compact' },
    { pattern: /\b(subcompact|sub-compact|subcomp)\b/gi, value: 'Subcompact' },
    { pattern: /\b(micro|micro-compact|ultra-compact)\b/gi, value: 'Micro' },
    { pattern: /\b(carbine|carb)\b/gi, value: 'Carbine' },
    { pattern: /\b(rifle|rfl)\b/gi, value: 'Rifle' },
    { pattern: /\b(pistol|pst)\b/gi, value: 'Pistol' },
    { pattern: /\b(sbr|short barrel|short-barrel)\b/gi, value: 'SBR' },
    { pattern: /\b(standard|std|regular)\b/gi, value: 'Standard' },
    { pattern: /\b(tactical|tac|operator)\b/gi, value: 'Tactical' },
    { pattern: /\b(precision|prec|target)\b/gi, value: 'Precision' },
    { pattern: /\b(match|competition|comp)\b/gi, value: 'Match' },
    { pattern: /\b(hunting|hunt|field)\b/gi, value: 'Hunting' },
    { pattern: /\b(scout|patrol|patrol rifle)\b/gi, value: 'Scout' },
    { pattern: /\b(sniper|marksman|dmr)\b/gi, value: 'Sniper' },
    { pattern: /\b(bull barrel|heavy barrel|bull)\b/gi, value: 'Bull Barrel' },
    { pattern: /\b(lightweight|light|ultra-light)\b/gi, value: 'Lightweight' },
  ];
  
  for (const { pattern, value } of frameSizePatterns) {
    const match = name.match(pattern);
    if (match) {
      return value;
    }
  }
  return null;
}

/**
 * Enhanced action type extraction
 */
function extractActionType(name: string): string | null {
  const actionPatterns = [
    { pattern: /\b(semi-auto|semi auto|semiauto|sa)\b/gi, value: 'Semi-Auto' },
    { pattern: /\b(bolt action|bolt-action|bolt|manual)\b/gi, value: 'Bolt Action' },
    { pattern: /\b(lever action|lever-action|lever)\b/gi, value: 'Lever Action' },
    { pattern: /\b(pump action|pump-action|pump)\b/gi, value: 'Pump Action' },
    { pattern: /\b(single shot|single-shot|single)\b/gi, value: 'Single Shot' },
    { pattern: /\b(break action|break-action|break)\b/gi, value: 'Break Action' },
    { pattern: /\b(gas operated|gas-operated|gas)\b/gi, value: 'Gas Operated' },
    { pattern: /\b(straight pull|straight-pull)\b/gi, value: 'Straight Pull' },
    { pattern: /\b(double action|double-action|da)\b/gi, value: 'Double Action' },
    { pattern: /\b(striker fired|striker-fired|striker)\b/gi, value: 'Striker Fired' },
    { pattern: /\b(hammer fired|hammer-fired|hammer)\b/gi, value: 'Hammer Fired' },
    { pattern: /\b(revolver|rev)\b/gi, value: 'Revolver' },
    { pattern: /\b(automatic|auto|full auto)\b/gi, value: 'Automatic' },
  ];
  
  for (const { pattern, value } of actionPatterns) {
    const match = name.match(pattern);
    if (match) {
      return value;
    }
  }
  return null;
}

/**
 * Enhanced sight type extraction
 */
function extractSightType(name: string): string | null {
  const sightPatterns = [
    { pattern: /\b(iron sights|iron sight|irons)\b/gi, value: 'Iron Sights' },
    { pattern: /\b(red dot|rds|red-dot|dot)\b/gi, value: 'Red Dot' },
    { pattern: /\b(scope|scoped|optic)\b/gi, value: 'Scope' },
    { pattern: /\b(reflex|reflex sight|rfx)\b/gi, value: 'Reflex' },
    { pattern: /\b(holographic|holo|hologram)\b/gi, value: 'Holographic' },
    { pattern: /\b(open sights|open sight|open)\b/gi, value: 'Open Sights' },
    { pattern: /\b(peep sight|peep|aperture)\b/gi, value: 'Peep Sight' },
    { pattern: /\b(ghost ring|ghost rings)\b/gi, value: 'Ghost Ring' },
    { pattern: /\b(fiber optic|fiber optics|fo)\b/gi, value: 'Fiber Optic' },
    { pattern: /\b(night sights|night sight|tritium|trij)\b/gi, value: 'Night Sights' },
    { pattern: /\b(adjustable|adj|windage|elevation)\b/gi, value: 'Adjustable' },
    { pattern: /\b(fixed|fixed sight|non-adjustable)\b/gi, value: 'Fixed' },
    { pattern: /\b(flip up|flip-up|folding|buis)\b/gi, value: 'Flip Up' },
    { pattern: /\b(no sights|no sight|bare|optics ready)\b/gi, value: 'No Sights' },
    { pattern: /\b(picatinny|rail|weaver)\b/gi, value: 'Rail Mount' },
  ];
  
  for (const { pattern, value } of sightPatterns) {
    const match = name.match(pattern);
    if (match) {
      return value;
    }
  }
  return null;
}

/**
 * Extract all filter data from product name
 */
function extractAllFilters(name: string, department: string): FilterExtractionResult {
  return {
    barrelLength: extractBarrelLength(name),
    finish: extractFinish(name),
    frameSize: extractFrameSize(name, department),
    actionType: extractActionType(name),
    sightType: extractSightType(name)
  };
}

async function comprehensiveFilterExtraction() {
  try {
    console.log('🔍 Starting comprehensive filter extraction for ALL departments...');
    
    // Get all products that could have filter data
    const allProducts = await db.execute(sql`
      SELECT id, name, sku, department_number
      FROM products 
      WHERE name IS NOT NULL
      AND department_number IN ('01', '02', '03', '05', '06', '07', '08', '22', '24', '41', '42', '43')
      ORDER BY department_number, id
    `);
    
    console.log(`📊 Found ${allProducts.rows.length} products across all departments to process`);
    
    // Show breakdown by department
    const departmentCounts = {};
    allProducts.rows.forEach(product => {
      const dept = product.department_number || 'Unknown';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });
    
    console.log('\n📋 Products by department:');
    Object.entries(departmentCounts).forEach(([dept, count]) => {
      console.log(`   - Dept ${dept}: ${count} products`);
    });
    
    let processed = 0;
    let updated = 0;
    
    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < allProducts.rows.length; i += batchSize) {
      const batch = allProducts.rows.slice(i, i + batchSize);
      
      for (const product of batch) {
        const filters = extractAllFilters(product.name, product.department_number || '');
        
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
            WHERE id = ${product.id}
          `);
          updated++;
        }
        
        processed++;
        
        if (processed % 100 === 0) {
          console.log(`   ✅ Processed ${processed}/${allProducts.rows.length} products (${updated} updated)`);
        }
      }
    }
    
    console.log(`\n🎉 Comprehensive filter extraction completed:`);
    console.log(`   - Processed: ${processed} products`);
    console.log(`   - Updated: ${updated} products with filter data`);
    
    // Show final coverage statistics
    const finalStats = await db.execute(sql`
      SELECT 
        department_number,
        COUNT(*) as total,
        COUNT(barrel_length) as with_barrel_length,
        COUNT(finish) as with_finish,
        COUNT(frame_size) as with_frame_size,
        COUNT(action_type) as with_action_type,
        COUNT(sight_type) as with_sight_type
      FROM products 
      WHERE department_number IN ('01', '02', '03', '05', '06', '07', '08', '22', '24', '41', '42', '43')
      GROUP BY department_number
      ORDER BY department_number
    `);
    
    console.log(`\n📈 Final filter coverage by department:`);
    finalStats.rows.forEach(row => {
      const dept = row.department_number;
      const total = row.total;
      const barrel = row.with_barrel_length;
      const finish = row.with_finish;
      const frame = row.with_frame_size;
      const action = row.with_action_type;
      const sight = row.with_sight_type;
      
      console.log(`\nDept ${dept}: ${total} products`);
      console.log(`   - Barrel Length: ${barrel} (${(barrel/total*100).toFixed(1)}%)`);
      console.log(`   - Finish: ${finish} (${(finish/total*100).toFixed(1)}%)`);
      console.log(`   - Frame Size: ${frame} (${(frame/total*100).toFixed(1)}%)`);
      console.log(`   - Action Type: ${action} (${(action/total*100).toFixed(1)}%)`);
      console.log(`   - Sight Type: ${sight} (${(sight/total*100).toFixed(1)}%)`);
    });
    
  } catch (error: any) {
    console.error('❌ Error during comprehensive filter extraction:', error);
    throw error;
  }
}

// Run the extraction
comprehensiveFilterExtraction().catch(console.error);