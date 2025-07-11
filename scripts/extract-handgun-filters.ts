/**
 * Extract Handgun Filter Data from RSR Product Names
 * Extracts barrel length, finish, frame size, action type, and sight type
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";

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
      return `${length}"`;
    }
  }
  return null;
}

/**
 * Extract finish/color from product name
 */
function extractFinish(name: string): string | null {
  const finishes = [
    'FDE', 'Flat Dark Earth',
    'BLACK', 'BLK', 'Midnight Black',
    'STAINLESS', 'SS', 'Stainless Steel',
    'GOLD', 'GLD', 'Gold',
    'SILVER', 'SLV', 'Silver',
    'BRONZE', 'BRZ', 'Bronze',
    'OD GREEN', 'ODG', 'Olive Drab',
    'TUNGSTEN', 'TGS', 'Tungsten',
    'CERAKOTE', 'CERAMIC',
    'NICKEL', 'NI', 'Nickel',
    'CHROME', 'CHR', 'Chrome',
    'TITANIUM', 'TI', 'Titanium',
    'COYOTE', 'COY', 'Coyote',
    'TAN', 'Tan',
    'GREY', 'GRAY', 'GRY', 'Gray',
    'WHITE', 'WHT', 'White',
    'RED', 'RED', 'Red',
    'BLUE', 'BLU', 'Blue',
    'GREEN', 'GRN', 'Green',
    'PURPLE', 'PUR', 'Purple'
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
      if (finish.includes('GREY') || finish.includes('GRAY')) return 'Gray';
      if (finish.includes('WHITE') || finish.includes('WHT')) return 'White';
      if (finish.includes('RED')) return 'Red';
      if (finish.includes('BLUE') || finish.includes('BLU')) return 'Blue';
      if (finish.includes('GREEN') || finish.includes('GRN')) return 'Green';
      if (finish.includes('PURPLE') || finish.includes('PUR')) return 'Purple';
      return finish;
    }
  }
  return null;
}

/**
 * Extract frame size from product name
 */
function extractFrameSize(name: string): string | null {
  const upperName = name.toUpperCase();
  
  // Check for specific size indicators
  if (upperName.includes('FULL SIZE') || upperName.includes('FULLSIZE')) return 'Full Size';
  if (upperName.includes('COMPACT') || upperName.includes('CMP')) return 'Compact';
  if (upperName.includes('SUBCOMPACT') || upperName.includes('SUB')) return 'Subcompact';
  if (upperName.includes('MICRO') || upperName.includes('NANO')) return 'Micro';
  if (upperName.includes('OFFICER') || upperName.includes('OFF')) return 'Officer';
  if (upperName.includes('COMMANDER') || upperName.includes('CMD')) return 'Commander';
  if (upperName.includes('GOVERNMENT') || upperName.includes('GOV')) return 'Government';
  
  // Infer from barrel length if available
  const barrelLength = extractBarrelLength(name);
  if (barrelLength) {
    const length = parseFloat(barrelLength);
    if (length <= 3.0) return 'Micro';
    if (length <= 3.5) return 'Subcompact';
    if (length <= 4.0) return 'Compact';
    if (length >= 5.0) return 'Full Size';
  }
  
  return null;
}

/**
 * Extract action type from product name
 */
function extractActionType(name: string): string | null {
  const upperName = name.toUpperCase();
  
  if (upperName.includes('DA/SA') || upperName.includes('DASA')) return 'DA/SA';
  if (upperName.includes('STRIKER') || upperName.includes('STRIKE')) return 'Striker';
  if (upperName.includes('SINGLE ACTION') || upperName.includes('SA')) return 'Single Action';
  if (upperName.includes('DOUBLE ACTION') || upperName.includes('DA')) return 'Double Action';
  if (upperName.includes('SAO')) return 'Single Action';
  if (upperName.includes('DAO')) return 'Double Action';
  
  // Infer from manufacturer patterns
  if (upperName.includes('GLOCK') || upperName.includes('S&W SHIELD') || upperName.includes('SIG P320')) return 'Striker';
  if (upperName.includes('1911') || upperName.includes('COLT') || upperName.includes('KIMBER')) return 'Single Action';
  if (upperName.includes('SIG P226') || upperName.includes('BERETTA') || upperName.includes('CZ')) return 'DA/SA';
  
  return null;
}

