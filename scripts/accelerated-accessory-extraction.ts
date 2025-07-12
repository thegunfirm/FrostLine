/**
 * Accelerated Accessory Extraction
 * Process all accessories in smaller batches for faster completion
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';

async function acceleratedAccessoryExtraction() {
  console.log('🚀 Starting Accelerated Accessory Extraction...');
  
  try {
    // Get all accessories that don't have filter data yet
    const unprocessedAccessories = await db.select()
      .from(products)
      .where(and(
        eq(products.category, 'Accessories'),
        and(
          isNull(products.accessoryType),
          isNull(products.compatibility),
          isNull(products.materialFinish),
          isNull(products.mountType)
        )
      ))
      .limit(5000); // Process first 5000 unprocessed

    console.log(`📦 Found ${unprocessedAccessories.length} unprocessed accessories`);

    if (unprocessedAccessories.length === 0) {
      console.log('✅ All accessories already processed!');
      return;
    }

    // Process in smaller batches
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < unprocessedAccessories.length; i += batchSize) {
      batches.push(unprocessedAccessories.slice(i, i + batchSize));
    }

    console.log(`⚡ Processing ${batches.length} batches of ${batchSize} products each`);

    let totalProcessed = 0;
    let totalUpdated = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length}`);

      const updatePromises = batch.map(async (product) => {
        const name = product.name?.toLowerCase() || '';
        
        // Extract accessory type
        const accessoryType = extractAccessoryType(name);
        
        // Extract compatibility
        const compatibility = extractCompatibility(name);
        
        // Extract material/finish
        const materialFinish = extractMaterialFinish(name);
        
        // Extract mount type
        const mountType = extractMountType(name);

        // Only update if we extracted something
        if (accessoryType || compatibility || materialFinish || mountType) {
          await db.update(products)
            .set({
              accessoryType,
              compatibility,
              materialFinish,
              mountType
            })
            .where(eq(products.id, product.id));
          
          return 1;
        }
        
        return 0;
      });

      const results = await Promise.all(updatePromises);
      const batchUpdated = results.reduce((sum, count) => sum + count, 0);
      
      totalProcessed += batch.length;
      totalUpdated += batchUpdated;
      
      console.log(`✅ Batch ${batchIndex + 1} complete: ${batchUpdated}/${batch.length} updated`);
      console.log(`📊 Overall progress: ${totalProcessed}/${unprocessedAccessories.length} processed, ${totalUpdated} updated`);
    }

    console.log(`🎯 Accelerated extraction complete!`);
    console.log(`📈 Final stats: ${totalUpdated}/${totalProcessed} accessories updated with filter data`);
    
  } catch (error) {
    console.error('❌ Error during accelerated extraction:', error);
    throw error;
  }
}

/**
 * Extract accessory type from product name
 */
function extractAccessoryType(name: string): string | null {
  const typePatterns = [
    // Sights
    { pattern: /\b(sight|sights|iron sight|tritium|night sight|fiber optic|red dot|reflex|scope)\b/i, type: 'Sights' },
    
    // Grips
    { pattern: /\b(grip|grips|pistol grip|ar grip|1911 grip|polymer grip)\b/i, type: 'Grips' },
    
    // Cases
    { pattern: /\b(case|cases|gun case|rifle case|pistol case|hard case|soft case)\b/i, type: 'Cases' },
    
    // Holsters
    { pattern: /\b(holster|holsters|iwb|owb|shoulder holster|ankle holster)\b/i, type: 'Holsters' },
    
    // Magazines
    { pattern: /\b(magazine|magazines|mag|mags|hi-cap|high capacity)\b/i, type: 'Magazines' },
    
    // Stocks
    { pattern: /\b(stock|stocks|buttstock|ar stock|rifle stock|adjustable stock)\b/i, type: 'Stocks' },
    
    // Triggers
    { pattern: /\b(trigger|triggers|drop-in trigger|trigger kit)\b/i, type: 'Triggers' },
    
    // Mounts
    { pattern: /\b(mount|mounts|scope mount|ring|rings|base|bases|picatinny|weaver)\b/i, type: 'Mounts' },
    
    // Lights
    { pattern: /\b(light|lights|flashlight|weapon light|laser|tactical light)\b/i, type: 'Lights' },
    
    // Cleaning
    { pattern: /\b(cleaning|clean|brush|rod|kit|solvent|lubricant|oil)\b/i, type: 'Cleaning' },
    
    // Bipods
    { pattern: /\b(bipod|bipods)\b/i, type: 'Bipods' },
    
    // Slings
    { pattern: /\b(sling|slings|strap|tactical sling)\b/i, type: 'Slings' },
    
    // Chokes
    { pattern: /\b(choke|chokes|choke tube)\b/i, type: 'Chokes' },
    
    // Barrels
    { pattern: /\b(barrel|barrels|threaded barrel)\b/i, type: 'Barrels' },
    
    // Compensators
    { pattern: /\b(compensator|comp|muzzle brake|flash hider)\b/i, type: 'Compensators' },
    
    // Forends
    { pattern: /\b(forend|forearm|handguard|rail)\b/i, type: 'Forends' },
    
    // Optics
    { pattern: /\b(optic|optics|scope|scopes|red dot|reflex|prism)\b/i, type: 'Optics' },
    
    // Generic accessories
    { pattern: /\b(accessory|accessories|part|parts)\b/i, type: 'Accessories' }
  ];

  for (const { pattern, type } of typePatterns) {
    if (pattern.test(name)) {
      return type;
    }
  }

  return null;
}

