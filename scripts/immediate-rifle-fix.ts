/**
 * Immediate Rifle Filter Fix
 * Fast extraction of rifle filters with direct database updates and Algolia sync
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { algoliasearch } from 'algoliasearch';

const client = algoliasearch(process.env.ALGOLIA_APP_ID!, process.env.ALGOLIA_API_KEY!);

// Fast rifle filter extraction
function extractRifleFilters(name: string) {
  const filters = {
    barrelLength: null as string | null,
    finish: null as string | null,
    frameSize: null as string | null,
    actionType: null as string | null,
    sightType: null as string | null
  };
  
  // Barrel length - look for number followed by "
  const barrelMatch = name.match(/(\d+(?:\.\d+)?)\s*["″'']/);
  if (barrelMatch) {
    const length = parseFloat(barrelMatch[1]);
    if (length >= 10 && length <= 50) {
      filters.barrelLength = `${length}"`;
    }
  }
  
  // Finish - simple but effective patterns
  if (/\b(?:black|blk)\b/gi.test(name)) filters.finish = 'Black';
  else if (/\b(?:stainless|ss)\b/gi.test(name)) filters.finish = 'Stainless Steel';
  else if (/\b(?:fde|flat dark earth)\b/gi.test(name)) filters.finish = 'FDE';
  else if (/\b(?:od green|odg|olive)\b/gi.test(name)) filters.finish = 'OD Green';
  else if (/\b(?:bronze|brz)\b/gi.test(name)) filters.finish = 'Bronze';
  else if (/\b(?:tan|desert)\b/gi.test(name)) filters.finish = 'Tan';
  else if (/\b(?:coyote|brown)\b/gi.test(name)) filters.finish = 'Coyote';
  else if (/\b(?:gray|grey|gunmetal)\b/gi.test(name)) filters.finish = 'Gray';
  else if (/\b(?:blue|blued)\b/gi.test(name)) filters.finish = 'Blue';
  else if (/\b(?:wood|wooden|walnut)\b/gi.test(name)) filters.finish = 'Wood';
  else if (/\b(?:camo|camouflage)\b/gi.test(name)) filters.finish = 'Camouflage';
  
  // Frame size - rifle specific
  if (/\b(?:carbine|carb)\b/gi.test(name)) filters.frameSize = 'Carbine';
  else if (/\b(?:tactical|tac)\b/gi.test(name)) filters.frameSize = 'Tactical';
  else if (/\b(?:precision|target|match)\b/gi.test(name)) filters.frameSize = 'Precision';
  else if (/\b(?:hunting|hunt)\b/gi.test(name)) filters.frameSize = 'Hunting';
  else if (/\b(?:scout|patrol)\b/gi.test(name)) filters.frameSize = 'Scout';
  else if (/\b(?:standard|std)\b/gi.test(name)) filters.frameSize = 'Standard';
  else if (/\b(?:rifle)\b/gi.test(name)) filters.frameSize = 'Rifle';
  
  // Action type
  if (/\b(?:semi-auto|semi|auto)\b/gi.test(name)) filters.actionType = 'Semi-Auto';
  else if (/\b(?:bolt action|bolt)\b/gi.test(name)) filters.actionType = 'Bolt Action';
  else if (/\b(?:lever action|lever)\b/gi.test(name)) filters.actionType = 'Lever Action';
  else if (/\b(?:pump action|pump)\b/gi.test(name)) filters.actionType = 'Pump Action';
  else if (/\b(?:single shot|single)\b/gi.test(name)) filters.actionType = 'Single Shot';
  
  // Sight type
  if (/\b(?:scope|scoped|optic)\b/gi.test(name)) filters.sightType = 'Scope';
  else if (/\b(?:iron sights|irons)\b/gi.test(name)) filters.sightType = 'Iron Sights';
  else if (/\b(?:red dot|rds)\b/gi.test(name)) filters.sightType = 'Red Dot';
  else if (/\b(?:open sights|open)\b/gi.test(name)) filters.sightType = 'Open Sights';
  else if (/\b(?:no sights|bare)\b/gi.test(name)) filters.sightType = 'No Sights';
  
  return filters;
}

async function immediateRifleFix() {
  console.log('🚀 Starting immediate rifle filter fix...');
  
  // Get all rifles without filter data
  const riflesNeedingFilters = await db.execute(sql`
    SELECT id, name, sku
    FROM products 
    WHERE department_number = '05'
    AND (barrel_length IS NULL OR finish IS NULL OR frame_size IS NULL OR action_type IS NULL OR sight_type IS NULL)
    ORDER BY id
  `);
  
  console.log(`📊 Found ${riflesNeedingFilters.rows.length} rifles needing filter data`);
  
  let updated = 0;
  const algoliaUpdates = [];
  
  // Process all rifles
  for (const rifle of riflesNeedingFilters.rows) {
    const filters = extractRifleFilters(rifle.name);
    
    if (filters.barrelLength || filters.finish || filters.frameSize || filters.actionType || filters.sightType) {
      // Update database
      await db.execute(sql`
        UPDATE products 
        SET 
          barrel_length = COALESCE(barrel_length, ${filters.barrelLength}),
          finish = COALESCE(finish, ${filters.finish}),
          frame_size = COALESCE(frame_size, ${filters.frameSize}),
          action_type = COALESCE(action_type, ${filters.actionType}),
          sight_type = COALESCE(sight_type, ${filters.sightType})
        WHERE id = ${rifle.id}
      `);
      
      // Prepare Algolia update
      algoliaUpdates.push({
        objectID: rifle.sku,
        barrelLength: filters.barrelLength,
        finish: filters.finish,
        frameSize: filters.frameSize,
        actionType: filters.actionType,
        sightType: filters.sightType
      });
      
      updated++;
      
      if (updated % 100 === 0) {
        console.log(`   ✅ Updated ${updated}/${riflesNeedingFilters.rows.length} rifles`);
      }
    }
  }
  
  console.log(`\n🔄 Syncing ${algoliaUpdates.length} rifle updates to Algolia...`);
  
  // Sync to Algolia in batches
  const batchSize = 200;
  for (let i = 0; i < algoliaUpdates.length; i += batchSize) {
    const batch = algoliaUpdates.slice(i, i + batchSize);
    
    await client.partialUpdateObjects({
      indexName: 'products',
      objects: batch
    });
    
    console.log(`   ✅ Algolia: ${Math.min(i + batchSize, algoliaUpdates.length)}/${algoliaUpdates.length} synced`);
  }
  
  // Final stats
  const finalStats = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      COUNT(barrel_length) as with_barrel_length,
      COUNT(finish) as with_finish,
      COUNT(frame_size) as with_frame_size,
      COUNT(action_type) as with_action_type,
      COUNT(sight_type) as with_sight_type
    FROM products 
    WHERE department_number = '05'
  `);
  
  const stats = finalStats.rows[0];
  console.log(`\n🎉 Immediate rifle filter fix completed!`);
  console.log(`   - Updated: ${updated} rifles`);
  console.log(`   - Synced to Algolia: ${algoliaUpdates.length} rifles`);
  console.log(`\n📈 New rifle filter coverage:`);
  console.log(`   - Total rifles: ${stats.total}`);
  console.log(`   - Barrel Length: ${stats.with_barrel_length} (${(stats.with_barrel_length/stats.total*100).toFixed(1)}%)`);
  console.log(`   - Finish: ${stats.with_finish} (${(stats.with_finish/stats.total*100).toFixed(1)}%)`);
  console.log(`   - Frame Size: ${stats.with_frame_size} (${(stats.with_frame_size/stats.total*100).toFixed(1)}%)`);
  console.log(`   - Action Type: ${stats.with_action_type} (${(stats.with_action_type/stats.total*100).toFixed(1)}%)`);
  console.log(`   - Sight Type: ${stats.with_sight_type} (${(stats.with_sight_type/stats.total*100).toFixed(1)}%)`);
}

immediateRifleFix().catch(console.error);