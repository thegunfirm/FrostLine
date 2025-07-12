/**
 * Batch Action Type Extraction for Rifles and Shotguns
 * Efficient batch processing with SQL-based pattern matching
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function extractActionTypesBatch() {
  console.log('🔧 Starting batch action type extraction for rifles and shotguns...');
  
  // Use SQL for efficient pattern matching and updates
  const actionTypeQueries = [
    // Semi-Automatic patterns
    {
      pattern: `(name ~* '\\b(SEMI-AUTO|SEMI AUTO|SA|AUTO)\\b' OR name ~* '\\b(AR-15|AR15|M4|M16|AK-47|AK47|AKM)\\b' OR name ~* '\\b(CARBINE|RIFLE).*(AUTO|SEMI)\\b' OR name ~* '\\b(GAS|DI|PISTON).*(OPERATED|SYSTEM)\\b')`,
      actionType: 'Semi-Auto'
    },
    
    // Bolt Action patterns
    {
      pattern: `(name ~* '\\b(BOLT|BOLT-ACTION|BOLT ACTION)\\b' OR name ~* '\\b(REMINGTON|REM).*(700|783|770)\\b' OR name ~* '\\b(SAVAGE|SAV).*(110|111|116|AXIS)\\b' OR name ~* '\\b(TIKKA|RUGER).*(T3|AMERICAN|PRECISION)\\b' OR name ~* '\\b(BERGARA|CHRISTENSEN|WEATHERBY)\\b')`,
      actionType: 'Bolt Action'
    },
    
    // Lever Action patterns
    {
      pattern: `(name ~* '\\b(LEVER|LEVER-ACTION|LEVER ACTION)\\b' OR name ~* '\\b(HENRY|MARLIN|WINCHESTER).*(REPEATER|COWBOY|RANCH)\\b' OR name ~* '\\b(HENRY|MARLIN).*(H0|336|1895|1894)\\b')`,
      actionType: 'Lever Action'
    },
    
    // Pump Action patterns
    {
      pattern: `(name ~* '\\b(PUMP|PUMP-ACTION|PUMP ACTION)\\b' OR name ~* '\\b(REMINGTON|REM).*(870|7600)\\b' OR name ~* '\\b(MOSSBERG|MSBRG).*(500|590|935)\\b' OR name ~* '\\b(WINCHESTER|WIN).*(SXP|1300|1200)\\b' OR name ~* '\\b(BENELLI|NOVA|SUPERNOVA)\\b')`,
      actionType: 'Pump Action'
    },
    
    // Single Shot patterns
    {
      pattern: `(name ~* '\\b(SINGLE|SINGLE-SHOT|SINGLE SHOT|BREAK ACTION|BREAK-ACTION)\\b' OR name ~* '\\b(THOMPSON|T/C|CVA|TRADITIONS).*(ENCORE|CONTENDER|SCOUT)\\b' OR name ~* '\\b(HARRINGTON|H&R|NEF)\\b' OR name ~* '\\b(BREAK|HINGE|FALLING BLOCK)\\b')`,
      actionType: 'Single Shot'
    },
    
    // Double Barrel patterns
    {
      pattern: `(name ~* '\\b(DOUBLE|DOUBLE-BARREL|DOUBLE BARREL|SIDE BY SIDE|SXS|OVER UNDER|O/U)\\b' OR name ~* '\\b(BERETTA|BENELLI|BROWNING|CZ|STOEGER).*(SILVER|GOLD|ULTRA|SUPREME)\\b')`,
      actionType: 'Double Barrel'
    },
    
    // Straight Pull patterns
    {
      pattern: `(name ~* '\\b(STRAIGHT|STRAIGHT-PULL|STRAIGHT PULL)\\b' OR name ~* '\\b(BLASER|MERKEL|HEYM)\\b')`,
      actionType: 'Straight Pull'
    },
    
    // Automatic patterns
    {
      pattern: `(name ~* '\\b(FULL-AUTO|FULL AUTO|AUTOMATIC|SELECT FIRE)\\b' OR name ~* '\\b(MACHINE GUN|MG|LMG|SAW)\\b')`,
      actionType: 'Automatic'
    }
  ];
  
  let totalUpdated = 0;
  const actionTypeStats: { [key: string]: number } = {};
  
  // Process each action type pattern
  for (const query of actionTypeQueries) {
    console.log(`🔍 Processing ${query.actionType} patterns...`);
    
    const result = await db.execute(`
      UPDATE products 
      SET action_type = '${query.actionType}' 
      WHERE department_number = '05' 
      AND (action_type IS NULL OR action_type = '')
      AND ${query.pattern}
    `);
    
    const updatedCount = (result as any).rowCount || 0;
    totalUpdated += updatedCount;
    actionTypeStats[query.actionType] = updatedCount;
    
    console.log(`✅ Updated ${updatedCount} products with "${query.actionType}" action type`);
  }
  
  // Get final statistics
  const totalLongGuns = await db.execute(`
    SELECT COUNT(*) as total 
    FROM products 
    WHERE department_number = '05'
  `);
  
  const withActionType = await db.execute(`
    SELECT COUNT(*) as count 
    FROM products 
    WHERE department_number = '05' 
    AND action_type IS NOT NULL 
    AND action_type != ''
  `);
  
  const total = (totalLongGuns as any).rows[0].total;
  const extracted = (withActionType as any).rows[0].count;
  const coverage = (extracted / total * 100).toFixed(1);
  
  console.log(`\n📊 Final Statistics:`);
  console.log(`   Total long guns: ${total}`);
  console.log(`   Products with action type: ${extracted}`);
  console.log(`   Coverage: ${coverage}%`);
  console.log(`   Products updated this run: ${totalUpdated}`);
  
  console.log(`\n📊 Action Type Distribution:`);
  Object.entries(actionTypeStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([actionType, count]) => {
      console.log(`   ${actionType}: ${count} products`);
    });
  
  return {
    total: parseInt(total),
    extracted: parseInt(extracted),
    updated: totalUpdated,
    coverage: coverage,
    stats: actionTypeStats
  };
}

// Run the extraction
extractActionTypesBatch()
  .then((result) => {
    console.log('✅ Batch action type extraction completed');
    console.log(`🎯 Final coverage: ${result.coverage}% (${result.extracted}/${result.total} products)`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Batch action type extraction failed:', error);
    process.exit(1);
  });

export { extractActionTypesBatch };