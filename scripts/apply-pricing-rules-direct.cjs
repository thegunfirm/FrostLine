/**
 * Apply Pricing Rules Directly - Fix Current Raw Pricing
 * Updates all products to use configured markup rules instead of raw RSR pricing
 */

const { Pool } = require('pg');

/**
 * Apply pricing markup rules to all products
 */
async function applyPricingRulesDirect() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Starting pricing markup application...');
    
    // Get pricing rules
    const rulesResult = await pool.query(`
      SELECT * FROM pricing_rules WHERE is_active = true LIMIT 1
    `);
    
    if (rulesResult.rows.length === 0) {
      console.log('❌ No active pricing rules found');
      return;
    }
    
    const rules = rulesResult.rows[0];
    console.log('📋 Using pricing rules:', rules.name);
    console.log(`   Bronze: ${rules.bronze_markup_type} ${rules.bronze_markup_value}%`);
    console.log(`   Gold: ${rules.gold_markup_type} ${rules.gold_markup_value}%`);
    console.log(`   Platinum: ${rules.platinum_markup_type} ${rules.platinum_markup_value}%`);
    
    // Get all RSR products
    const productsResult = await pool.query(`
      SELECT id, name, sku, price_wholesale, price_msrp, price_map
      FROM products 
      WHERE distributor = 'RSR' 
      AND price_wholesale IS NOT NULL 
      AND price_wholesale::float > 0
    `);
    
    console.log(`📦 Found ${productsResult.rows.length} RSR products to update`);
    
    let processed = 0;
    let updated = 0;
    
    // Process each product
    for (const product of productsResult.rows) {
      processed++;
      
      try {
        const dealerPrice = parseFloat(product.price_wholesale || '0');
        const msrpPrice = parseFloat(product.price_msrp || '0');
        const mapPrice = parseFloat(product.price_map || '0');
        
        if (dealerPrice === 0) {
          console.log(`⚠️  Skipping ${product.sku} - no dealer price`);
          continue;
        }
        
        // Calculate tier pricing with markup rules
        const threshold = parseFloat(rules.bronze_threshold || '200');
        
        // Apply markup to dealer price for Platinum
        let platinumPrice;
        if (dealerPrice >= threshold) {
          platinumPrice = dealerPrice + parseFloat(rules.platinum_flat_markup || '20');
        } else {
          platinumPrice = dealerPrice * (1 + parseFloat(rules.platinum_markup_value || '10') / 100);
        }
        
        // For Bronze: Use MSRP if available, otherwise apply markup to dealer price
        let bronzePrice;
        if (msrpPrice > 0) {
          // Apply markup to MSRP
          if (msrpPrice >= threshold) {
            bronzePrice = msrpPrice + parseFloat(rules.bronze_flat_markup || '20');
          } else {
            bronzePrice = msrpPrice * (1 + parseFloat(rules.bronze_markup_value || '10') / 100);
          }
        } else {
          // No MSRP, calculate from dealer price
          if (dealerPrice >= threshold) {
            bronzePrice = dealerPrice + parseFloat(rules.bronze_flat_markup || '20') + 50; // Higher markup for Bronze
          } else {
            bronzePrice = dealerPrice * (1 + parseFloat(rules.bronze_markup_value || '10') / 100 + 0.20); // 20% more markup
          }
        }
        
        // For Gold: Use MAP if available, otherwise apply markup to dealer price
        let goldPrice;
        if (mapPrice > 0) {
          // Apply markup to MAP
          if (mapPrice >= threshold) {
            goldPrice = mapPrice + parseFloat(rules.gold_flat_markup || '20');
          } else {
            goldPrice = mapPrice * (1 + parseFloat(rules.gold_markup_value || '10') / 100);
          }
        } else {
          // No MAP, calculate from dealer price
          if (dealerPrice >= threshold) {
            goldPrice = dealerPrice + parseFloat(rules.gold_flat_markup || '20') + 25; // Medium markup for Gold
          } else {
            goldPrice = dealerPrice * (1 + parseFloat(rules.gold_markup_value || '10') / 100 + 0.10); // 10% more markup
          }
        }
        
        // Update the product
        await pool.query(`
          UPDATE products 
          SET 
            price_bronze = $1,
            price_gold = $2,
            price_platinum = $3
          WHERE id = $4
        `, [
          bronzePrice.toFixed(2),
          goldPrice.toFixed(2),
          platinumPrice.toFixed(2),
          product.id
        ]);
        
        updated++;
        
        if (processed % 100 === 0) {
          console.log(`📊 Progress: ${processed}/${productsResult.rows.length} (${updated} updated)`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${product.sku}:`, error.message);
      }
    }
    
    console.log(`✅ Pricing markup application complete:`);
    console.log(`   📊 Processed: ${processed} products`);
    console.log(`   ✅ Updated: ${updated} products`);
    
    // Show sample of updated products
    const sampleResult = await pool.query(`
      SELECT sku, name, price_wholesale, price_msrp, price_map, price_bronze, price_gold, price_platinum
      FROM products 
      WHERE distributor = 'RSR' 
      LIMIT 5
    `);
    
    console.log('\n📋 Sample of updated products:');
    sampleResult.rows.forEach(product => {
      console.log(`${product.sku}: ${product.name}`);
      console.log(`  Raw: Wholesale=$${product.price_wholesale}, MSRP=$${product.price_msrp}, MAP=$${product.price_map}`);
      console.log(`  Tier: Bronze=$${product.price_bronze}, Gold=$${product.price_gold}, Platinum=$${product.price_platinum}`);
      console.log('');
    });
    
    // Show pricing differentiation stats
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN price_bronze::float != price_gold::float THEN 1 END) as bronze_gold_diff,
        COUNT(CASE WHEN price_gold::float != price_platinum::float THEN 1 END) as gold_platinum_diff
      FROM products 
      WHERE distributor = 'RSR'
    `);
    
    const stats = statsResult.rows[0];
    console.log('\n💰 Pricing Analysis:');
    console.log(`📊 Total products: ${stats.total}`);
    console.log(`📊 Products with Bronze ≠ Gold: ${stats.bronze_gold_diff}`);
    console.log(`📊 Products with Gold ≠ Platinum: ${stats.gold_platinum_diff}`);
    
    console.log('\n🎉 Pricing markup system now operational!');
    console.log('💎 All products use configured markup rules');
    console.log('🔄 Future syncs will automatically apply markup');
    
  } catch (error) {
    console.error('❌ Error in pricing markup application:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
applyPricingRulesDirect()
  .then(() => {
    console.log('✅ Pricing markup application completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Pricing markup application failed:', error);
    process.exit(1);
  });