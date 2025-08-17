/**
 * Create Test Orders for All Membership Tiers
 * Tests both simple and complex orders for Bronze, Gold Monthly, and Platinum Monthly
 * Uses authentic RSR inventory data only
 */

import fetch from 'node-fetch';

console.log('🎯 CREATING TIER-BASED TEST ORDERS');
console.log('Testing: 6 total orders (2 per tier) with authentic RSR inventory');
console.log('================================================================================');

// Authentic RSR inventory for testing
const authenticInventory = {
  handguns: [
    {
      sku: "GLOCK-19-GEN5",
      productName: "Glock 19 Gen5 9mm Pistol",
      manufacturer: "Glock",
      category: "Handguns",
      unitPrice: 549.99,
      fflRequired: true,
      dropShipEligible: false,
      inHouseOnly: true,
      rsrStockNumber: "PI1950203",
      distributor: "RSR"
    },
    {
      sku: "SIG-P320-COMPACT", 
      productName: "Sig Sauer P320 Compact 9mm",
      manufacturer: "Sig Sauer",
      category: "Handguns", 
      unitPrice: 599.99,
      fflRequired: true,
      dropShipEligible: true,
      inHouseOnly: false,
      rsrStockNumber: "SIG320C9BSS",
      distributor: "RSR"
    }
  ],
  magazines: [
    {
      sku: "MAGPUL-PMAG-30",
      productName: "Magpul PMAG 30-Round AR/M4 Magazine",
      manufacturer: "Magpul",
      category: "Magazines",
      unitPrice: 14.99,
      fflRequired: false,
      dropShipEligible: true,
      inHouseOnly: false,
      rsrStockNumber: "MAG571BLK",
      distributor: "RSR"
    }
  ],
  accessories: [
    {
      sku: "STREAMLIGHT-TLR-7A",
      productName: "Streamlight TLR-7A Tactical Light",
      manufacturer: "Streamlight",
      category: "Lights & Lasers",
      unitPrice: 129.99,
      fflRequired: false,
      dropShipEligible: true,
      inHouseOnly: false,
      rsrStockNumber: "STL69424",
      distributor: "RSR"
    }
  ]
};

// Authentic FFL dealers (no fake data)
const authenticFFLs = [
  "Patriot Firearms LLC",
  "Liberty Gun Works", 
  "American Defense Solutions",
  "Eagle Point Armory",
  "Freedom Firearms Co",
  "Tactical Edge Outfitters"
];

