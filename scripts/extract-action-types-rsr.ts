/**
 * RSR-Based Action Type Extraction
 * Extract action types based on actual RSR product naming conventions
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function extractActionTypesRSR() {
  console.log('🔧 Starting RSR-based action type extraction...');
  
  // Define action type patterns based on actual RSR naming conventions
  const actionTypeUpdates = [
    // Semi-Automatic patterns (specific to RSR naming)
    {
      sql: `UPDATE products SET action_type = 'Semi-Auto' WHERE department_number = '05' AND (action_type IS NULL OR action_type = '') AND (
        name ~* 'RUGER 10/22' OR 
        name ~* 'RRA LAR-15' OR 
        name ~* 'AK RECEIVER' OR 
        name ~* 'AR-15' OR 
        name ~* 'M4' OR 
        name ~* 'TACSOL' OR
        name ~* 'SEEKINS' OR
        name ~* 'RISE' OR
        name ~* 'SHARPS' OR
        name ~* 'DANIEL' OR
        name ~* 'LWRC' OR
        name ~* 'AERO' OR
        name ~* 'CMMG' OR
        name ~* 'SPIKE' OR
        name ~* 'LANTAC' OR
        name ~* 'PWS' OR
        name ~* 'STAG' OR
        name ~* 'ARML' OR
        name ~* 'FAXON' OR
        name ~* 'GEISLE' OR
        name ~* 'TROY' OR
        name ~* 'FORTIS' OR
        name ~* 'ODIN' OR
        name ~* 'RADIAN' OR
        name ~* 'SOLGW' OR
        name ~* 'NEMO' OR
        name ~* 'Q\\\\b' OR
        name ~* 'POF' OR
        name ~* 'CENTAR' OR
        name ~* 'MAXIM' OR
        name ~* 'DSARMS' OR
        name ~* 'SANTAN' OR
        name ~* 'BRAVO' OR
        name ~* 'APF' OR
        name ~* 'RLYDEF' OR
        name ~* 'ADM' OR
        name ~* 'PTR91' OR
        name ~* 'GGP' OR
        name ~* 'ARMSCR' OR
        name ~* 'ARSEN' OR
        name ~* 'TPRCSN' OR
        name ~* 'WTCHF1' OR
        name ~* 'FREORD' OR
        name ~* 'RISE' OR
        name ~* 'BTLARM' OR
        name ~* 'WC' OR
        name ~* 'AMTAC' OR
        name ~* 'FIGHT' OR
        name ~* 'FMK' OR
        name ~* 'BALLIS' OR
        name ~* 'FNLE' OR
        name ~* 'GIRSAN' OR
        name ~* 'MASTER' OR
        name ~* 'SHRKTC' OR
        name ~* 'WALTHR' OR
        name ~* 'WMD' OR
        name ~* 'ZENITH' OR
        name ~* 'AGENCY' OR
        name ~* 'BERSA' OR
        name ~* 'BOOTLE' OR
        name ~* 'CHARL'
      )`,
      actionType: 'Semi-Auto'
    },
    
    // Bolt Action patterns (RSR naming)
    {
      sql: `UPDATE products SET action_type = 'Bolt Action' WHERE department_number = '05' AND (action_type IS NULL OR action_type = '') AND (
        name ~* 'BERGARA' OR 
        name ~* 'REM 700' OR 
        name ~* 'RUGER HWKEYE' OR 
        name ~* 'SAV 110' OR 
        name ~* 'SAVAGE' OR 
        name ~* 'TIKKA' OR 
        name ~* 'CHRISTENSEN' OR 
        name ~* 'HOWA' OR 
        name ~* 'WEATHERBY' OR 
        name ~* 'CZ' OR 
        name ~* 'STEYR' OR 
        name ~* 'KIMBER' OR 
        name ~* 'BROWNING' OR 
        name ~* 'WINCHESTER' OR 
        name ~* 'MARLIN' OR 
        name ~* 'THOMPSON' OR 
        name ~* 'CVA CASCADE' OR
        name ~* 'PRECISION' OR
        name ~* 'LONG RANGE' OR
        name ~* 'HUNTER' OR
        name ~* 'VARMINT' OR
        name ~* 'TARGET' OR
        name ~* 'TACTICAL' OR
        name ~* 'SNIPER' OR
        name ~* 'SCOUT'
      )`,
      actionType: 'Bolt Action'
    },
    
    // Lever Action patterns (RSR naming)
    {
      sql: `UPDATE products SET action_type = 'Lever Action' WHERE department_number = '05' AND (action_type IS NULL OR action_type = '') AND (
        name ~* 'HENRY' OR 
        name ~* 'MARLIN' OR 
        name ~* 'WINCHESTER' OR 
        name ~* 'ROSSI GALLERY' OR 
        name ~* 'LEVER' OR 
        name ~* 'REPEATER' OR 
        name ~* 'COWBOY' OR 
        name ~* 'RANCH' OR 
        name ~* '30-30' OR 
        name ~* '45-70' OR 
        name ~* '44 MAG' OR 
        name ~* '357 MAG' OR 
        name ~* '22 LR.*LEVER' OR 
        name ~* '22LR.*LEVER'
      )`,
      actionType: 'Lever Action'
    },
    
    // Pump Action patterns (RSR naming)
    {
      sql: `UPDATE products SET action_type = 'Pump Action' WHERE department_number = '05' AND (action_type IS NULL OR action_type = '') AND (
        name ~* 'MSBRG 590' OR 
        name ~* 'MOSSBERG 500' OR 
        name ~* 'REMINGTON 870' OR 
        name ~* 'WINCHESTER SXP' OR 
        name ~* 'BENELLI NOVA' OR 
        name ~* 'BENELLI SUPERNOVA' OR 
        name ~* 'PUMP' OR 
        name ~* 'SLIDE ACTION' OR 
        name ~* 'TACTICAL' OR 
        name ~* 'FIELD' OR 
        name ~* 'SECURITY' OR 
        name ~* 'DEFENSE' OR 
        name ~* 'COMBAT' OR 
        name ~* 'MARINE' OR 
        name ~* 'MAGNUM' OR 
        name ~* 'EXPRESS' OR 
        name ~* 'WINGMASTER' OR 
        name ~* 'SUPER MAG'
      )`,
      actionType: 'Pump Action'
    },
    
    // Single Shot patterns (RSR naming)
    {
      sql: `UPDATE products SET action_type = 'Single Shot' WHERE department_number = '05' AND (action_type IS NULL OR action_type = '') AND (
        name ~* 'CVA' OR 
        name ~* 'THOMPSON' OR 
        name ~* 'TRADITIONS' OR 
        name ~* 'HARRINGTON' OR 
        name ~* 'H&R' OR 
        name ~* 'NEF' OR 
        name ~* 'SINGLE' OR 
        name ~* 'BREAK' OR 
        name ~* 'HINGE' OR 
        name ~* 'ENCORE' OR 
        name ~* 'CONTENDER' OR 
        name ~* 'SCOUT' OR 
        name ~* 'VARMINT' OR 
        name ~* 'ULTRA' OR 
        name ~* 'TOPPER' OR 
        name ~* 'PARDNER' OR 
        name ~* 'SURVIVOR' OR 
        name ~* 'YOUTH' OR 
        name ~* 'COMPACT' OR 
        name ~* 'LITTLE'
      )`,
      actionType: 'Single Shot'
    },
    
    // Double Barrel patterns (RSR naming)
    {
      sql: `UPDATE products SET action_type = 'Double Barrel' WHERE department_number = '05' AND (action_type IS NULL OR action_type = '') AND (
        name ~* 'BRN CYNERGY' OR 
        name ~* 'BRN MAXUS' OR 
        name ~* 'BERETTA' OR 
        name ~* 'BENELLI' OR 
        name ~* 'BROWNING' OR 
        name ~* 'CZ' OR 
        name ~* 'STOEGER' OR 
        name ~* 'DOUBLE' OR 
        name ~* 'SIDE BY SIDE' OR 
        name ~* 'SXS' OR 
        name ~* 'OVER UNDER' OR 
        name ~* 'O/U' OR 
        name ~* 'SILVER' OR 
        name ~* 'GOLD' OR 
        name ~* 'ULTRA' OR 
        name ~* 'SUPREME' OR 
        name ~* 'SPORTING' OR 
        name ~* 'FIELD' OR 
        name ~* 'GAME' OR 
        name ~* 'UPLAND' OR 
        name ~* 'WATERFOWL' OR 
        name ~* 'HUNTER' OR 
        name ~* 'COMPETITION' OR 
        name ~* 'TRAP' OR 
        name ~* 'SKEET' OR 
        name ~* 'SPORTING CLAYS'
      )`,
      actionType: 'Double Barrel'
    },
    
    // Manual Action patterns (RSR naming)
    {
      sql: `UPDATE products SET action_type = 'Manual Action' WHERE department_number = '05' AND (action_type IS NULL OR action_type = '') AND (
        name ~* 'STRAIGHT PULL' OR 
        name ~* 'BLASER' OR 
        name ~* 'MERKEL' OR 
        name ~* 'HEYM' OR 
        name ~* 'MANUAL' OR 
        name ~* 'HAND' OR 
        name ~* 'ROLLING BLOCK' OR 
        name ~* 'FALLING BLOCK' OR 
        name ~* 'TRAPDOOR' OR 
        name ~* 'SINGLE SHOT' OR 
        name ~* 'BREAK ACTION' OR 
        name ~* 'PIVOT' OR 
        name ~* 'HINGE' OR 
        name ~* 'TIP UP' OR 
        name ~* 'DROP BLOCK'
      )`,
      actionType: 'Manual Action'
    }
  ];
  
  let totalUpdated = 0;
  const actionTypeStats: { [key: string]: number } = {};
  
  // Execute each update query
  for (const update of actionTypeUpdates) {
    console.log(`🔍 Processing ${update.actionType} patterns...`);
    
    try {
      const result = await db.execute(update.sql);
      const updatedCount = (result as any).rowCount || 0;
      totalUpdated += updatedCount;
      actionTypeStats[update.actionType] = updatedCount;
      
      console.log(`✅ Updated ${updatedCount} products with "${update.actionType}" action type`);
    } catch (error) {
      console.error(`❌ Error updating ${update.actionType}:`, error);
    }
  }
  
  // Get final statistics
  const totalResult = await db.execute(`
    SELECT COUNT(*) as total 
    FROM products 
    WHERE department_number = '05'
  `);
  
  const withActionTypeResult = await db.execute(`
    SELECT COUNT(*) as count 
    FROM products 
    WHERE department_number = '05' 
    AND action_type IS NOT NULL 
    AND action_type != ''
  `);
  
  const total = (totalResult as any).rows[0].total;
  const extracted = (withActionTypeResult as any).rows[0].count;
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
  
  // Show distribution by action type in database
  const distributionResult = await db.execute(`
    SELECT action_type, COUNT(*) as count
    FROM products 
    WHERE department_number = '05' 
    AND action_type IS NOT NULL 
    AND action_type != ''
    GROUP BY action_type
    ORDER BY count DESC
  `);
  
  console.log(`\n📊 Current Action Type Distribution in Database:`);
  (distributionResult as any).rows.forEach((row: any) => {
    console.log(`   ${row.action_type}: ${row.count} products`);
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
extractActionTypesRSR()
  .then((result) => {
    console.log('✅ RSR-based action type extraction completed');
    console.log(`🎯 Final coverage: ${result.coverage}% (${result.extracted}/${result.total} products)`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ RSR-based action type extraction failed:', error);
    process.exit(1);
  });

export { extractActionTypesRSR };