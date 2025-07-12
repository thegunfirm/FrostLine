/**
 * Analyze Accessories Filtering Opportunities
 * Sample accessories data to understand patterns for type, compatibility, material, and mount type extraction
 */

import { db } from "../server/db";
import { eq, and, or, inArray } from "drizzle-orm";
import { products } from "../shared/schema";

async function analyzeAccessoriesFiltering() {
  console.log('🔍 Analyzing Accessories Filtering Opportunities...');
  
  // Get sample accessories from multiple departments
  const accessoryDepartments = ['09', '11', '12', '13', '14', '17', '20', '21', '25', '26', '27', '30', '31', '35'];
  
  const sampleAccessories = await db.select()
  .from(products)
  .where(
    and(
      inArray(products.departmentNumber, accessoryDepartments),
      eq(products.categoryName, 'Accessories')
    )
  )
  .limit(200);

  console.log(`📊 Sample Size: ${sampleAccessories.length} accessories`);
  console.log('');

  // Analyze for Accessory Type patterns
  console.log('🎯 ACCESSORY TYPE ANALYSIS:');
  const typePatterns = {
    'Sights': /sight|iron sight|red dot|reflex|scope|optic/i,
    'Grips': /grip|pistol grip|vertical grip|fore grip|foregrip/i,
    'Cases': /case|gun case|rifle case|pistol case|storage|box/i,
    'Holsters': /holster|iwb|owb|shoulder holster|ankle holster/i,
    'Lights': /light|flashlight|weapon light|tactical light|laser/i,
    'Mounts': /mount|rail|picatinny|weaver|scope mount|ring|base/i,
    'Slings': /sling|strap|swivel|quick detach|qd/i,
    'Magazines': /magazine|mag|clip|drum|pmag/i,
    'Stocks': /stock|buttstock|collapsible|adjustable stock/i,
    'Triggers': /trigger|trigger guard|trigger kit/i,
    'Bipods': /bipod|bi-pod|shooting rest/i,
    'Cleaning': /cleaning|bore|solvent|oil|patch|rod/i,
    'Safes': /safe|vault|lock|security|gun safe/i,
    'Clothing': /shirt|jacket|hat|glove|holster vest/i,
    'Tools': /tool|wrench|punch|multi-tool|armorer/i
  };

  const typeCounts: Record<string, number> = {};
  for (const [type, pattern] of Object.entries(typePatterns)) {
    const count = sampleAccessories.filter(acc => 
      pattern.test(acc.name) || pattern.test(acc.description || '')
    ).length;
    typeCounts[type] = count;
    if (count > 0) {
      console.log(`  ${type}: ${count} products`);
    }
  }

  // Analyze for Compatibility patterns
  console.log('\n🔗 COMPATIBILITY ANALYSIS:');
  const compatibilityPatterns = {
    'AR-15': /ar-15|ar15|m4|m16|223|556|5\.56/i,
    'AK': /ak-47|ak47|ak74|kalash|7\.62x39/i,
    'Glock': /glock|g17|g19|g21|g22|g23|g26|g27|g30|g43/i,
    '1911': /1911|colt 45|45 acp|commander|government/i,
    'Sig Sauer': /sig|p226|p229|p320|p365|p938/i,
    'Smith & Wesson': /s&w|smith|wesson|m&p|shield|bodyguard/i,
    'Ruger': /ruger|10\/22|mini-14|sr|lcp|lc9/i,
    'Beretta': /beretta|92f|92fs|px4|a400/i,
    'Remington': /remington|870|700|1100|11-87/i,
    'Mossberg': /mossberg|500|590|shockwave/i,
    'Universal': /universal|standard|generic|fits most/i,
    'Picatinny': /picatinny|pic rail|1913|mil-std/i,
    'Weaver': /weaver|weaver rail|weaver mount/i
  };

  const compatibilityCounts: Record<string, number> = {};
  for (const [platform, pattern] of Object.entries(compatibilityPatterns)) {
    const count = sampleAccessories.filter(acc => 
      pattern.test(acc.name) || pattern.test(acc.description || '')
    ).length;
    compatibilityCounts[platform] = count;
    if (count > 0) {
      console.log(`  ${platform}: ${count} products`);
    }
  }

  // Analyze for Material/Finish patterns
  console.log('\n🎨 MATERIAL/FINISH ANALYSIS:');
  const materialPatterns = {
    'Aluminum': /aluminum|aluminium|al|alloy/i,
    'Steel': /steel|stainless|carbon steel|blued/i,
    'Polymer': /polymer|plastic|nylon|composite/i,
    'Carbon Fiber': /carbon fiber|carbon fibre|cf/i,
    'Leather': /leather|genuine leather|cowhide/i,
    'Kydex': /kydex|thermoplastic|holster material/i,
    'Black': /black|matte black|anodized black/i,
    'FDE': /fde|flat dark earth|tan|coyote/i,
    'ODG': /odg|olive drab|od green|olive/i,
    'Gray': /gray|grey|tungsten|wolf gray/i,
    'Cerakote': /cerakote|ceramic coating/i,
    'Anodized': /anodized|hard anodized|type iii/i
  };

  const materialCounts: Record<string, number> = {};
  for (const [material, pattern] of Object.entries(materialPatterns)) {
    const count = sampleAccessories.filter(acc => 
      pattern.test(acc.name) || pattern.test(acc.description || '')
    ).length;
    materialCounts[material] = count;
    if (count > 0) {
      console.log(`  ${material}: ${count} products`);
    }
  }

  // Analyze for Mount Type patterns
  console.log('\n🔧 MOUNT TYPE ANALYSIS:');
  const mountPatterns = {
    'Picatinny': /picatinny|pic rail|1913|mil-std-1913/i,
    'Weaver': /weaver|weaver rail|weaver mount/i,
    'Dovetail': /dovetail|dove tail|dovetail mount/i,
    'Quick Detach': /quick detach|qd|quick release|lever/i,
    'Screw-On': /screw|thread|threaded|screwed/i,
    'Clamp-On': /clamp|c-clamp|clamp on/i,
    'Magnetic': /magnetic|magnet|mag mount/i,
    'Adhesive': /adhesive|stick|sticky|tape/i,
    'Integral': /integral|integrated|built-in/i,
    'Low Profile': /low profile|low|compact mount/i,
    'High Profile': /high|tall|extended mount/i,
    'Cantilever': /cantilever|extended|forward/i
  };

  const mountCounts: Record<string, number> = {};
  for (const [mount, pattern] of Object.entries(mountPatterns)) {
    const count = sampleAccessories.filter(acc => 
      pattern.test(acc.name) || pattern.test(acc.description || '')
    ).length;
    mountCounts[mount] = count;
    if (count > 0) {
      console.log(`  ${mount}: ${count} products`);
    }
  }

  // Show some sample products for each category
  console.log('\n📋 SAMPLE PRODUCTS BY TYPE:');
  for (const [type, pattern] of Object.entries(typePatterns)) {
    const samples = sampleAccessories.filter(acc => 
      pattern.test(acc.name) || pattern.test(acc.description || '')
    ).slice(0, 3);
    
    if (samples.length > 0) {
      console.log(`\n${type}:`);
      samples.forEach(sample => {
        console.log(`  - ${sample.name} (${sample.manufacturerName})`);
      });
    }
  }

  console.log('\n✅ Accessories filtering analysis complete!');
  console.log('📊 Summary:');
  console.log(`  - Total sample analyzed: ${sampleAccessories.length}`);
  console.log(`  - Accessory types identified: ${Object.keys(typeCounts).filter(k => typeCounts[k] > 0).length}`);
  console.log(`  - Compatibility patterns: ${Object.keys(compatibilityCounts).filter(k => compatibilityCounts[k] > 0).length}`);
  console.log(`  - Material/finish patterns: ${Object.keys(materialCounts).filter(k => materialCounts[k] > 0).length}`);
  console.log(`  - Mount type patterns: ${Object.keys(mountCounts).filter(k => mountCounts[k] > 0).length}`);
}

// Run the analysis
analyzeAccessoriesFiltering().catch(console.error);