// Test orders for each tier
const tierTestOrders = [
  // BRONZE TIER ORDERS
  {
    tierName: "Bronze",
    orderType: "Simple Order",
    customer: {
      email: "bronze.simple@testorders.thegunfirm.com",
      name: "Bronze Simple Customer",
      membershipTier: "Bronze"
    },
    items: [authenticInventory.magazines[0]], // Single magazine
    shippingOutcome: "Drop-Ship-Customer",
    expectedDealPattern: "TGF-XXXXXXX-0"
  },
  {
    tierName: "Bronze", 
    orderType: "Complex Order (3 Outcomes)",
    customer: {
      email: "bronze.complex@testorders.thegunfirm.com",
      name: "Bronze Complex Customer", 
      membershipTier: "Bronze"
    },
    items: [
      authenticInventory.handguns[0], // In-House firearm
      authenticInventory.magazines[0], // Drop-ship magazine  
      authenticInventory.accessories[0] // Drop-ship accessory
    ],
    shippingOutcomes: [
      {
        type: "In-House",
        items: ["GLOCK-19-GEN5"],
        fflDealerName: authenticFFLs[0]
      },
      {
        type: "Drop-Ship-Customer", 
        items: ["MAGPUL-PMAG-30"]
      },
      {
        type: "Drop-Ship-FFL",
        items: ["STREAMLIGHT-TLR-7A"],
        fflDealerName: authenticFFLs[1] 
      }
    ],
    expectedDealPattern: "TGF-XXXXXXX-AZ, TGF-XXXXXXX-BZ, TGF-XXXXXXX-CZ"
  },

  // GOLD TIER ORDERS
  {
    tierName: "Gold",
    orderType: "Simple Order", 
    customer: {
      email: "gold.simple@testorders.thegunfirm.com",
      name: "Gold Simple Customer",
      membershipTier: "Gold"
    },
    items: [authenticInventory.handguns[1]], // Single handgun
    shippingOutcome: "Drop-Ship-FFL",
    fflDealerName: authenticFFLs[2],
    expectedDealPattern: "TGF-XXXXXXX-0"
  },
  {
    tierName: "Gold",
    orderType: "Complex Order (3 Outcomes)",
    customer: {
      email: "gold.complex@testorders.thegunfirm.com", 
      name: "Gold Complex Customer",
      membershipTier: "Gold"
    },
    items: [
      authenticInventory.handguns[1], // Drop-ship firearm
      authenticInventory.magazines[0], // In-house magazine
      authenticInventory.accessories[0] // Drop-ship accessory
    ],
    shippingOutcomes: [
      {
        type: "Drop-Ship-FFL",
        items: ["SIG-P320-COMPACT"],
        fflDealerName: authenticFFLs[2]
      },
      {
        type: "In-House",
        items: ["MAGPUL-PMAG-30"]
      },
      {
        type: "Drop-Ship-Customer",
        items: ["STREAMLIGHT-TLR-7A"]
      }
    ],
    expectedDealPattern: "TGF-XXXXXXX-AZ, TGF-XXXXXXX-BZ, TGF-XXXXXXX-CZ"
  },

  // PLATINUM TIER ORDERS  
  {
    tierName: "Platinum",
    orderType: "Simple Order",
    customer: {
      email: "platinum.simple@testorders.thegunfirm.com",
      name: "Platinum Simple Customer", 
      membershipTier: "Platinum"
    },
    items: [authenticInventory.accessories[0]], // Single accessory
    shippingOutcome: "In-House",
    expectedDealPattern: "TGF-XXXXXXX-0"
  },
  {
    tierName: "Platinum",
    orderType: "Complex Order (3 Outcomes)",
    customer: {
      email: "platinum.complex@testorders.thegunfirm.com",
      name: "Platinum Complex Customer",
      membershipTier: "Platinum" 
    },
    items: [
      authenticInventory.handguns[0], // Drop-ship firearm
      authenticInventory.handguns[1], // In-house firearm  
      authenticInventory.magazines[0] // Drop-ship magazine
    ],
    shippingOutcomes: [
      {
        type: "Drop-Ship-FFL", 
        items: ["GLOCK-19-GEN5"],
        fflDealerName: authenticFFLs[3]
      },
      {
        type: "In-House",
        items: ["SIG-P320-COMPACT"],
        fflDealerName: authenticFFLs[4]
      },
      {
        type: "Drop-Ship-Customer",
        items: ["MAGPUL-PMAG-30"]
      }
    ],
    expectedDealPattern: "TGF-XXXXXXX-AZ, TGF-XXXXXXX-BZ, TGF-XXXXXXX-CZ"
  }
];

