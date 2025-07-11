/**
 * Extract Filter Data from All Applicable RSR Products
 * Extracts barrel length, finish, frame size, action type, and sight type for all firearm products
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";

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
    /(\d+(?:\.\d+)?)\s*["″'']/g,  // 4", 3.9", etc.
    /(\d+(?:\.\d+)?)\s*inch/gi,    // 4 inch, 3.9 inch
    /(\d+(?:\.\d+)?)\s*in\b/gi,    // 4 in, 3.9 in
  ];
  
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      const length = parseFloat(match[0].replace(/[^0-9.]/g, ''));
      if (length > 0 && length <= 50) { // Reasonable barrel length range
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
  const finishes = [
    'FDE', 'FLAT DARK EARTH',
    'BLACK', 'BLK', 'MIDNIGHT BLACK',
    'STAINLESS', 'SS', 'STAINLESS STEEL',
    'GOLD', 'GLD', 'GOLD',
    'SILVER', 'SLV', 'SILVER',
    'BRONZE', 'BRZ', 'BRONZE',
    'OD GREEN', 'ODG', 'OLIVE DRAB',
    'TUNGSTEN', 'TGS', 'TUNGSTEN',
    'CERAKOTE', 'CERAMIC',
    'NICKEL', 'NI', 'NICKEL',
    'CHROME', 'CHR', 'CHROME',
    'TITANIUM', 'TI', 'TITANIUM',
    'COYOTE', 'COY', 'COYOTE',
    'TAN', 'TAN',
    'GREY', 'GRAY', 'GRY', 'GRAY',
    'WHITE', 'WHT', 'WHITE',
    'RED', 'RED',
    'BLUE', 'BLU', 'BLUE',
    'GREEN', 'GRN', 'GREEN',
    'PURPLE', 'PUR', 'PURPLE',
    'PARKERIZED', 'PARK', 'PARKERIZED',
    'ANODIZED', 'ANOD', 'ANODIZED',
    'MATTE', 'MAT', 'MATTE',
    'SATIN', 'SAT', 'SATIN'
  ];
  
  const upperName = name.toUpperCase();
  for (const finish of finishes) {
    if (upperName.includes(finish)) {
      // Return standardized finish name
      if (finish.includes('FDE') || finish.includes('DARK EARTH')) return 'FDE';
      if (finish.includes('BLACK') || finish.includes('BLK')) return 'Black';
      if (finish.includes('STAINLESS') || finish.includes('SS')) return 'Stainless';
      if (finish.includes('GOLD') || finish.includes('GLD')) return 'Gold';
      if (finish.includes('SILVER') || finish.includes('SLV')) return 'Silver';
      if (finish.includes('BRONZE') || finish.includes('BRZ')) return 'Bronze';
      if (finish.includes('OD') || finish.includes('OLIVE')) return 'OD Green';
      if (finish.includes('TUNGSTEN') || finish.includes('TGS')) return 'Tungsten';
      if (finish.includes('CERAKOTE') || finish.includes('CERAMIC')) return 'Cerakote';
      if (finish.includes('NICKEL') || finish.includes('NI')) return 'Nickel';
      if (finish.includes('CHROME') || finish.includes('CHR')) return 'Chrome';
      if (finish.includes('TITANIUM') || finish.includes('TI')) return 'Titanium';
      if (finish.includes('COYOTE') || finish.includes('COY')) return 'Coyote';
      if (finish.includes('TAN')) return 'Tan';
      if (finish.includes('GREY') || finish.includes('GRAY') || finish.includes('GRY')) return 'Gray';
      if (finish.includes('WHITE') || finish.includes('WHT')) return 'White';
      if (finish.includes('RED')) return 'Red';
      if (finish.includes('BLUE') || finish.includes('BLU')) return 'Blue';
      if (finish.includes('GREEN') || finish.includes('GRN')) return 'Green';
      if (finish.includes('PURPLE') || finish.includes('PUR')) return 'Purple';
      if (finish.includes('PARKERIZED') || finish.includes('PARK')) return 'Parkerized';
      if (finish.includes('ANODIZED') || finish.includes('ANOD')) return 'Anodized';
      if (finish.includes('MATTE') || finish.includes('MAT')) return 'Matte';
      if (finish.includes('SATIN') || finish.includes('SAT')) return 'Satin';
      return finish;
    }
  }
  return null;
}

/**
 * Extract frame size from product name (for handguns) or stock type (for long guns)
 */