/**
 * Extract sight type from product name
 */
function extractSightType(name: string): string | null {
  const upperName = name.toUpperCase();
  
  if (upperName.includes('NIGHT SIGHT') || upperName.includes('NS') || upperName.includes('TRIJICON')) return 'Night Sights';
  if (upperName.includes('FIBER OPTIC') || upperName.includes('FO')) return 'Fiber Optic';
  if (upperName.includes('LASER') || upperName.includes('LSR')) return 'Laser';
  if (upperName.includes('RED DOT') || upperName.includes('RDS') || upperName.includes('ROMEO')) return 'Red Dot';
  if (upperName.includes('OPTICS READY') || upperName.includes('OR') || upperName.includes('MOS')) return 'Optics Ready';
  if (upperName.includes('IRON SIGHT') || upperName.includes('IRONS')) return 'Iron Sights';
  if (upperName.includes('ADJUSTABLE') || upperName.includes('ADJ')) return 'Adjustable';
  if (upperName.includes('FIXED')) return 'Fixed';
  
  return 'Standard';
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

/**
 * Main extraction function
 */
async function extractHandgunFilters() {
  console.log('🔍 Starting handgun filter extraction...');
  
  try {
    // Get all handgun products
    const handguns = await db.select().from(products).where(eq(products.departmentNumber, '01'));
    console.log(`📊 Found ${handguns.length} handgun products`);
    
    let updated = 0;
    const batchSize = 100;
    
    for (let i = 0; i < handguns.length; i += batchSize) {
      const batch = handguns.slice(i, i + batchSize);
      
      for (const product of batch) {
        const filters = extractAllFilters(product.name);
        
        await db.update(products)
          .set({
            barrelLength: filters.barrelLength,
            finish: filters.finish,
            frameSize: filters.frameSize,
            actionType: filters.actionType,
            sightType: filters.sightType
          })
          .where(eq(products.id, product.id));
        
        updated++;
      }
      
      console.log(`✅ Processed ${Math.min(i + batchSize, handguns.length)}/${handguns.length} products`);
    }
    
    console.log(`🎯 Successfully updated ${updated} handgun products with filter data`);
    
    // Show statistics
    const stats = await db.select().from(products).where(eq(products.departmentNumber, '01'));
    const barrelLengths = [...new Set(stats.map(p => p.barrelLength).filter(Boolean))];
    const finishes = [...new Set(stats.map(p => p.finish).filter(Boolean))];
    const frameSizes = [...new Set(stats.map(p => p.frameSize).filter(Boolean))];
    const actionTypes = [...new Set(stats.map(p => p.actionType).filter(Boolean))];
    const sightTypes = [...new Set(stats.map(p => p.sightType).filter(Boolean))];
    
    console.log(`📈 Filter Statistics:`);
    console.log(`   Barrel Lengths: ${barrelLengths.length} options (${barrelLengths.slice(0, 10).join(', ')}...)`);
    console.log(`   Finishes: ${finishes.length} options (${finishes.slice(0, 10).join(', ')}...)`);
    console.log(`   Frame Sizes: ${frameSizes.length} options (${frameSizes.join(', ')})`);
    console.log(`   Action Types: ${actionTypes.length} options (${actionTypes.join(', ')})`);
    console.log(`   Sight Types: ${sightTypes.length} options (${sightTypes.join(', ')})`);
    
  } catch (error) {
    console.error('❌ Error extracting handgun filters:', error);
    throw error;
  }
}

// Run the extraction
extractHandgunFilters().catch(console.error);