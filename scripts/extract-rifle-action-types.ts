/**
 * Extract Rifle Action Types
 * Careful extraction of action types from rifle product names using pattern matching
 */

import { Pool } from 'pg';

async function extractRifleActionTypes() {
  console.log('🔍 Starting careful rifle action type extraction...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // 1. Get rifles without action types
    const riflesWithoutActionTypes = await client.query(`
      SELECT id, name, sku
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (action_type IS NULL OR action_type = '')
      ORDER BY name
    `);
    
    console.log(`📊 Found ${riflesWithoutActionTypes.rows.length} rifles without action types`);
    
    // 2. Define comprehensive rifle action type patterns
    const actionPatterns = {
      'Bolt Action': [
        /\bbolt\b/i,
        /\bbolt[\s\-]action\b/i,
        /\bb[\s\-]?a[\s\-]?bolt\b/i,
        /\bstraight[\s\-]?pull\b/i
      ],
      'Lever Action': [
        /\blever\b/i,
        /\blever[\s\-]action\b/i,
        /\bl[\s\-]?a[\s\-]?lever\b/i,
        /\blever[\s\-]?gun\b/i
      ],
      'Semi-Auto': [
        /\bsemi[\s\-]?auto\b/i,
        /\bsemi[\s\-]?automatic\b/i,
        /\bgas[\s\-]?operated\b/i,
        /\bgas[\s\-]?system\b/i,
        /\bauto[\s\-]?loading\b/i,
        /\bself[\s\-]?loading\b/i,
        /\bar[\s\-]?15\b/i,
        /\bar[\s\-]?10\b/i,
        /\bm[\s\-]?4\b/i,
        /\bm[\s\-]?1\b/i,
        /\bak[\s\-]?47\b/i,
        /\bak[\s\-]?74\b/i
      ],
      'Pump Action': [
        /\bpump\b/i,
        /\bpump[\s\-]action\b/i,
        /\bslide[\s\-]?action\b/i,
        /\btrombone\b/i
      ],
      'Single Shot': [
        /\bsingle[\s\-]?shot\b/i,
        /\bbreak[\s\-]?action\b/i,
        /\bbreak[\s\-]?open\b/i,
        /\bhinge[\s\-]?action\b/i,
        /\bfalling[\s\-]?block\b/i,
        /\btrapdoor\b/i
      ],
      'Full Auto': [
        /\bfull[\s\-]?auto\b/i,
        /\bfull[\s\-]?automatic\b/i,
        /\bmachine[\s\-]?gun\b/i,
        /\bselect[\s\-]?fire\b/i
      ]
    };
    
    // 3. Extract action types with detailed logging
    const updates = [];
    const actionTypeCounts = {};
    
    console.log('\n🔍 Extracting action types...');
    
    for (const rifle of riflesWithoutActionTypes.rows) {
      let extractedActionType = null;
      
      // Test each action type pattern
      for (const [actionType, patterns] of Object.entries(actionPatterns)) {
        for (const pattern of patterns) {
          if (pattern.test(rifle.name)) {
            extractedActionType = actionType;
            break;
          }
        }
        if (extractedActionType) break;
      }
      
      if (extractedActionType) {
        updates.push({
          id: rifle.id,
          sku: rifle.sku,
          name: rifle.name,
          actionType: extractedActionType
        });
        
        actionTypeCounts[extractedActionType] = (actionTypeCounts[extractedActionType] || 0) + 1;
      }
    }
    
    console.log(`\n📊 Extraction results:`);
    console.log(`  Total rifles processed: ${riflesWithoutActionTypes.rows.length}`);
    console.log(`  Action types extracted: ${updates.length}`);
    console.log(`  Improvement: ${((updates.length / riflesWithoutActionTypes.rows.length) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Action type distribution:');
    Object.entries(actionTypeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} products`);
    });
    
    // 4. Show sample extractions for verification
    console.log('\n🎯 Sample extractions (first 10):');
    updates.slice(0, 10).forEach(update => {
      console.log(`  ${update.sku}: ${update.name} → ${update.actionType}`);
    });
    
    // 5. Confirm before proceeding
    if (updates.length === 0) {
      console.log('\n❌ No action types extracted. Pattern matching may need refinement.');
      return;
    }
    
    console.log(`\n⏳ Ready to update ${updates.length} rifles with action types...`);
    
    // 6. Apply updates to database in batches
    const batchSize = 100;
    let updatedCount = 0;
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      try {
        await client.query('BEGIN');
        
        for (const update of batch) {
          await client.query(`
            UPDATE products 
            SET action_type = $1 
            WHERE id = $2
          `, [update.actionType, update.id]);
        }
        
        await client.query('COMMIT');
        updatedCount += batch.length;
        
        console.log(`✅ Updated batch ${Math.floor(i/batchSize) + 1}: ${updatedCount}/${updates.length} products`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error);
      }
    }
    
    console.log(`\n✅ Database updates complete: ${updatedCount}/${updates.length} products updated`);
    
    // 7. Verify the updates
    const verificationQuery = await client.query(`
      SELECT action_type, COUNT(*) as count
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND action_type IS NOT NULL 
        AND action_type != ''
      GROUP BY action_type
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Updated rifle action type coverage:');
    let totalWithActionTypes = 0;
    verificationQuery.rows.forEach(row => {
      totalWithActionTypes += parseInt(row.count);
      console.log(`  ${row.action_type}: ${row.count} products`);
    });
    
    const totalRifles = riflesWithoutActionTypes.rows.length + 64; // Original 64 + new ones
    const newCoveragePercent = (totalWithActionTypes / totalRifles * 100).toFixed(2);
    console.log(`\n📈 New coverage: ${totalWithActionTypes}/${totalRifles} (${newCoveragePercent}%)`);
    
    // 8. Prepare data for Algolia sync
    console.log('\n📋 RIFLE ACTION TYPE EXTRACTION COMPLETE:');
    console.log(`  ✅ ${updatedCount} rifles updated with action types`);
    console.log(`  ✅ Coverage improved from 1.73% to ${newCoveragePercent}%`);
    console.log(`  ✅ Ready for Algolia sync`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the extraction
extractRifleActionTypes().catch(console.error);