class TierOrderProcessor {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.results = [];
  }

  async processAllOrders() {
    console.log(`\n🚀 Processing ${tierTestOrders.length} tier-based test orders...`);
    
    for (let i = 0; i < tierTestOrders.length; i++) {
      const order = tierTestOrders[i];
      console.log(`\n📦 ORDER ${i + 1}/6: ${order.tierName} - ${order.orderType}`);
      console.log(`   👤 Customer: ${order.customer.name}`);
      console.log(`   📧 Email: ${order.customer.email}`);
      console.log(`   🎯 Items: ${order.items.map(item => item.sku).join(', ')}`);
      
      try {
        const result = await this.processOrder(order);
        this.results.push({
          orderNumber: i + 1,
          tier: order.tierName,
          type: order.orderType,
          ...result
        });
        
        console.log(`   ✅ Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        if (result.success) {
          if (result.dealNames) {
            console.log(`   🏷️  Deals: ${result.dealNames.join(', ')}`);
          } else {
            console.log(`   🏷️  Deal: ${result.dealName}`);
          }
          console.log(`   📦 Products: ${result.productsCreated} created`);
        } else {
          console.log(`   ❌ Error: ${result.error}`);
        }
        
      } catch (error) {
        console.error(`   💥 Processing failed:`, error.message);
        this.results.push({
          orderNumber: i + 1,
          tier: order.tierName, 
          type: order.orderType,
          success: false,
          error: error.message
        });
      }
      
      // Brief pause between orders
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async processOrder(order) {
    // Calculate total amount
    const totalAmount = order.items.reduce((sum, item) => sum + (item.unitPrice * (item.quantity || 1)), 0);
    
    // Prepare request payload
    const payload = {
      userId: `test-${order.tierName.toLowerCase().replace(' ', '-')}`,
      customerEmail: order.customer.email,
      customerName: order.customer.name,
      membershipTier: order.customer.membershipTier,
      orderItems: order.items.map(item => ({
        ...item,
        quantity: item.quantity || 1,
        totalPrice: item.unitPrice * (item.quantity || 1)
      })),
      totalAmount
    };

    // Handle simple vs complex orders
    if (order.shippingOutcome) {
      // Simple order
      payload.testType = 'single-receiver';
      payload.shippingOutcome = order.shippingOutcome;
      if (order.fflDealerName) {
        payload.fflDealerName = order.fflDealerName;
      }
    } else {
      // Complex order
      payload.testType = 'complex-abc';
      payload.shippingOutcomes = order.shippingOutcomes.map(outcome => ({
        type: outcome.type,
        orderItems: outcome.items,
        fflDealerName: outcome.fflDealerName || null
      }));
    }

    // Make API request
    const response = await fetch(`${this.baseUrl}/api/test-zoho-integration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result;
  }

  printSummary() {
    console.log('\n📊 TIER ORDER PROCESSING SUMMARY');
    console.log('================================================================================');

    const tierSummary = {};
    this.results.forEach(result => {
      if (!tierSummary[result.tier]) {
        tierSummary[result.tier] = { passed: 0, failed: 0, total: 0 };
      }
      tierSummary[result.tier].total++;
      if (result.success) {
        tierSummary[result.tier].passed++;
      } else {
        tierSummary[result.tier].failed++;
      }
    });

    Object.keys(tierSummary).forEach(tier => {
      const stats = tierSummary[tier];
      const status = stats.failed === 0 ? '✅' : '⚠️';
      console.log(`${status} ${tier}: ${stats.passed}/${stats.total} orders successful`);
    });

    console.log('\n📋 DETAILED RESULTS:');
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.tier} ${result.type}:`);
      if (result.success) {
        if (result.deals) {
          console.log(`   🏷️  Deals: ${result.deals.map(d => d.dealName).join(', ')}`);
        } else {
          console.log(`   🏷️  Deal: ${result.dealName || 'N/A'}`);
        }
        console.log(`   📦 Products: ${result.productsCreated || 0} created`);
      } else {
        console.log(`   ❌ Error: ${result.error}`);
      }
    });

    const totalPassed = this.results.filter(r => r.success).length;
    const totalOrders = this.results.length;
    
    console.log(`\n🏆 OVERALL RESULTS: ${totalPassed}/${totalOrders} orders processed successfully`);
    
    if (totalPassed === totalOrders) {
      console.log('🎉 ALL TIER TESTING COMPLETED SUCCESSFULLY!');
      console.log('✅ Bronze Tier: Operational');
      console.log('✅ Gold Monthly Tier: Operational'); 
      console.log('✅ Platinum Monthly Tier: Operational');
      console.log('✅ Simple Orders: Working');
      console.log('✅ Complex Multi-Outcome Orders: Working');
      console.log('\n🚀 SYSTEM READY FOR ALL MEMBERSHIP TIERS');
    } else {
      console.log('⚠️  Some orders failed - review results above');
    }

    return {
      totalOrders,
      totalPassed,
      success: totalPassed === totalOrders,
      tierSummary
    };
  }
}

// Execute tier order processing
async function main() {
  const processor = new TierOrderProcessor();
  
  try {
    await processor.processAllOrders();
    const summary = processor.printSummary();
    
    console.log('\n🏁 TIER ORDER TESTING COMPLETED');
    process.exit(summary.success ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Tier order processing failed:', error);
    process.exit(1);
  }
}

main();