function extractFrameSize(name: string, department: string): string | null {
  if (department === '01') {
    // Handgun frame sizes
    const frameSizes = [
      'FULL SIZE', 'FULL-SIZE', 'FULLSIZE',
      'COMPACT', 'CMPT',
      'SUBCOMPACT', 'SUB-COMPACT', 'SUBCOM',
      'MICRO', 'MICRO-COMPACT',
      'COMMANDER', 'CMDR',
      'OFFICER', 'OFFICERS',
      'GOVERNMENT', 'GOVT',
      'CARRY', 'CONCEALED CARRY'
    ];
    
    const upperName = name.toUpperCase();
    for (const size of frameSizes) {
      if (upperName.includes(size)) {
        if (size.includes('FULL')) return 'Full Size';
        if (size.includes('COMPACT') && !size.includes('SUB')) return 'Compact';
        if (size.includes('SUBCOMPACT') || size.includes('SUB-COMPACT')) return 'Subcompact';
        if (size.includes('MICRO')) return 'Micro';
        if (size.includes('COMMANDER') || size.includes('CMDR')) return 'Commander';
        if (size.includes('OFFICER')) return 'Officer';
        if (size.includes('GOVERNMENT') || size.includes('GOVT')) return 'Government';
        if (size.includes('CARRY')) return 'Carry';
        return size;
      }
    }
  } else if (department === '05') {
    // Long gun stock types
    const stockTypes = [
      'ADJUSTABLE', 'ADJ',
      'COLLAPSIBLE', 'COLL',
      'FIXED', 'FXD',
      'FOLDING', 'FOLD',
      'TACTICAL', 'TAC',
      'TRADITIONAL', 'TRAD',
      'PISTOL GRIP', 'PG',
      'THUMBHOLE', 'TH'
    ];
    
    const upperName = name.toUpperCase();
    for (const stock of stockTypes) {
      if (upperName.includes(stock)) {
        if (stock.includes('ADJUSTABLE') || stock.includes('ADJ')) return 'Adjustable';
        if (stock.includes('COLLAPSIBLE') || stock.includes('COLL')) return 'Collapsible';
        if (stock.includes('FIXED') || stock.includes('FXD')) return 'Fixed';
        if (stock.includes('FOLDING') || stock.includes('FOLD')) return 'Folding';
        if (stock.includes('TACTICAL') || stock.includes('TAC')) return 'Tactical';
        if (stock.includes('TRADITIONAL') || stock.includes('TRAD')) return 'Traditional';
        if (stock.includes('PISTOL GRIP') || stock.includes('PG')) return 'Pistol Grip';
        if (stock.includes('THUMBHOLE') || stock.includes('TH')) return 'Thumbhole';
        return stock;
      }
    }
  }
  return null;
}

/**
 * Extract action type from product name
 */
function extractActionType(name: string): string | null {
  const actionTypes = [
    'STRIKER', 'STRIKER-FIRED',
    'SINGLE ACTION', 'SA', 'SINGLE-ACTION',
    'DOUBLE ACTION', 'DA', 'DOUBLE-ACTION',
    'DA/SA', 'DA-SA', 'DOUBLE/SINGLE',
    'BOLT ACTION', 'BOLT-ACTION',
    'SEMI-AUTO', 'SEMI AUTO', 'SEMIAUTO',
    'LEVER ACTION', 'LEVER-ACTION',
    'PUMP ACTION', 'PUMP-ACTION',
    'BREAK ACTION', 'BREAK-ACTION',
    'REVOLVER', 'REV'
  ];
  
  const upperName = name.toUpperCase();
  for (const action of actionTypes) {
    if (upperName.includes(action)) {
      if (action.includes('STRIKER')) return 'Striker';
      if (action.includes('SINGLE ACTION') || action === 'SA') return 'Single Action';
      if (action.includes('DOUBLE ACTION') || action === 'DA') return 'Double Action';
      if (action.includes('DA/SA') || action.includes('DA-SA')) return 'DA/SA';
      if (action.includes('BOLT ACTION') || action.includes('BOLT-ACTION')) return 'Bolt Action';
      if (action.includes('SEMI')) return 'Semi-Auto';
      if (action.includes('LEVER')) return 'Lever Action';
      if (action.includes('PUMP')) return 'Pump Action';
      if (action.includes('BREAK')) return 'Break Action';
      if (action.includes('REVOLVER') || action.includes('REV')) return 'Revolver';
      return action;
    }
  }
  return null;
}

/**
 * Extract sight type from product name
 */
