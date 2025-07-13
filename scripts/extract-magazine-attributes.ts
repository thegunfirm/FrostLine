/**
 * Extract Magazine Attributes
 * Extract caliber, capacity, finish, and frame size from magazine product names
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function extractMagazineAttributes() {
  console.log('🔍 Starting magazine attribute extraction...');
  
  try {
    // Get all magazine products (department 10)
    const magazines = await db.select()
      .from(products)
      .where(eq(products.departmentNumber, '10'));
    
    console.log(`📊 Found ${magazines.length} magazine products`);
    
    let updatedCount = 0;
    let processedCount = 0;
    
    for (const magazine of magazines) {
      processedCount++;
      
      const name = magazine.name.toLowerCase();
      let hasUpdates = false;
      const updates: any = {};
      
      // Extract caliber
      if (!magazine.caliber) {
        const caliber = extractCaliber(name);
        if (caliber) {
          updates.caliber = caliber;
          hasUpdates = true;
        }
      }
      
      // Extract capacity
      if (!magazine.capacity) {
        const capacity = extractCapacity(name);
        if (capacity) {
          updates.capacity = capacity;
          hasUpdates = true;
        }
      }
      
      // Extract finish
      if (!magazine.finish) {
        const finish = extractFinish(name);
        if (finish) {
          updates.finish = finish;
          hasUpdates = true;
        }
      }
      
      // Extract frame size
      if (!magazine.frameSize) {
        const frameSize = extractFrameSize(name);
        if (frameSize) {
          updates.frameSize = frameSize;
          hasUpdates = true;
        }
      }
      
      // Update if we have changes
      if (hasUpdates) {
        await db.update(products)
          .set(updates)
          .where(eq(products.id, magazine.id));
        
        updatedCount++;
        
        if (updatedCount % 100 === 0) {
          console.log(`✅ Updated ${updatedCount} magazines so far...`);
        }
      }
      
      if (processedCount % 200 === 0) {
        console.log(`📊 Processed ${processedCount}/${magazines.length} magazines`);
      }
    }
    
    console.log(`✅ Magazine attribute extraction complete!`);
    console.log(`📊 Updated ${updatedCount} magazines with new attributes`);
    
  } catch (error) {
    console.error('❌ Error extracting magazine attributes:', error);
  }
}

/**
 * Extract caliber from magazine name
 */
function extractCaliber(name: string): string | null {
  const caliberPatterns = [
    // Common handgun calibers
    { pattern: /\b(9mm|9 mm)\b/i, caliber: '9mm' },
    { pattern: /\b(45|\.45|45 acp|\.45 acp)\b/i, caliber: '45 ACP' },
    { pattern: /\b(40|\.40|40 s&w|\.40 s&w)\b/i, caliber: '40 S&W' },
    { pattern: /\b(380|\.380|380 acp|\.380 acp)\b/i, caliber: '380 ACP' },
    { pattern: /\b(38|\.38|38 spl|\.38 spl|38 special|\.38 special)\b/i, caliber: '38 Special' },
    { pattern: /\b(357|\.357|357 mag|\.357 mag|357 magnum|\.357 magnum)\b/i, caliber: '357 Magnum' },
    { pattern: /\b(10mm|10 mm)\b/i, caliber: '10mm' },
    { pattern: /\b(44|\.44|44 mag|\.44 mag|44 magnum|\.44 magnum)\b/i, caliber: '44 Magnum' },
    { pattern: /\b(22|\.22|22 lr|\.22 lr)\b/i, caliber: '22 LR' },
    { pattern: /\b(32|\.32|32 acp|\.32 acp)\b/i, caliber: '32 ACP' },
    { pattern: /\b(25|\.25|25 acp|\.25 acp)\b/i, caliber: '25 ACP' },
    
    // Rifle calibers
    { pattern: /\b(223|\.223|223 rem|\.223 rem|223 remington|\.223 remington)\b/i, caliber: '223 Remington' },
    { pattern: /\b(5\.56|556|5.56 nato|556 nato)\b/i, caliber: '5.56 NATO' },
    { pattern: /\b(308|\.308|308 win|\.308 win|308 winchester|\.308 winchester)\b/i, caliber: '308 Winchester' },
    { pattern: /\b(7\.62|762|7.62x39|762x39)\b/i, caliber: '7.62x39' },
    { pattern: /\b(300|\.300|300 blk|\.300 blk|300 blackout|\.300 blackout|300 aac|\.300 aac)\b/i, caliber: '300 BLK' },
    { pattern: /\b(6\.5|65|6.5 creedmoor|65 creedmoor)\b/i, caliber: '6.5 Creedmoor' },
    { pattern: /\b(30-06|3006|30 06)\b/i, caliber: '30-06' },
    { pattern: /\b(270|\.270|270 win|\.270 win)\b/i, caliber: '270 Winchester' },
    { pattern: /\b(243|\.243|243 win|\.243 win)\b/i, caliber: '243 Winchester' },
    
    // Shotgun calibers
    { pattern: /\b(12|12 ga|12 gauge|12-gauge)\b/i, caliber: '12 Gauge' },
    { pattern: /\b(20|20 ga|20 gauge|20-gauge)\b/i, caliber: '20 Gauge' },
    { pattern: /\b(410|\.410|410 ga|\.410 ga)\b/i, caliber: '410 Gauge' },
    { pattern: /\b(28|28 ga|28 gauge|28-gauge)\b/i, caliber: '28 Gauge' },
    { pattern: /\b(16|16 ga|16 gauge|16-gauge)\b/i, caliber: '16 Gauge' }
  ];
  
  for (const { pattern, caliber } of caliberPatterns) {
    if (pattern.test(name)) {
      return caliber;
    }
  }
  
  return null;
}