/**
 * Extract compatibility from product name
 */
function extractCompatibility(name: string): string | null {
  const compatibilityPatterns = [
    // AR platform
    { pattern: /\b(ar-?15|ar15|m4|m16|5\.?56|223)\b/i, compatibility: 'AR-15' },
    { pattern: /\b(ar-?10|ar10|sr-?25|308|7\.?62)\b/i, compatibility: 'AR-10' },
    
    // Glock
    { pattern: /\b(glock|g17|g19|g21|g22|g23|g26|g27|g29|g30|g34|g35|g36|g37|g38|g39|g43|g48)\b/i, compatibility: 'Glock' },
    
    // 1911
    { pattern: /\b(1911|45\s?acp|government|commander|officer)\b/i, compatibility: '1911' },
    
    // AK platform
    { pattern: /\b(ak-?47|ak47|ak-?74|ak74|kalashnikov|7\.?62x39|5\.?45x39)\b/i, compatibility: 'AK' },
    
    // Ruger
    { pattern: /\b(ruger|10\/22|mini-?14|ranch|blackhawk|gp100|lcr|lcp|sr9|sr40|american|precision)\b/i, compatibility: 'Ruger' },
    
    // Remington
    { pattern: /\b(remington|rem|870|700|1100|11-?87|597|model 7)\b/i, compatibility: 'Remington' },
    
    // Mossberg
    { pattern: /\b(mossberg|500|590|930|935|702|715|464|patriot)\b/i, compatibility: 'Mossberg' },
    
    // Sig Sauer
    { pattern: /\b(sig|sauer|p220|p226|p229|p238|p239|p320|p365|mcx|mpx|716|556|cross)\b/i, compatibility: 'Sig Sauer' },
    
    // Smith & Wesson
    { pattern: /\b(smith|wesson|s&w|sw|m&p|shield|bodyguard|governor|629|686|586|66|19|36|642|442|638|637|bodyguard|sd9|sd40|sw9|sw40|sw380)\b/i, compatibility: 'Smith & Wesson' },
    
    // Beretta
    { pattern: /\b(beretta|92|96|px4|nano|pico|a400|a300|686|687|dt11)\b/i, compatibility: 'Beretta' },
    
    // Generic platforms
    { pattern: /\b(picatinny|weaver|dovetail|keymod|m-?lok|mlok)\b/i, compatibility: 'Universal' },
    
    // Caliber-based compatibility
    { pattern: /\b(9mm|40\s?s&w|45\s?acp|380\s?acp|357\s?mag|38\s?special|44\s?mag|22\s?lr|17\s?hmr|22\s?wmr)\b/i, compatibility: 'Multi-Caliber' }
  ];

  for (const { pattern, compatibility } of compatibilityPatterns) {
    if (pattern.test(name)) {
      return compatibility;
    }
  }

  return null;
}

/**
 * Extract material/finish from product name
 */
