/**
 * Complete Filter Solution
 * Comprehensive filter extraction and Algolia sync for all categories
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { algoliasearch } from 'algoliasearch';

if (!process.env.ALGOLIA_APP_ID || !process.env.ALGOLIA_API_KEY) {
  throw new Error('Missing Algolia credentials');
}

const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);

// Enhanced filter extraction for all product types
function extractFilters(name: string, department: string) {
  const filters = {
    barrelLength: null as string | null,
    finish: null as string | null,
    frameSize: null as string | null,
    actionType: null as string | null,
    sightType: null as string | null
  };
  
  // Barrel length extraction - works for all firearm types
  const barrelPatterns = [
    /(\d+(?:\.\d+)?)\s*["″'']/g,
    /(\d+(?:\.\d+)?)\s*inch/gi,
    /(\d+(?:\.\d+)?)\s*in\b/gi,
    /(\d+(?:\.\d+)?)\s*-?\s*inch/gi,
    /\b(\d+(?:\.\d+)?)\s*"\s*(?:barrel|bbl)/gi,
    /(?:barrel|bbl)\s*(\d+(?:\.\d+)?)\s*"/gi,
    /(\d+(?:\.\d+)?)\s*"?\s*(?:barrel|bbl)/gi,
  ];
  
  for (const pattern of barrelPatterns) {
    const matches = Array.from(name.matchAll(pattern));
    if (matches.length > 0) {
      for (const match of matches) {
        const length = parseFloat(match[1]);
        if (length >= 2 && length <= 50) {
          filters.barrelLength = `${length}"`;
          break;
        }
      }
    }
    if (filters.barrelLength) break;
  }
  
  // Finish extraction - comprehensive patterns
  const finishPatterns = [
    { pattern: /\b(?:black|blk|matte black|matt black|flat black|anodized black)\b/gi, value: 'Black' },
    { pattern: /\b(?:stainless|ss|stainless steel|stnls|stainless finish)\b/gi, value: 'Stainless Steel' },
    { pattern: /\b(?:od green|odg|olive drab|olive green|olive)\b/gi, value: 'OD Green' },
    { pattern: /\b(?:fde|flat dark earth|dark earth|earth|desert)\b/gi, value: 'FDE' },
    { pattern: /\b(?:bronze|burnt bronze|brz|bronze finish)\b/gi, value: 'Bronze' },
    { pattern: /\b(?:tungsten|gray|grey|gunmetal|titanium)\b/gi, value: 'Gray' },
    { pattern: /\b(?:tan|desert tan|sand|coyote tan|khaki)\b/gi, value: 'Tan' },
    { pattern: /\b(?:coyote|coyote brown|coy|brown)\b/gi, value: 'Coyote' },
    { pattern: /\b(?:blue|blued|royal blue|navy)\b/gi, value: 'Blue' },
    { pattern: /\b(?:nickel|nickel plated|nkl|chrome|chromed)\b/gi, value: 'Nickel' },
    { pattern: /\b(?:cerakote|cerakoted|cera|ceramic)\b/gi, value: 'Cerakote' },
    { pattern: /\b(?:anodized|hard anodized|ano|type iii)\b/gi, value: 'Anodized' },
    { pattern: /\b(?:parkerized|parkerizing|park)\b/gi, value: 'Parkerized' },
    { pattern: /\b(?:camouflage|camo|woodland|multicam|realtree|hunting camo)\b/gi, value: 'Camouflage' },
    { pattern: /\b(?:white|wht|arctic white)\b/gi, value: 'White' },
    { pattern: /\b(?:red|crimson|cardinal)\b/gi, value: 'Red' },
    { pattern: /\b(?:green|grn|forest green)\b/gi, value: 'Green' },
    { pattern: /\b(?:carbon fiber|carbon|cf|carbon black)\b/gi, value: 'Carbon Fiber' },
    { pattern: /\b(?:polymer|poly|synthetic)\b/gi, value: 'Polymer' },
    { pattern: /\b(?:wood|wooden|walnut|maple|hardwood)\b/gi, value: 'Wood' },
    { pattern: /\b(?:aluminum|alloy|al|billet)\b/gi, value: 'Aluminum' },
  ];
  
  for (const { pattern, value } of finishPatterns) {
    if (pattern.test(name)) {
      filters.finish = value;
      break;
    }
  }
  
  // Frame size - department specific
  let frameSizePatterns = [];
  if (department === '01') { // Handguns
    frameSizePatterns = [
      { pattern: /\b(?:full size|full-size|fullsize|full)\b/gi, value: 'Full Size' },
      { pattern: /\b(?:compact|compct|comp)\b/gi, value: 'Compact' },
      { pattern: /\b(?:subcompact|sub-compact|subcomp)\b/gi, value: 'Subcompact' },
      { pattern: /\b(?:micro|micro-compact|ultra-compact)\b/gi, value: 'Micro' },
      { pattern: /\b(?:standard|std|regular)\b/gi, value: 'Standard' },
    ];
  } else if (department === '05') { // Rifles
    frameSizePatterns = [
      { pattern: /\b(?:rifle|standard rifle|full rifle)\b/gi, value: 'Rifle' },
      { pattern: /\b(?:carbine|carb|compact rifle)\b/gi, value: 'Carbine' },
      { pattern: /\b(?:sbr|short barrel rifle|short-barrel rifle)\b/gi, value: 'SBR' },
      { pattern: /\b(?:pistol|ar pistol|rifle pistol)\b/gi, value: 'Pistol' },
      { pattern: /\b(?:tactical|tac|operator|combat)\b/gi, value: 'Tactical' },
      { pattern: /\b(?:precision|prec|target|match|competition)\b/gi, value: 'Precision' },
      { pattern: /\b(?:hunting|hunt|field|sporting)\b/gi, value: 'Hunting' },
      { pattern: /\b(?:scout|patrol|recce)\b/gi, value: 'Scout' },
      { pattern: /\b(?:standard|std|regular|basic)\b/gi, value: 'Standard' },
    ];
  }
  
  for (const { pattern, value } of frameSizePatterns) {
    if (pattern.test(name)) {
      filters.frameSize = value;
      break;
    }
  }
  
  // Action type extraction
  const actionPatterns = [
    { pattern: /\b(?:semi-auto|semi auto|semiauto|sa|auto)\b/gi, value: 'Semi-Auto' },
    { pattern: /\b(?:bolt action|bolt-action|bolt|manual)\b/gi, value: 'Bolt Action' },
    { pattern: /\b(?:lever action|lever-action|lever)\b/gi, value: 'Lever Action' },
    { pattern: /\b(?:pump action|pump-action|pump|slide action)\b/gi, value: 'Pump Action' },
    { pattern: /\b(?:single shot|single-shot|single)\b/gi, value: 'Single Shot' },
    { pattern: /\b(?:break action|break-action|break)\b/gi, value: 'Break Action' },
    { pattern: /\b(?:gas operated|gas-operated|gas)\b/gi, value: 'Gas Operated' },
    { pattern: /\b(?:straight pull|straight-pull)\b/gi, value: 'Straight Pull' },
    { pattern: /\b(?:double action|double-action|da)\b/gi, value: 'Double Action' },
    { pattern: /\b(?:striker fired|striker-fired|striker)\b/gi, value: 'Striker Fired' },
    { pattern: /\b(?:hammer fired|hammer-fired|hammer)\b/gi, value: 'Hammer Fired' },
    { pattern: /\b(?:revolver|rev)\b/gi, value: 'Revolver' },
  ];
  
  for (const { pattern, value } of actionPatterns) {
    if (pattern.test(name)) {
      filters.actionType = value;
      break;
    }
  }
  
  // Sight type extraction
  const sightPatterns = [
    { pattern: /\b(?:iron sights|iron sight|irons|metallic sights)\b/gi, value: 'Iron Sights' },
    { pattern: /\b(?:scope|scoped|optic|riflescope)\b/gi, value: 'Scope' },
    { pattern: /\b(?:red dot|rds|red-dot|dot sight)\b/gi, value: 'Red Dot' },
    { pattern: /\b(?:reflex|reflex sight|rfx)\b/gi, value: 'Reflex' },
    { pattern: /\b(?:holographic|holo|hologram)\b/gi, value: 'Holographic' },
    { pattern: /\b(?:open sights|open sight|open|notch)\b/gi, value: 'Open Sights' },
    { pattern: /\b(?:peep sight|peep|aperture|ghost ring)\b/gi, value: 'Peep Sight' },
    { pattern: /\b(?:fiber optic|fiber optics|fo|fiber)\b/gi, value: 'Fiber Optic' },
    { pattern: /\b(?:night sights|night sight|tritium|trij)\b/gi, value: 'Night Sights' },
    { pattern: /\b(?:adjustable|adj|windage|elevation)\b/gi, value: 'Adjustable' },
    { pattern: /\b(?:fixed|fixed sight|non-adjustable)\b/gi, value: 'Fixed' },
    { pattern: /\b(?:flip up|flip-up|folding|buis|backup)\b/gi, value: 'Flip Up' },
    { pattern: /\b(?:no sights|no sight|bare|optics ready|ready)\b/gi, value: 'No Sights' },
    { pattern: /\b(?:picatinny|rail|weaver|scope base)\b/gi, value: 'Rail Mount' },
  ];
  
  for (const { pattern, value } of sightPatterns) {
    if (pattern.test(name)) {
      filters.sightType = value;
      break;
    }
  }
  
  return filters;
}

async function completeFilterSolution() {
  try {
    console.log('🔍 Starting complete filter solution...');
    
    // Phase 1: Extract filters for all applicable departments
    const targetDepartments = ['01', '05', '06', '07', '08', '22', '24', '41', '42', '43'];
    
    for (const dept of targetDepartments) {
      console.log(`\n📊 Processing Department ${dept}...`);
      
      const products = await db.execute(sql`
        SELECT id, name, sku, department_number
        FROM products 
        WHERE department_number = ${dept}
        AND name IS NOT NULL
        ORDER BY id
      `);
      
      console.log(`   Found ${products.rows.length} products`);
      
      let updated = 0;
      const batchSize = 100;
      
      for (let i = 0; i < products.rows.length; i += batchSize) {
        const batch = products.rows.slice(i, i + batchSize);
        
        for (const product of batch) {
          const filters = extractFilters(product.name, product.department_number);
          
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
        }
        
        if ((i + batchSize) % 500 === 0) {
          console.log(`     Processed ${i + batchSize}/${products.rows.length} (${updated} updated)`);
        }
      }
      
      console.log(`   ✅ Department ${dept}: ${updated} products updated with filter data`);
    }
    
    // Phase 2: Get all products with filter data and sync to Algolia
    console.log('\n🔄 Syncing filter data to Algolia...');
    
    const allProductsWithFilters = await db.execute(sql`
      SELECT 
        sku,
        barrel_length,
        finish,
        frame_size,
        action_type,
        sight_type,
        caliber,
        capacity,
        new_item,
        internal_special,
        drop_shippable,
        department_number
      FROM products 
      WHERE sku IS NOT NULL
      AND (
        barrel_length IS NOT NULL OR 
        finish IS NOT NULL OR 
        frame_size IS NOT NULL OR 
        action_type IS NOT NULL OR 
        sight_type IS NOT NULL OR
        caliber IS NOT NULL OR
        capacity IS NOT NULL
      )
      ORDER BY department_number, sku
    `);
    
    console.log(`📊 Found ${allProductsWithFilters.rows.length} products with filter data`);
    
    // Sync to Algolia in batches
    const algoliaUpdates = [];
    for (const product of allProductsWithFilters.rows) {
      algoliaUpdates.push({
        objectID: product.sku,
        barrelLength: product.barrel_length,
        finish: product.finish,
        frameSize: product.frame_size,
        actionType: product.action_type,
        sightType: product.sight_type,
        caliber: product.caliber,
        capacity: product.capacity,
        newItem: product.new_item || false,
        internalSpecial: product.internal_special || false,
        dropShippable: product.drop_shippable !== false
      });
    }
    
    // Send to Algolia in batches of 500
    const algoliaaBatchSize = 500;
    let algoliaSynced = 0;
    
    for (let i = 0; i < algoliaUpdates.length; i += algoliaaBatchSize) {
      const batch = algoliaUpdates.slice(i, i + algoliaaBatchSize);
      
      await client.partialUpdateObjects({
        indexName: 'products',
        objects: batch
      });
      
      algoliaSynced += batch.length;
      console.log(`   ✅ Algolia sync: ${algoliaSynced}/${algoliaUpdates.length} products`);
      
      // Small delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Phase 3: Generate comprehensive statistics
    console.log('\n📈 Final Filter Coverage Statistics:');
    
    const finalCoverage = await db.execute(sql`
      SELECT 
        department_number,
        COUNT(*) as total_products,
        COUNT(barrel_length) as with_barrel_length,
        COUNT(finish) as with_finish,
        COUNT(frame_size) as with_frame_size,
        COUNT(action_type) as with_action_type,
        COUNT(sight_type) as with_sight_type,
        COUNT(caliber) as with_caliber,
        COUNT(capacity) as with_capacity
      FROM products 
      WHERE department_number IN ('01', '05', '06', '07', '08', '22', '24', '41', '42', '43')
      GROUP BY department_number
      ORDER BY department_number
    `);
    
    let totalFilteredProducts = 0;
    
    finalCoverage.rows.forEach(row => {
      const dept = row.department_number;
      const total = row.total_products;
      const withAnyFilter = Math.max(
        row.with_barrel_length || 0,
        row.with_finish || 0,
        row.with_frame_size || 0,
        row.with_action_type || 0,
        row.with_sight_type || 0,
        row.with_caliber || 0,
        row.with_capacity || 0
      );
      
      totalFilteredProducts += withAnyFilter;
      
      console.log(`\nDepartment ${dept}: ${total} products`);
      console.log(`   - Barrel Length: ${row.with_barrel_length} (${(row.with_barrel_length/total*100).toFixed(1)}%)`);
      console.log(`   - Finish: ${row.with_finish} (${(row.with_finish/total*100).toFixed(1)}%)`);
      console.log(`   - Frame Size: ${row.with_frame_size} (${(row.with_frame_size/total*100).toFixed(1)}%)`);
      console.log(`   - Action Type: ${row.with_action_type} (${(row.with_action_type/total*100).toFixed(1)}%)`);
      console.log(`   - Sight Type: ${row.with_sight_type} (${(row.with_sight_type/total*100).toFixed(1)}%)`);
      console.log(`   - Caliber: ${row.with_caliber} (${(row.with_caliber/total*100).toFixed(1)}%)`);
      console.log(`   - Capacity: ${row.with_capacity} (${(row.with_capacity/total*100).toFixed(1)}%)`);
    });
    
    console.log(`\n🎉 Complete filter solution finished!`);
    console.log(`   - Total products with filter data: ${totalFilteredProducts}`);
    console.log(`   - Products synced to Algolia: ${algoliaSynced}`);
    console.log(`   - Filter coverage dramatically improved across all departments`);
    
  } catch (error: any) {
    console.error('❌ Error during complete filter solution:', error);
    throw error;
  }
}

// Run the complete solution
completeFilterSolution().catch(console.error);