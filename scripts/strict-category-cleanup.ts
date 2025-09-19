/**
 * Strict Category Cleanup Script
 * Removes non-firearm products from firearm categories
 * Enforces strict category boundaries
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

interface ProductAnalysis {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  manufacturer: string;
  currentCategory: string;
  suggestedCategory: string;
  reason: string;
  requiresFFL: boolean;
  isActualFirearm: boolean;
}

/**
 * Determines if a product is an actual firearm based on comprehensive analysis
 */
function isActualFirearm(product: any): boolean {
  const name = product.name?.toLowerCase() || '';
  const desc = product.description?.toLowerCase() || '';
  const manufacturer = product.manufacturer?.toLowerCase() || '';
  
  // Clear NON-firearm patterns (accessories, parts, etc.)
  const nonFirearmPatterns = [
    // Accessories
    /\bmagazine\b/i,
    /\bholster\b/i,
    /\b(gun\s+)?case\b/i,
    /\bsuppressor\b/i,
    /\bsilencer\b/i,
    /\bscope\b/i,
    /\boptic(s)?\b/i,
    /\bred\s*dot\b/i,
    /\bsight(s)?\b(?!.*\b(pistol|rifle|shotgun|revolver)\b)/i,
    /\btrigger(?!\s+(pull|weight))/i,
    /\bgrip(s)?\b(?!.*\b(pistol|rifle|shotgun)\b)/i,
    /\bmount(s|ing)?\b/i,
    /\bsling\b/i,
    /\bammo(unition)?\b/i,
    /\b(FMJ|JHP|JSP|TMJ|HP|SP|RN)\b/i, // Bullet types
    /\bcleaning\b/i,
    /\boil\b/i,
    /\bsolvent\b/i,
    /\bbrush(es)?\b/i,
    /\bkit\b(?!.*\b(pistol|rifle)\b)/i,
    /\blight(s)?\b(?!weight)/i,
    /\blaser\b/i,
    /\bthread\s+adapter\b/i,
    /\bstock\b(?!.*\b(rifle|shotgun)\b)/i,
    /\brail(s)?\b/i,
    /\bbarrel\b(?!.*\b(rifle|pistol|length)\b)/i,
    /\bupper\s+(receiver|assembly)\b/i,
    /\blower\s+(receiver|assembly)\b/i,
    /\bparts\b/i,
    /\bspring(s)?\b/i,
    /\bpin(s)?\b/i,
    /\bbolt\s+carrier\b/i,
    /\bbuffer\b/i,
    /\bhandguard\b/i,
    /\bbrace\b/i,
    /\bstrap\b/i,
    /\bbag\b/i,
    /\bpouch\b/i,
    /\btarget(s)?\b/i,
    /\bbipod\b/i,
    /\bswivel(s)?\b/i,
    /\badapter\b(?!.*\b(pistol|rifle)\b)/i,
    /\bconversion\b(?!.*\b(pistol|rifle)\b)/i,
    /\btool(s)?\b/i,
    /\bplug(s)?\b/i,
    /\bcap(s)?\b(?!.*\b(pistol|rifle)\b)/i,
    /\bcover(s)?\b/i,
    /\bprotector\b/i,
    /\bwrench\b/i,
    /\bgauge\b(?!.*\b(12|20|410|16|28)\b)/i, // Gauge that's not shotgun gauge
    /\bbore\s+sight/i,
    /\bsnap\s+cap/i,
    /\bdummy\s+round/i,
    /\bspeed\s+loader/i,
    /\bbrass\b(?!.*\b(rifle|pistol)\b)/i,
    /\bshell\s+holder/i,
    /\brecoil\s+pad/i,
    /\bbutt\s+(pad|plate)/i,
    /\bcheek\s+(rest|riser)/i,
    /\bflash\s+(hider|suppressor)/i,
    /\bmuzzle\s+(brake|device)/i,
    /\bcompensator\b/i
  ];
  
  // Check if it matches any non-firearm pattern
  for (const pattern of nonFirearmPatterns) {
    if (pattern.test(name)) {
      return false;
    }
  }
  
  // Ammunition-specific check (box quantities, grain weights)
  if (/\b\d+\s*(rd|rds|round|rounds|count|ct|box|pk)\b/i.test(name)) {
    if (/\b\d+\s*(gr|grain)\b/i.test(name)) {
      return false; // Ammunition
    }
  }
  
  // Clear firearm manufacturer + caliber patterns
  const firearmManufacturers = [
    'glock', 'sig', 'smith', 'wesson', 's&w', 'ruger', 'colt', 'beretta', 
    'springfield', 'remington', 'mossberg', 'savage', 'winchester', 'marlin',
    'browning', 'fn', 'hk', 'heckler', 'walther', 'cz', 'canik', 'taurus',
    'kimber', 'daniel defense', 'bcm', 'bravo company', 'lwrc', 'wilson combat',
    'staccato', 'dan wesson', 'nighthawk', 'ed brown', 'les baer', 'kahr',
    'kel-tec', 'keltec', 'sccy', 'hi-point', 'hipoint', 'diamondback', 'dpms',
    'bushmaster', 'windham', 'anderson', 'aero', 'palmetto', 'psa', 'radical',
    'delton', 'stag', 'rock river', 'cmmg', 'jp enterprises', 'noveske',
    'christensen', 'barrett', 'accuracy international', 'tikka', 'sako',
    'weatherby', 'henry', 'lever action', 'rossi', 'heritage', 'chiappa',
    'uberti', 'pietta', 'benelli', 'stoeger', 'franchi', 'cz-usa', 'czusa',
    'girsan', 'tisas', 'sar', 'century', 'zastava', 'arsenal', 'iwi',
    'tavor', 'galil', 'desert eagle', 'magnum research', 'charter arms',
    'taurus', 'bond arms', 'derringer', 'north american arms', 'naa'
  ];
  
  // Check if it's from a known firearm manufacturer
  const hasFirearmManufacturer = firearmManufacturers.some(mfg => 
    manufacturer.includes(mfg) || name.toLowerCase().includes(mfg)
  );
  
  // Caliber patterns that indicate firearms
  const caliberPattern = /\b(\d+mm|\d+\s*mm|9x19|\.?\d{2,3}\s*(acp|auto|mag|magnum|special|s&w|sw|lr|long rifle|short|win|winchester|rem|remington|wby|weatherby|creed|creedmoor|norma|prc|wsm|rum|ultra mag)|\.?\d{2,3}x\d{2,3})\b/i;
  
  // Shotgun gauge patterns
  const gaugePattern = /\b(12|20|410|16|28|10)\s*(ga|gauge)\b/i;
  
  // Clear firearm type indicators
  const firearmTypePattern = /\b(pistol|handgun|revolver|rifle|carbine|shotgun|firearm|sidearm|longgun|long gun)\b/i;
  
  // Model patterns that typically indicate firearms
  const firearmModelPattern = /\b(gen\s*[1-5]|gen[1-5]|m&p|xd|p320|p365|p226|p229|glock\s*\d+|g\d{2}|model\s*\d+|mk\s*(ii|iii|iv|v))\b/i;
  
  // Action type patterns
  const actionPattern = /\b(semi[\s-]?auto|automatic|bolt[\s-]?action|lever[\s-]?action|pump[\s-]?action|single[\s-]?action|double[\s-]?action|striker[\s-]?fired|da\/sa|sao|dao)\b/i;
  
  // Barrel length patterns (common for firearms)
  const barrelPattern = /\b\d+(\.\d+)?[\s-]?(inch|in|")\s*(barrel|bbl)\b/i;
  
  // Check positive indicators
  const hasCaliberOrGauge = caliberPattern.test(name) || gaugePattern.test(name);
  const hasFirearmType = firearmTypePattern.test(name);
  const hasFirearmModel = firearmModelPattern.test(name);
  const hasAction = actionPattern.test(name);
  const hasBarrelLength = barrelPattern.test(name);
  
  // Scoring system
  let score = 0;
  if (hasFirearmManufacturer) score += 3;
  if (hasCaliberOrGauge) score += 4;
  if (hasFirearmType) score += 5;
  if (hasFirearmModel) score += 2;
  if (hasAction) score += 2;
  if (hasBarrelLength) score += 2;
  
  // Special checks for specific patterns
  if (name.match(/\b(ar-15|ar15|ar-10|ar10|ak-47|ak47|ak-74|ak74|sks|m1|m14|m16|m4)\b/i)) {
    score += 5;
  }
  
  // Need at least a score of 5 to be considered a firearm
  return score >= 5;
}

/**
 * Determines the correct category for a product
 */
function determineCorrectCategory(product: any): string {
  const name = product.name?.toLowerCase() || '';
  const currentCategory = product.category;
  
  // If it's not an actual firearm, determine where it should go
  if (!isActualFirearm(product)) {
    // Ammunition
    if (/\b(ammo|ammunition|FMJ|JHP|JSP|TMJ|HP|SP|RN)\b/i.test(name) || 
        (/\b\d+\s*(rd|rds|round|rounds|count|ct|box)\b/i.test(name) && /\b\d+\s*(gr|grain)\b/i.test(name))) {
      return 'Ammunition';
    }
    
    // Magazines
    if (/\bmagazine\b/i.test(name)) {
      return 'Magazines';
    }
    
    // Optics
    if (/\b(scope|optic|sight|red\s*dot|reflex|holographic|magnifier|binocular)\b/i.test(name)) {
      return 'Optics';
    }
    
    // Suppressors/Silencers (NFA items)
    if (/\b(suppressor|silencer|can)\b/i.test(name) && product.requires_ffl) {
      return 'NFA Products';
    }
    
    // Holsters
    if (/\bholster\b/i.test(name)) {
      return 'Accessories';
    }
    
    // Cases and bags
    if (/\b(case|bag|pouch)\b/i.test(name)) {
      return 'Accessories';
    }
    
    // Cleaning supplies
    if (/\b(cleaning|oil|solvent|brush|kit|rod)\b/i.test(name)) {
      return 'Accessories';
    }
    
    // Lights and lasers
    if (/\b(light|laser|illuminator|flashlight)\b/i.test(name)) {
      return 'Accessories';
    }
    
    // Slings and straps
    if (/\b(sling|strap)\b/i.test(name)) {
      return 'Accessories';
    }
    
    // Targets
    if (/\b(target|bullseye)\b/i.test(name)) {
      return 'Accessories';
    }
    
    // Lower receivers (serialized, need FFL)
    if (/\blower\s*(receiver|assembly)\b/i.test(name) && product.requires_ffl) {
      return 'Uppers/Lowers';
    }
    
    // Upper receivers and assemblies
    if (/\bupper\s*(receiver|assembly)\b/i.test(name)) {
      return 'Upper Receivers & Conversion Kits';
    }
    
    // Barrels
    if (/\bbarrel\b/i.test(name) && !/\b(rifle|pistol|shotgun)\b/i.test(name)) {
      return 'Parts';
    }
    
    // Triggers
    if (/\btrigger\b/i.test(name) && !/\b(pull|weight)\b/i.test(name)) {
      return 'Parts';
    }
    
    // Stocks
    if (/\bstock\b/i.test(name) && !/\b(rifle|shotgun)\b/i.test(name)) {
      return 'Parts';
    }
    
    // Grips
    if (/\bgrip\b/i.test(name) && !/\b(pistol|rifle)\b/i.test(name)) {
      return 'Parts';
    }
    
    // Rails and mounts
    if (/\b(rail|mount|base)\b/i.test(name)) {
      return 'Parts';
    }
    
    // Other parts
    if (/\b(spring|pin|bolt|carrier|buffer|handguard|brace|adapter|conversion|parts|kit)\b/i.test(name)) {
      return 'Parts';
    }
    
    // Default to Accessories for other non-firearms
    return 'Accessories';
  }
  
  // Keep in current category if it's an actual firearm
  return currentCategory;
}

async function analyzeCategories() {
  console.log('🔍 Analyzing product categorization for strict cleanup...\n');
  
  try {
    // Get all products from firearm categories
    const products = await db.execute(sql`
      SELECT 
        id, sku, name, description, manufacturer, category, 
        requires_ffl, department_number, subcategory_name
      FROM products
      WHERE category IN ('Handguns', 'Rifles', 'Shotguns')
      ORDER BY category, name
    `);
    
    console.log(`📊 Found ${products.rows.length} products in firearm categories\n`);
    
    const misplacedProducts: ProductAnalysis[] = [];
    const categoryCounts: Record<string, { total: number; firearms: number; nonFirearms: number }> = {
      'Handguns': { total: 0, firearms: 0, nonFirearms: 0 },
      'Rifles': { total: 0, firearms: 0, nonFirearms: 0 },
      'Shotguns': { total: 0, firearms: 0, nonFirearms: 0 }
    };
    
    for (const product of products.rows) {
      const currentCategory = product.category as string;
      categoryCounts[currentCategory].total++;
      
      const isFirearm = isActualFirearm(product);
      
      if (isFirearm) {
        categoryCounts[currentCategory].firearms++;
      } else {
        categoryCounts[currentCategory].nonFirearms++;
        
        const suggestedCategory = determineCorrectCategory(product);
        misplacedProducts.push({
          id: product.id as number,
          sku: product.sku as string,
          name: product.name as string,
          description: product.description as string | null,
          manufacturer: product.manufacturer as string,
          currentCategory: currentCategory,
          suggestedCategory: suggestedCategory,
          reason: `Not an actual firearm - appears to be ${suggestedCategory.toLowerCase()}`,
          requiresFFL: product.requires_ffl as boolean,
          isActualFirearm: false
        });
      }
    }
    
    // Print analysis summary
    console.log('📊 Category Analysis Summary:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    for (const [category, counts] of Object.entries(categoryCounts)) {
      const pctNonFirearms = ((counts.nonFirearms / counts.total) * 100).toFixed(1);
      console.log(`\n${category}:`);
      console.log(`  Total Products: ${counts.total}`);
      console.log(`  Actual Firearms: ${counts.firearms}`);
      console.log(`  Non-Firearms (to be moved): ${counts.nonFirearms} (${pctNonFirearms}%)`);
    }
    
    // Group misplaced products by suggested category
    const suggestionGroups: Record<string, ProductAnalysis[]> = {};
    for (const product of misplacedProducts) {
      if (!suggestionGroups[product.suggestedCategory]) {
        suggestionGroups[product.suggestedCategory] = [];
      }
      suggestionGroups[product.suggestedCategory].push(product);
    }
    
    console.log('\n\n📦 Products to be Moved by Target Category:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    for (const [targetCategory, products] of Object.entries(suggestionGroups)) {
      console.log(`\n→ ${targetCategory}: ${products.length} products`);
      
      // Show first 5 examples
      const examples = products.slice(0, 5);
      for (const product of examples) {
        console.log(`   • ${product.name} (${product.manufacturer}) - from ${product.currentCategory}`);
      }
      if (products.length > 5) {
        console.log(`   ... and ${products.length - 5} more`);
      }
    }
    
    // Save full analysis to CSV
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const csvPath = path.join(process.cwd(), `category-cleanup-analysis-${timestamp}.csv`);
    
    const csvContent = [
      'ID,SKU,Name,Manufacturer,Current Category,Suggested Category,Reason,Requires FFL',
      ...misplacedProducts.map(p => 
        `"${p.id}","${p.sku}","${p.name.replace(/"/g, '""')}","${p.manufacturer}","${p.currentCategory}","${p.suggestedCategory}","${p.reason}","${p.requiresFFL}"`
      )
    ].join('\n');
    
    fs.writeFileSync(csvPath, csvContent);
    console.log(`\n\n💾 Full analysis saved to: ${csvPath}`);
    
    console.log(`\n\n🎯 Total products to be recategorized: ${misplacedProducts.length}`);
    
    return misplacedProducts;
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeCategories().then(() => {
    console.log('\n✅ Analysis complete!');
  }).catch((error) => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });
}

export { analyzeCategories, isActualFirearm, determineCorrectCategory };