/**
 * Extract capacity from magazine name
 */
function extractCapacity(name: string): number | null {
  const capacityPatterns = [
    /\b(\d+)\s*rd\b/i,           // "10rd", "15 rd"
    /\b(\d+)\s*round\b/i,        // "10round", "15 round"
    /\b(\d+)\s*rds\b/i,          // "10rds", "15 rds"
    /\b(\d+)\s*shot\b/i,         // "10shot", "15 shot"
    /\b(\d+)\s*capacity\b/i,     // "10capacity", "15 capacity"
    /\b(\d+)\s*r\b/i,            // "10r", "15r"
    /\b(\d+)\+\d+\b/i,           // "10+1", "15+1"
    /\b(\d+)\s*cartridge\b/i,    // "10cartridge", "15 cartridge"
    /\b(\d+)\s*mag\b/i,          // "10mag", "15 mag"
    /\b(\d+)\s*count\b/i         // "10count", "15 count"
  ];
  
  for (const pattern of capacityPatterns) {
    const match = name.match(pattern);
    if (match) {
      const capacity = parseInt(match[1]);
      if (capacity >= 1 && capacity <= 200) { // Reasonable range
        return capacity;
      }
    }
  }
  
  return null;
}

/**
 * Extract finish from magazine name
 */
function extractFinish(name: string): string | null {
  const finishPatterns = [
    { pattern: /\b(black|blk|bk)\b/i, finish: 'Black' },
    { pattern: /\b(stainless|ss|stainless steel|stnls)\b/i, finish: 'Stainless Steel' },
    { pattern: /\b(fde|flat dark earth|dark earth)\b/i, finish: 'FDE' },
    { pattern: /\b(od|od green|olive drab|olive)\b/i, finish: 'OD Green' },
    { pattern: /\b(tan|desert tan|coyote tan)\b/i, finish: 'Tan' },
    { pattern: /\b(gray|grey|gry)\b/i, finish: 'Gray' },
    { pattern: /\b(blue|blu)\b/i, finish: 'Blue' },
    { pattern: /\b(bronze|brz)\b/i, finish: 'Bronze' },
    { pattern: /\b(nickel|nkl|nick)\b/i, finish: 'Nickel' },
    { pattern: /\b(clear|transparent|clr)\b/i, finish: 'Clear' },
    { pattern: /\b(red|rd)\b/i, finish: 'Red' },
    { pattern: /\b(pink|pnk)\b/i, finish: 'Pink' },
    { pattern: /\b(purple|prpl)\b/i, finish: 'Purple' },
    { pattern: /\b(yellow|yel)\b/i, finish: 'Yellow' },
    { pattern: /\b(green|grn)\b/i, finish: 'Green' },
    { pattern: /\b(white|wht)\b/i, finish: 'White' },
    { pattern: /\b(silver|slv)\b/i, finish: 'Silver' },
    { pattern: /\b(gold|gld)\b/i, finish: 'Gold' },
    { pattern: /\b(titanium|ti)\b/i, finish: 'Titanium' },
    { pattern: /\b(carbon|carbon fiber|cf)\b/i, finish: 'Carbon Fiber' }
  ];
  
  for (const { pattern, finish } of finishPatterns) {
    if (pattern.test(name)) {
      return finish;
    }
  }
  
  return null;
}

/**
 * Extract frame size from magazine name
 */
function extractFrameSize(name: string): string | null {
  const frameSizePatterns = [
    { pattern: /\b(full|full size|full-size)\b/i, frameSize: 'Full Size' },
    { pattern: /\b(compact|comp)\b/i, frameSize: 'Compact' },
    { pattern: /\b(subcompact|sub|subcomp|sub-compact)\b/i, frameSize: 'Subcompact' },
    { pattern: /\b(micro|mcr)\b/i, frameSize: 'Micro' },
    { pattern: /\b(carry|crry)\b/i, frameSize: 'Carry' },
    { pattern: /\b(commander|cmd)\b/i, frameSize: 'Commander' },
    { pattern: /\b(officer|off)\b/i, frameSize: 'Officer' },
    { pattern: /\b(government|gov)\b/i, frameSize: 'Government' },
    { pattern: /\b(standard|std)\b/i, frameSize: 'Standard' },
    { pattern: /\b(match|mch)\b/i, frameSize: 'Match' },
    { pattern: /\b(tactical|tac)\b/i, frameSize: 'Tactical' },
    { pattern: /\b(competition|comp)\b/i, frameSize: 'Competition' },
    { pattern: /\b(long|lng)\b/i, frameSize: 'Long' },
    { pattern: /\b(short|sht)\b/i, frameSize: 'Short' },
    { pattern: /\b(extended|ext)\b/i, frameSize: 'Extended' }
  ];
  
  for (const { pattern, frameSize } of frameSizePatterns) {
    if (pattern.test(name)) {
      return frameSize;
    }
  }
  
  return null;
}

// Run the extraction
extractMagazineAttributes();