function extractSightType(name: string): string | null {
  const sightTypes = [
    'NIGHT SIGHTS', 'NIGHT', 'TRITIUM',
    'FIBER OPTIC', 'FIBER', 'FO',
    'ADJUSTABLE', 'ADJ SIGHTS',
    'FIXED', 'FIXED SIGHTS',
    'OPTICS READY', 'OPTIC READY', 'OR',
    'RED DOT', 'REDDOT',
    'SCOPE', 'SCOPED',
    'IRON SIGHTS', 'IRONS',
    'PEEP SIGHTS', 'PEEP',
    'GHOST RING', 'GHOST',
    'STANDARD', 'STD SIGHTS'
  ];
  
  const upperName = name.toUpperCase();
  for (const sight of sightTypes) {
    if (upperName.includes(sight)) {
      if (sight.includes('NIGHT') || sight.includes('TRITIUM')) return 'Night Sights';
      if (sight.includes('FIBER') || sight.includes('FO')) return 'Fiber Optic';
      if (sight.includes('ADJUSTABLE') || sight.includes('ADJ')) return 'Adjustable';
      if (sight.includes('FIXED')) return 'Fixed';
      if (sight.includes('OPTICS READY') || sight.includes('OPTIC READY') || sight.includes('OR')) return 'Optics Ready';
      if (sight.includes('RED DOT') || sight.includes('REDDOT')) return 'Red Dot';
      if (sight.includes('SCOPE')) return 'Scope';
      if (sight.includes('IRON')) return 'Iron Sights';
      if (sight.includes('PEEP')) return 'Peep Sights';
      if (sight.includes('GHOST')) return 'Ghost Ring';
      if (sight.includes('STANDARD') || sight.includes('STD')) return 'Standard';
      return sight;
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

/**
 * Main extraction function - process all applicable products
 */
async function extractAllProductFilters() {
  try {
    console.log('🔍 Starting comprehensive filter extraction...');
    
    // Get all firearm products that could benefit from filters
    const applicableProducts = await db.execute(sql`
      SELECT 
        id, 
        name, 
        department_number,
        department_desc,
        barrel_length,
        finish,
        frame_size,
        action_type,
        sight_type
      FROM products 
      WHERE department_number IN ('01', '05', '06', '08', '41', '42', '43') 
      AND name IS NOT NULL
      ORDER BY department_number, id
    `);
    
    console.log(`📊 Found ${applicableProducts.rows.length} applicable products`);
    
    // Group by department for progress tracking
    const departmentCounts = {};
    for (const product of applicableProducts.rows) {
      const dept = product.department_number;
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    }
    
    console.log('📋 Products by department:');
    for (const [dept, count] of Object.entries(departmentCounts)) {
      console.log(`   - Dept ${dept}: ${count} products`);
    }
    
    let processed = 0;
    let updated = 0;
    const batchSize = 100;
    
    // Process in batches
    for (let i = 0; i < applicableProducts.rows.length; i += batchSize) {
      const batch = applicableProducts.rows.slice(i, i + batchSize);
      
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(applicableProducts.rows.length / batchSize)}...`);
      
      for (const product of batch) {
        try {
          const filters = extractAllFilters(product.name, product.department_number);
          
          // Only update if we extracted some data and it's different from current
          const needsUpdate = (
            (filters.barrelLength && filters.barrelLength !== product.barrel_length) ||
            (filters.finish && filters.finish !== product.finish) ||
            (filters.frameSize && filters.frameSize !== product.frame_size) ||
            (filters.actionType && filters.actionType !== product.action_type) ||
            (filters.sightType && filters.sightType !== product.sight_type)
          );
          
          if (needsUpdate) {
            await db.execute(sql`
              UPDATE products 
              SET 
                barrel_length = ${filters.barrelLength || product.barrel_length},
                finish = ${filters.finish || product.finish},
                frame_size = ${filters.frameSize || product.frame_size},
                action_type = ${filters.actionType || product.action_type},
                sight_type = ${filters.sightType || product.sight_type}
              WHERE id = ${product.id}
            `);
            updated++;
          }
          
          processed++;
          
          // Progress update every 50 products
          if (processed % 50 === 0) {
            console.log(`   ✅ Processed ${processed}/${applicableProducts.rows.length} products (${updated} updated)`);
          }
          
        } catch (error) {
          console.error(`❌ Error processing product ${product.id}:`, error);
        }
      }
      
      // Brief pause between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n🎉 Filter extraction complete!`);
    console.log(`📊 Final results:`);
    console.log(`   - Processed: ${processed} products`);
    console.log(`   - Updated: ${updated} products`);
    console.log(`   - Success rate: ${((updated / processed) * 100).toFixed(1)}%`);
    
    // Get final statistics
    const finalStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_products,
        COUNT(barrel_length) as with_barrel_length,
        COUNT(finish) as with_finish,
        COUNT(frame_size) as with_frame_size,
        COUNT(action_type) as with_action_type,
        COUNT(sight_type) as with_sight_type
      FROM products
      WHERE department_number IN ('01', '05', '06', '08', '41', '42', '43')
    `);
    
    const stats = finalStats.rows[0];
    console.log(`\n📈 Current filter data coverage:`);
    console.log(`   - Total applicable products: ${stats.total_products}`);
    console.log(`   - With barrel length: ${stats.with_barrel_length} (${((stats.with_barrel_length / stats.total_products) * 100).toFixed(1)}%)`);
    console.log(`   - With finish: ${stats.with_finish} (${((stats.with_finish / stats.total_products) * 100).toFixed(1)}%)`);
    console.log(`   - With frame size: ${stats.with_frame_size} (${((stats.with_frame_size / stats.total_products) * 100).toFixed(1)}%)`);
    console.log(`   - With action type: ${stats.with_action_type} (${((stats.with_action_type / stats.total_products) * 100).toFixed(1)}%)`);
    console.log(`   - With sight type: ${stats.with_sight_type} (${((stats.with_sight_type / stats.total_products) * 100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error('❌ Error during filter extraction:', error);
    throw error;
  }
}

// Run the extraction
extractAllProductFilters().catch(console.error);