function extractMaterialFinish(name: string): string | null {
  const materialPatterns = [
    // Metals
    { pattern: /\b(aluminum|aluminium|al|6061|7075)\b/i, material: 'Aluminum' },
    { pattern: /\b(steel|stainless|ss|carbon steel|alloy steel)\b/i, material: 'Steel' },
    { pattern: /\b(brass|bronze)\b/i, material: 'Brass' },
    { pattern: /\b(titanium|ti)\b/i, material: 'Titanium' },
    
    // Polymers
    { pattern: /\b(polymer|plastic|nylon|zytel|abs|pvc)\b/i, material: 'Polymer' },
    { pattern: /\b(carbon fiber|carbon fibre|cf)\b/i, material: 'Carbon Fiber' },
    { pattern: /\b(fiberglass|fiber glass|glass fiber)\b/i, material: 'Fiberglass' },
    
    // Finishes
    { pattern: /\b(black|blk|matte black|flat black)\b/i, material: 'Black' },
    { pattern: /\b(fde|flat dark earth|desert tan|coyote|tan)\b/i, material: 'FDE' },
    { pattern: /\b(od|olive drab|green|foliage)\b/i, material: 'OD Green' },
    { pattern: /\b(gray|grey|wolf gray|tungsten)\b/i, material: 'Gray' },
    { pattern: /\b(bronze|burnt bronze|fde)\b/i, material: 'Bronze' },
    { pattern: /\b(nickel|chrome|polished|bright)\b/i, material: 'Nickel' },
    
    // Coatings
    { pattern: /\b(cerakote|duracoat|parkerized|anodized|hard coat)\b/i, material: 'Coated' },
    { pattern: /\b(nitride|melonite|salt bath|blacknitride)\b/i, material: 'Nitride' },
    
    // Wood
    { pattern: /\b(wood|walnut|oak|maple|birch|laminate|synthetic)\b/i, material: 'Wood' },
    
    // Rubber
    { pattern: /\b(rubber|rubberized|elastomer|tpr)\b/i, material: 'Rubber' },
    
    // Leather
    { pattern: /\b(leather|cowhide|suede|kydex)\b/i, material: 'Leather' }
  ];

  for (const { pattern, material } of materialPatterns) {
    if (pattern.test(name)) {
      return material;
    }
  }

  return null;
}

/**
 * Extract mount type from product name
 */
function extractMountType(name: string): string | null {
  const mountPatterns = [
    // Rail systems
    { pattern: /\b(picatinny|pic rail|mil-?spec|1913)\b/i, mountType: 'Picatinny' },
    { pattern: /\b(weaver|weaver rail)\b/i, mountType: 'Weaver' },
    { pattern: /\b(dovetail|dove tail)\b/i, mountType: 'Dovetail' },
    { pattern: /\b(keymod|key-?mod)\b/i, mountType: 'KeyMod' },
    { pattern: /\b(m-?lok|mlok)\b/i, mountType: 'M-LOK' },
    
    // Quick detach
    { pattern: /\b(qd|quick detach|quick release|qr|lever)\b/i, mountType: 'Quick Detach' },
    { pattern: /\b(throw lever|cam lever|tool-?less)\b/i, mountType: 'Lever' },
    
    // Threading
    { pattern: /\b(threaded|1\/2x28|5\/8x24|thread|pitch)\b/i, mountType: 'Threaded' },
    
    // Clamp systems
    { pattern: /\b(clamp|clamp-?on|barrel clamp|tube clamp)\b/i, mountType: 'Clamp-On' },
    
    // Specific systems
    { pattern: /\b(arca|arca-?swiss|arca rail)\b/i, mountType: 'Arca Swiss' },
    { pattern: /\b(harris|harris bipod|swivel stud)\b/i, mountType: 'Swivel Stud' },
    { pattern: /\b(sling stud|uncle mike|butler creek)\b/i, mountType: 'Sling Stud' },
    
    // Optic specific
    { pattern: /\b(30mm|1 inch|34mm|35mm|rings|scope rings)\b/i, mountType: 'Scope Rings' },
    { pattern: /\b(red dot|rmr|deltapoint|romeo|holosun)\b/i, mountType: 'Red Dot' },
    
    // Generic
    { pattern: /\b(universal|multi-?mount|adaptable)\b/i, mountType: 'Universal' }
  ];

  for (const { pattern, mountType } of mountPatterns) {
    if (pattern.test(name)) {
      return mountType;
    }
  }

  return null;
}

// Execute the extraction
acceleratedAccessoryExtraction()
  .then(() => {
    console.log('🎉 Accelerated accessory extraction completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Accelerated extraction failed:', error);
    process.exit(1);
  });