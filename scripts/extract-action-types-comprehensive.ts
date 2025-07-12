/**
 * Comprehensive Action Type Extraction for Rifles and Shotguns
 * Advanced pattern matching to extract action types from RSR product names
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface ActionTypePattern {
  pattern: RegExp;
  actionType: string;
  priority: number; // Higher priority wins when multiple patterns match
}

// Comprehensive action type patterns for rifles and shotguns
const actionTypePatterns: ActionTypePattern[] = [
  // Semi-Automatic patterns (highest priority for common terms)
  { pattern: /\b(SEMI-AUTO|SEMI AUTO|SA|AUTO)\b/i, actionType: 'Semi-Auto', priority: 10 },
  { pattern: /\b(AR-15|AR15|M4|M16|AK-47|AK47|AKM)\b/i, actionType: 'Semi-Auto', priority: 9 },
  { pattern: /\b(CARBINE|RIFLE)\b.*\b(AUTO|SEMI)\b/i, actionType: 'Semi-Auto', priority: 8 },
  { pattern: /\b(GAS|DI|PISTON)\b.*\b(OPERATED|SYSTEM)\b/i, actionType: 'Semi-Auto', priority: 7 },
  
  // Bolt Action patterns
  { pattern: /\b(BOLT|BOLT-ACTION|BOLT ACTION)\b/i, actionType: 'Bolt Action', priority: 10 },
  { pattern: /\b(REMINGTON|REM)\b.*\b(700|783|770)\b/i, actionType: 'Bolt Action', priority: 9 },
  { pattern: /\b(SAVAGE|SAV)\b.*\b(110|111|116|AXIS)\b/i, actionType: 'Bolt Action', priority: 9 },
  { pattern: /\b(TIKKA|RUGER)\b.*\b(T3|AMERICAN|PRECISION)\b/i, actionType: 'Bolt Action', priority: 9 },
  { pattern: /\b(BERGARA|CHRISTENSEN|WEATHERBY)\b/i, actionType: 'Bolt Action', priority: 8 },
  
  // Lever Action patterns
  { pattern: /\b(LEVER|LEVER-ACTION|LEVER ACTION)\b/i, actionType: 'Lever Action', priority: 10 },
  { pattern: /\b(HENRY|MARLIN|WINCHESTER)\b.*\b(REPEATER|COWBOY|RANCH)\b/i, actionType: 'Lever Action', priority: 9 },
  { pattern: /\b(HENRY|MARLIN)\b.*\b(H0|336|1895|1894)\b/i, actionType: 'Lever Action', priority: 9 },
  { pattern: /\b(30-30|45-70|44MAG|357MAG)\b.*\b(CARBINE|RIFLE)\b/i, actionType: 'Lever Action', priority: 7 },
  
  // Pump Action patterns (mainly shotguns)
  { pattern: /\b(PUMP|PUMP-ACTION|PUMP ACTION)\b/i, actionType: 'Pump Action', priority: 10 },
  { pattern: /\b(REMINGTON|REM)\b.*\b(870|7600)\b/i, actionType: 'Pump Action', priority: 9 },
  { pattern: /\b(MOSSBERG|MSBRG)\b.*\b(500|590|935)\b/i, actionType: 'Pump Action', priority: 9 },
  { pattern: /\b(WINCHESTER|WIN)\b.*\b(SXP|1300|1200)\b/i, actionType: 'Pump Action', priority: 9 },
  { pattern: /\b(BENELLI|NOVA|SUPERNOVA)\b/i, actionType: 'Pump Action', priority: 8 },
  
  // Single Shot patterns
  { pattern: /\b(SINGLE|SINGLE-SHOT|SINGLE SHOT|BREAK ACTION|BREAK-ACTION)\b/i, actionType: 'Single Shot', priority: 10 },
  { pattern: /\b(THOMPSON|T\/C|CVA|TRADITIONS)\b.*\b(ENCORE|CONTENDER|SCOUT)\b/i, actionType: 'Single Shot', priority: 9 },
  { pattern: /\b(HARRINGTON|H&R|NEF)\b/i, actionType: 'Single Shot', priority: 8 },
  { pattern: /\b(BREAK|HINGE|FALLING BLOCK)\b/i, actionType: 'Single Shot', priority: 7 },
  
  // Double Barrel patterns (shotguns)
  { pattern: /\b(DOUBLE|DOUBLE-BARREL|DOUBLE BARREL|SIDE BY SIDE|SXS|OVER UNDER|O\/U)\b/i, actionType: 'Double Barrel', priority: 10 },
  { pattern: /\b(BERETTA|BENELLI|BROWNING|CZ|STOEGER)\b.*\b(SILVER|GOLD|ULTRA|SUPREME)\b/i, actionType: 'Double Barrel', priority: 8 },
  
  // Straight Pull patterns
  { pattern: /\b(STRAIGHT|STRAIGHT-PULL|STRAIGHT PULL)\b/i, actionType: 'Straight Pull', priority: 10 },
  { pattern: /\b(BLASER|MERKEL|HEYM)\b/i, actionType: 'Straight Pull', priority: 8 },
  
  // Automatic patterns (true full-auto - rare)
  { pattern: /\b(FULL-AUTO|FULL AUTO|AUTOMATIC|SELECT FIRE)\b/i, actionType: 'Automatic', priority: 10 },
  { pattern: /\b(MACHINE GUN|MG|LMG|SAW)\b/i, actionType: 'Automatic', priority: 9 },
];

async function extractActionTypesComprehensive() {
  console.log('🔧 Starting comprehensive action type extraction for rifles and shotguns...');
  
  // Get all long guns (department 05)
  const longGuns = await db
    .select()
    .from(products)
    .where(eq(products.departmentNumber, '05'));
  
  console.log(`📊 Found ${longGuns.length} long guns to process`);
  
  let extractedCount = 0;
  let updatedCount = 0;
  const actionTypeStats: { [key: string]: number } = {};
  
  // Process each product
  for (const product of longGuns) {
    const productName = product.name || '';
    const description = product.description || '';
    const fullText = `${productName} ${description}`.toUpperCase();
    
    let bestMatch: { actionType: string; priority: number } | null = null;
    
    // Check all patterns and find the best match
    for (const pattern of actionTypePatterns) {
      if (pattern.pattern.test(fullText)) {
        if (!bestMatch || pattern.priority > bestMatch.priority) {
          bestMatch = {
            actionType: pattern.actionType,
            priority: pattern.priority
          };
        }
      }
    }
    
    if (bestMatch) {
      extractedCount++;
      
      // Update database if different from current value
      if (product.actionType !== bestMatch.actionType) {
        await db
          .update(products)
          .set({ actionType: bestMatch.actionType })
          .where(eq(products.id, product.id));
        
        updatedCount++;
      }
      
      // Update statistics
      actionTypeStats[bestMatch.actionType] = (actionTypeStats[bestMatch.actionType] || 0) + 1;
    }
  }
  
  console.log(`✅ Extraction complete:`);
  console.log(`📊 Total products processed: ${longGuns.length}`);
  console.log(`📊 Products with action type extracted: ${extractedCount}`);
  console.log(`📊 Products updated in database: ${updatedCount}`);
  console.log(`📊 Coverage: ${(extractedCount / longGuns.length * 100).toFixed(1)}%`);
  
  console.log('\n📊 Action Type Distribution:');
  Object.entries(actionTypeStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([actionType, count]) => {
      console.log(`   ${actionType}: ${count} products`);
    });
  
  // Show category breakdown
  const rifles = longGuns.filter(p => p.subcategoryName === 'Rifles');
  const shotguns = longGuns.filter(p => p.subcategoryName === 'Shotguns');
  
  console.log(`\n📊 Category breakdown:`);
  console.log(`   Rifles: ${rifles.length} products`);
  console.log(`   Shotguns: ${shotguns.length} products`);
  console.log(`   Other: ${longGuns.length - rifles.length - shotguns.length} products`);
  
  return {
    total: longGuns.length,
    extracted: extractedCount,
    updated: updatedCount,
    coverage: (extractedCount / longGuns.length * 100).toFixed(1),
    stats: actionTypeStats
  };
}

// Run the extraction if this file is executed directly
extractActionTypesComprehensive()
  .then((result) => {
    console.log('✅ Comprehensive action type extraction completed');
    console.log(`🎯 Final coverage: ${result.coverage}% (${result.extracted}/${result.total} products)`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Action type extraction failed:', error);
    process.exit(1);
  });

export { extractActionTypesComprehensive };