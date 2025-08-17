#!/usr/bin/env node

/**
 * Comprehensive test script for rate-limited Zoho order creation
 * Tests all 6 shipping scenarios across 3 tiers with proper rate limiting
 */

const scenarios = [
  {
    name: "Mixed Inventory",
    type: "mixed-inventory-scenario",
    product: { sku: "SIG320C9B", name: "SIG P320 COMPACT 9MM", price: "599.99", ffl: true }
  },
  {
    name: "Multi Basic",  
    type: "multi-receiver-basic",
    product: { sku: "GL74012", name: "GLOCK OEM MOS ADPTR 05 GEN 5 45/10MM", price: "49.99", ffl: false }
  },
  {
    name: "Multi Complex",
    type: "multi-receiver-complex", 
    product: { sku: "GLSP00735", name: "GLOCK OEM 8 POUND CONNECTOR", price: "19.99", ffl: false }
  },
  {
    name: "In-House Single",
    type: "single-receiver-ih",
    product: { sku: "GLSP50963", name: "GLOCK OEM MAG CATCH REV G21 GEN4", price: "29.99", ffl: false }
  },
  {
    name: "Drop-Ship Single",
    type: "single-receiver-ds",
    product: { sku: "RUG90743", name: "RUGER AMER GEN2 STOCK WEIGHT KIT", price: "79.99", ffl: false }
  },
  {
    name: "FFL Required",
    type: "ffl-required-scenario",
    product: { sku: "GLG1950703", name: "GLOCK 19 GEN5 9MM", price: "549.99", ffl: true }
  }
];

const tiers = ["Bronze", "Gold", "Platinum"];

async function makeOrderRequest(scenarioIndex, tier, scenario) {
  const orderNumber = scenarioIndex * 3 + tiers.indexOf(tier) + 1;
  
  const orderData = {
    userId: `rate-limited-test-${orderNumber}`,
    customerEmail: `rate.limited.test.${orderNumber}@thegunfirm.com`,
    customerName: `RATE LIMITED TEST ${orderNumber}`,
    membershipTier: tier,
    orderItems: [{
      productName: scenario.product.name,
      sku: scenario.product.sku,
      quantity: 1,
      unitPrice: parseFloat(scenario.product.price),
      totalPrice: parseFloat(scenario.product.price),
      fflRequired: scenario.product.ffl,
      manufacturer: "AUTHENTIC",
      category: "Test",
      rsrStockNumber: scenario.product.sku,
      distributor: "RSR"
    }],
    totalAmount: parseFloat(scenario.product.price),
    testType: scenario.type,
    fflDealerName: "BACK ACRE GUN WORKS (1-59-017-07-6F-13700)"
  };

  console.log(`[${orderNumber}/18] Testing: ${scenario.name} - ${tier} Tier`);
  
  try {
    const response = await fetch('http://localhost:5000/api/test-zoho-integration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`   ✅ SUCCESS: Order ${result.orderNumber} created (Rate-Limited)`);
      return { success: true, orderNumber: result.orderNumber, scenario: scenario.name, tier };
    } else {
      console.log(`   ❌ FAILED: ${result.error || 'Unknown error'}`);
      return { success: false, error: result.error, scenario: scenario.name, tier };
    }
  } catch (error) {
    console.log(`   ❌ NETWORK ERROR: ${error.message}`);
    return { success: false, error: error.message, scenario: scenario.name, tier };
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runRateLimitedTest() {
  console.log("🚦 RATE-LIMITED ZOHO ORDER TESTING");
  console.log("==================================");
  console.log("Creating 18 orders with 2-second delays to prevent rate limiting");
  console.log("");

  const results = [];
  let orderCount = 0;

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    
    for (const tier of tiers) {
      orderCount++;
      
      const result = await makeOrderRequest(i, tier, scenario);
      results.push(result);
      
      // 2 second delay between requests to respect rate limits
      if (orderCount < 18) {
        console.log("   ⏳ Waiting 2 seconds (rate limiting)...");
        await sleep(2000);
      }
    }
    console.log("");
  }

  // Summary
  const successCount = results.filter(r => r.success).length;
  const successRate = Math.round((successCount / results.length) * 100);
  
  console.log("🎯 RATE-LIMITED TEST RESULTS");
  console.log("============================");
  console.log(`✅ Successful Orders: ${successCount}/${results.length}`);
  console.log(`📊 Success Rate: ${successRate}%`);
  console.log("");
  
  // List successful orders
  const successful = results.filter(r => r.success);
  if (successful.length > 0) {
    console.log("✅ SUCCESSFUL ORDERS:");
    successful.forEach(r => {
      console.log(`   - ${r.orderNumber} (${r.scenario} - ${r.tier})`);
    });
    console.log("");
  }
  
  // List failed orders  
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.log("❌ FAILED ORDERS:");
    failed.forEach(r => {
      console.log(`   - ${r.scenario} - ${r.tier}: ${r.error}`);
    });
    console.log("");
  }
  
  console.log("📍 Check Zoho CRM for orders with proper TGF numbers");
  console.log("🔍 Look for contacts named 'RATE LIMITED TEST 1-18'");
  console.log("⚡ Rate limiting should have prevented API throttling");
  
  return {
    total: results.length,
    successful: successCount,
    failed: failed.length,
    successRate,
    results
  };
}

// Run the test
runRateLimitedTest()
  .then(summary => {
    console.log(`\n🏁 Test completed: ${summary.successful}/${summary.total} orders successful`);
    process.exit(summary.successful === summary.total ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });