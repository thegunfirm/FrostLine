/**
 * Complete Filter Extraction for All Categories
 * Apply SQL-based pattern matching to handguns, optics, ammunition, and all other categories
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { algoliasearch } from 'algoliasearch';

const client = algoliasearch(process.env.ALGOLIA_APP_ID!, process.env.ALGOLIA_API_KEY!);

async function extractAllCategoryFilters() {
  console.log('🚀 Starting complete filter extraction for all categories...');
  
  // Get category breakdown
  const categoryStats = await db.execute(sql`
    SELECT 
      department_number,
      subcategory_name,
      COUNT(*) as total,
      COUNT(barrel_length) as with_barrel_length,
      COUNT(finish) as with_finish,
      COUNT(frame_size) as with_frame_size,
      COUNT(action_type) as with_action_type,
      COUNT(sight_type) as with_sight_type,
      COUNT(caliber) as with_caliber,
      COUNT(capacity) as with_capacity
    FROM products 
    WHERE department_number IS NOT NULL
    GROUP BY department_number, subcategory_name
    ORDER BY department_number
  `);
  
  console.log('\n📊 Current Filter Coverage by Category:');
  categoryStats.rows.forEach(row => {
    console.log(`${row.department_number} - ${row.subcategory_name}: ${row.total} products`);
    console.log(`  Barrel: ${row.with_barrel_length} (${(row.with_barrel_length/row.total*100).toFixed(1)}%)`);
    console.log(`  Finish: ${row.with_finish} (${(row.with_finish/row.total*100).toFixed(1)}%)`);
    console.log(`  Frame: ${row.with_frame_size} (${(row.with_frame_size/row.total*100).toFixed(1)}%)`);
    console.log(`  Action: ${row.with_action_type} (${(row.with_action_type/row.total*100).toFixed(1)}%)`);
    console.log(`  Sight: ${row.with_sight_type} (${(row.with_sight_type/row.total*100).toFixed(1)}%)`);
    console.log(`  Caliber: ${row.with_caliber} (${(row.with_caliber/row.total*100).toFixed(1)}%)`);
    console.log(`  Capacity: ${row.with_capacity} (${(row.with_capacity/row.total*100).toFixed(1)}%)`);
  });
  
  // 1. HANDGUNS (Department 01) - Enhanced extraction
  console.log('\n🔫 Processing Handguns (Department 01)...');
  
  // Handgun barrel lengths
  const handgunBarrelResult = await db.execute(sql`
    UPDATE products 
    SET barrel_length = SUBSTRING(name FROM '([0-9]+(?:\\.[0-9]+)?)\\s*[\"″'']')
    WHERE department_number = '01'
    AND barrel_length IS NULL
    AND name ~ '[0-9]+(?:\\.[0-9]+)?\\s*[\"″'']'
  `);
  console.log(`✅ Handgun barrel lengths: ${handgunBarrelResult.rowCount} updated`);
  
  // Handgun finishes
  const handgunFinishResult = await db.execute(sql`
    UPDATE products 
    SET finish = CASE 
      WHEN name ILIKE '%black%' OR name ILIKE '%blk%' THEN 'Black'
      WHEN name ILIKE '%stainless%' OR name ILIKE '%ss%' THEN 'Stainless Steel'
      WHEN name ILIKE '%fde%' OR name ILIKE '%flat dark earth%' THEN 'FDE'
      WHEN name ILIKE '%od green%' OR name ILIKE '%odg%' OR name ILIKE '%olive%' THEN 'OD Green'
      WHEN name ILIKE '%bronze%' OR name ILIKE '%brz%' THEN 'Bronze'
      WHEN name ILIKE '%tan%' OR name ILIKE '%desert%' THEN 'Tan'
      WHEN name ILIKE '%coyote%' OR name ILIKE '%brown%' THEN 'Coyote'
      WHEN name ILIKE '%gray%' OR name ILIKE '%grey%' OR name ILIKE '%gunmetal%' THEN 'Gray'
      WHEN name ILIKE '%blue%' OR name ILIKE '%blued%' THEN 'Blue'
      WHEN name ILIKE '%nickel%' OR name ILIKE '%chrome%' THEN 'Nickel'
      WHEN name ILIKE '%cerakote%' OR name ILIKE '%ceramic%' THEN 'Cerakote'
      WHEN name ILIKE '%two tone%' OR name ILIKE '%2-tone%' THEN 'Two-Tone'
      ELSE finish
    END
    WHERE department_number = '01'
  `);
  console.log(`✅ Handgun finishes: ${handgunFinishResult.rowCount} updated`);
  
  // Handgun frame sizes
  const handgunFrameResult = await db.execute(sql`
    UPDATE products 
    SET frame_size = CASE 
      WHEN name ILIKE '%full size%' OR name ILIKE '%full%' THEN 'Full Size'
      WHEN name ILIKE '%compact%' OR name ILIKE '%comp%' THEN 'Compact'
      WHEN name ILIKE '%subcompact%' OR name ILIKE '%sub%' THEN 'Subcompact'
      WHEN name ILIKE '%micro%' OR name ILIKE '%pocket%' THEN 'Micro'
      WHEN name ILIKE '%commander%' OR name ILIKE '%cmd%' THEN 'Commander'
      WHEN name ILIKE '%officer%' OR name ILIKE '%off%' THEN 'Officer'
      WHEN name ILIKE '%government%' OR name ILIKE '%govt%' THEN 'Government'
      WHEN name ILIKE '%carry%' THEN 'Carry'
      ELSE frame_size
    END
    WHERE department_number = '01'
  `);
  console.log(`✅ Handgun frame sizes: ${handgunFrameResult.rowCount} updated`);
  
  // Handgun action types
  const handgunActionResult = await db.execute(sql`
    UPDATE products 
    SET action_type = CASE 
      WHEN name ILIKE '%striker%' OR name ILIKE '%strike%' THEN 'Striker Fired'
      WHEN name ILIKE '%da/sa%' OR name ILIKE '%double action%' THEN 'DA/SA'
      WHEN name ILIKE '%single action%' OR name ILIKE '%sa%' THEN 'Single Action'
      WHEN name ILIKE '%revolver%' OR name ILIKE '%rev%' THEN 'Revolver'
      WHEN name ILIKE '%semi-auto%' OR name ILIKE '%semi%' THEN 'Semi-Auto'
      ELSE action_type
    END
    WHERE department_number = '01'
  `);
  console.log(`✅ Handgun action types: ${handgunActionResult.rowCount} updated`);
  
  // 2. OPTICS (Department 08) - Enhanced extraction
  console.log('\n🔭 Processing Optics (Department 08)...');
  
  // Optics magnification
  const opticsMagResult = await db.execute(sql`
    UPDATE products 
    SET barrel_length = SUBSTRING(name FROM '([0-9]+(?:\\.[0-9]+)?x[0-9]+(?:\\.[0-9]+)?)')
    WHERE department_number = '08'
    AND barrel_length IS NULL
    AND name ~ '[0-9]+(?:\\.[0-9]+)?x[0-9]+(?:\\.[0-9]+)?'
  `);
  console.log(`✅ Optics magnification: ${opticsMagResult.rowCount} updated`);
  
  // Optics types
  const opticsTypeResult = await db.execute(sql`
    UPDATE products 
    SET frame_size = CASE 
      WHEN name ILIKE '%red dot%' OR name ILIKE '%rds%' THEN 'Red Dot'
      WHEN name ILIKE '%scope%' OR name ILIKE '%riflescope%' THEN 'Scope'
      WHEN name ILIKE '%reflex%' OR name ILIKE '%holographic%' THEN 'Reflex'
      WHEN name ILIKE '%thermal%' OR name ILIKE '%ir%' THEN 'Thermal'
      WHEN name ILIKE '%night vision%' OR name ILIKE '%nv%' THEN 'Night Vision'
      WHEN name ILIKE '%laser%' THEN 'Laser'
      WHEN name ILIKE '%binocular%' OR name ILIKE '%bino%' THEN 'Binocular'
      WHEN name ILIKE '%monocular%' OR name ILIKE '%mono%' THEN 'Monocular'
      ELSE frame_size
    END
    WHERE department_number = '08'
  `);
  console.log(`✅ Optics types: ${opticsTypeResult.rowCount} updated`);
  
  // 3. AMMUNITION (Department 18) - Enhanced extraction
  console.log('\n🔫 Processing Ammunition (Department 18)...');
  
  // Ammunition calibers
  const ammoCaliberResult = await db.execute(sql`
    UPDATE products 
    SET caliber = CASE 
      WHEN name ILIKE '%9mm%' OR name ILIKE '%9x19%' THEN '9mm'
      WHEN name ILIKE '%45 acp%' OR name ILIKE '%45acp%' OR name ILIKE '%.45%' THEN '.45 ACP'
      WHEN name ILIKE '%40 s&w%' OR name ILIKE '%40sw%' OR name ILIKE '%.40%' THEN '.40 S&W'
      WHEN name ILIKE '%380%' OR name ILIKE '%.380%' THEN '.380 ACP'
      WHEN name ILIKE '%357%' OR name ILIKE '%.357%' THEN '.357 Magnum'
      WHEN name ILIKE '%38%' OR name ILIKE '%.38%' THEN '.38 Special'
      WHEN name ILIKE '%223%' OR name ILIKE '%.223%' THEN '.223 Remington'
      WHEN name ILIKE '%5.56%' OR name ILIKE '%556%' THEN '5.56 NATO'
      WHEN name ILIKE '%308%' OR name ILIKE '%.308%' THEN '.308 Winchester'
      WHEN name ILIKE '%7.62%' OR name ILIKE '%762%' THEN '7.62x39'
      WHEN name ILIKE '%12ga%' OR name ILIKE '%12 ga%' THEN '12 Gauge'
      WHEN name ILIKE '%20ga%' OR name ILIKE '%20 ga%' THEN '20 Gauge'
      WHEN name ILIKE '%22lr%' OR name ILIKE '%22 lr%' THEN '.22 LR'
      WHEN name ILIKE '%22wmr%' OR name ILIKE '%22 wmr%' THEN '.22 WMR'
      WHEN name ILIKE '%300%' OR name ILIKE '%.300%' THEN '.300 AAC'
      ELSE caliber
    END
    WHERE department_number = '18'
  `);
  console.log(`✅ Ammunition calibers: ${ammoCaliberResult.rowCount} updated`);
  
  // Ammunition types
  const ammoTypeResult = await db.execute(sql`
    UPDATE products 
    SET frame_size = CASE 
      WHEN name ILIKE '%fmj%' OR name ILIKE '%full metal jacket%' THEN 'FMJ'
      WHEN name ILIKE '%jhp%' OR name ILIKE '%hollow point%' THEN 'JHP'
      WHEN name ILIKE '%hp%' OR name ILIKE '%hollow%' THEN 'HP'
      WHEN name ILIKE '%sp%' OR name ILIKE '%soft point%' THEN 'SP'
      WHEN name ILIKE '%match%' OR name ILIKE '%target%' THEN 'Match'
      WHEN name ILIKE '%defense%' OR name ILIKE '%self defense%' THEN 'Defense'
      WHEN name ILIKE '%hunting%' OR name ILIKE '%hunt%' THEN 'Hunting'
      WHEN name ILIKE '%training%' OR name ILIKE '%practice%' THEN 'Training'
      WHEN name ILIKE '%subsonic%' OR name ILIKE '%sub%' THEN 'Subsonic'
      ELSE frame_size
    END
    WHERE department_number = '18'
  `);
  console.log(`✅ Ammunition types: ${ammoTypeResult.rowCount} updated`);
  
  // 4. ACCESSORIES (Departments 09, 10, 11, 12, 13, 14, 17, 20, 21, 25, 26, 27, 30, 31, 35)
  console.log('\n🔧 Processing Accessories (Multiple Departments)...');
  
  // Accessory types for all accessory departments
  const accessoryTypeResult = await db.execute(sql`
    UPDATE products 
    SET frame_size = CASE 
      WHEN name ILIKE '%holster%' OR name ILIKE '%iwb%' OR name ILIKE '%owb%' THEN 'Holster'
      WHEN name ILIKE '%magazine%' OR name ILIKE '%mag%' THEN 'Magazine'
      WHEN name ILIKE '%grip%' OR name ILIKE '%handle%' THEN 'Grip'
      WHEN name ILIKE '%stock%' OR name ILIKE '%buttstock%' THEN 'Stock'
      WHEN name ILIKE '%bipod%' OR name ILIKE '%rest%' THEN 'Bipod'
      WHEN name ILIKE '%sling%' OR name ILIKE '%strap%' THEN 'Sling'
      WHEN name ILIKE '%case%' OR name ILIKE '%bag%' THEN 'Case'
      WHEN name ILIKE '%light%' OR name ILIKE '%flashlight%' THEN 'Light'
      WHEN name ILIKE '%laser%' OR name ILIKE '%sight%' THEN 'Sight'
      WHEN name ILIKE '%cleaning%' OR name ILIKE '%clean%' THEN 'Cleaning'
      WHEN name ILIKE '%tool%' OR name ILIKE '%kit%' THEN 'Tool'
      WHEN name ILIKE '%mount%' OR name ILIKE '%rail%' THEN 'Mount'
      WHEN name ILIKE '%trigger%' OR name ILIKE '%trig%' THEN 'Trigger'
      WHEN name ILIKE '%barrel%' OR name ILIKE '%bbl%' THEN 'Barrel'
      WHEN name ILIKE '%suppressor%' OR name ILIKE '%silencer%' THEN 'Suppressor'
      ELSE frame_size
    END
    WHERE department_number IN ('09', '10', '11', '12', '13', '14', '17', '20', '21', '25', '26', '27', '30', '31', '35')
  `);
  console.log(`✅ Accessory types: ${accessoryTypeResult.rowCount} updated`);
  
  // 5. NFA PRODUCTS (Department 06)
  console.log('\n🏛️ Processing NFA Products (Department 06)...');
  
  // NFA types
  const nfaTypeResult = await db.execute(sql`
    UPDATE products 
    SET frame_size = CASE 
      WHEN name ILIKE '%suppressor%' OR name ILIKE '%silencer%' THEN 'Suppressor'
      WHEN name ILIKE '%sbr%' OR name ILIKE '%short barrel%' THEN 'SBR'
      WHEN name ILIKE '%sbs%' OR name ILIKE '%short barrel shotgun%' THEN 'SBS'
      WHEN name ILIKE '%aow%' OR name ILIKE '%any other weapon%' THEN 'AOW'
      WHEN name ILIKE '%machine gun%' OR name ILIKE '%full auto%' THEN 'Machine Gun'
      WHEN name ILIKE '%destructive%' OR name ILIKE '%dd%' THEN 'Destructive Device'
      ELSE frame_size
    END
    WHERE department_number = '06'
  `);
  console.log(`✅ NFA types: ${nfaTypeResult.rowCount} updated`);
  
  // 6. AIRGUNS (Department 22)
  console.log('\n💨 Processing Airguns (Department 22)...');
  
  // Airgun types
  const airgunTypeResult = await db.execute(sql`
    UPDATE products 
    SET frame_size = CASE 
      WHEN name ILIKE '%pcp%' OR name ILIKE '%pre-charged%' THEN 'PCP'
      WHEN name ILIKE '%spring%' OR name ILIKE '%break barrel%' THEN 'Spring'
      WHEN name ILIKE '%co2%' OR name ILIKE '%co 2%' THEN 'CO2'
      WHEN name ILIKE '%pump%' OR name ILIKE '%multi pump%' THEN 'Pump'
      WHEN name ILIKE '%pellet%' OR name ILIKE '%bb%' THEN 'Pellet'
      WHEN name ILIKE '%rifle%' THEN 'Rifle'
      WHEN name ILIKE '%pistol%' THEN 'Pistol'
      ELSE frame_size
    END
    WHERE department_number = '22'
  `);
  console.log(`✅ Airgun types: ${airgunTypeResult.rowCount} updated`);
  
  // Get all products with filter data for Algolia sync
  console.log('\n🔄 Preparing comprehensive Algolia sync...');
  const productsWithFilters = await db.execute(sql`
    SELECT sku, barrel_length, finish, frame_size, action_type, sight_type, caliber, capacity
    FROM products 
    WHERE (barrel_length IS NOT NULL OR finish IS NOT NULL OR frame_size IS NOT NULL OR action_type IS NOT NULL OR sight_type IS NOT NULL OR caliber IS NOT NULL OR capacity IS NOT NULL)
  `);
  
  console.log(`📊 Found ${productsWithFilters.rows.length} products with filter data`);
  
  // Prepare Algolia updates
  const algoliaUpdates = productsWithFilters.rows.map(product => ({
    objectID: product.sku,
    barrelLength: product.barrel_length,
    finish: product.finish,
    frameSize: product.frame_size,
    actionType: product.action_type,
    sightType: product.sight_type,
    caliber: product.caliber,
    capacity: product.capacity
  }));
  
  // Sync to Algolia in batches
  const batchSize = 500;
  let synced = 0;
  
  for (let i = 0; i < algoliaUpdates.length; i += batchSize) {
    const batch = algoliaUpdates.slice(i, i + batchSize);
    
    await client.partialUpdateObjects({
      indexName: 'products',
      objects: batch
    });
    
    synced += batch.length;
    console.log(`✅ Algolia sync progress: ${synced}/${algoliaUpdates.length} (${(synced/algoliaUpdates.length*100).toFixed(1)}%)`);
  }
  
  console.log(`\n🎉 Complete filter extraction finished!`);
  console.log(`   - Products processed: ${algoliaUpdates.length}`);
  console.log(`   - Algolia sync completed: ${synced} products`);
  
  return { totalProcessed: algoliaUpdates.length, totalSynced: synced };
}

// Execute the complete filter extraction
extractAllCategoryFilters().catch(console.error);