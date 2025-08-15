#!/usr/bin/env node

/**
 * Create 9 Test Orders Across All Tiers and Fulfillment Types
 * 
 * This script creates orders for existing test customers:
 * - 3 tiers: Bronze, Gold Monthly, Platinum Monthly
 * - 3 fulfillment types per tier:
 *   1. DS - Weapon (Drop-Ship to FFL)
 *   2. IH - Weapon (In-House to TGF)  
 *   3. Accessory (Direct to customer)
 * 
 * Total: 9 individual orders across 3 submissions
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { drizzle } = require('drizzle-orm/postgres-js');
const { eq } = require('drizzle-orm');
const postgres = require('postgres');
const { localUsers, products, orders, orderItems, ffls } = require('./shared/schema.ts');

// Initialize database connection
const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql);

// Test customers for each tier (existing accounts)
const testCustomers = {
  bronze: {
    id: 'local-1755201988529-a6fmbvsiuia',
    email: 'checkbox.test.1755201976389@thegunfirm.com',
    firstName: 'CheckboxTest',
    lastName: 'User',
    membershipTier: 'Bronze'
  },
  goldMonthly: {
    id: 'local-1755134278038-ln2woe05qng',
    email: 'simulation.test@thegunfirm.com',
    firstName: 'simulation',
    lastName: 'test',
    membershipTier: 'Gold Monthly'
  },
  platinumMonthly: {
    id: 'local-1755121425581-kuf0fjd9f6',
    email: 'direct.zoho.test@thegunfirm.com',
    firstName: 'Direct',
    lastName: 'ZohoTest',
    membershipTier: 'Platinum Monthly'
  }
};

// Test products for each fulfillment type
const testProducts = {
  dropShipWeapon: {
    name: 'GLOCK 19 Gen 5 9mm Luger 4.02" Barrel 15-Round',
    sku: 'GLOCK19GEN5',
    category: 'Handguns',
    manufacturer: 'Glock Inc',
    requiresFFL: true,
    dropShippable: true,
    priceBronze: 619.99,
    priceGold: 529.99,
    pricePlatinum: 469.99
  },
  inHouseWeapon: {
    name: 'DSA SA58 IBR 18" 308WIN 20RD BLK',
    sku: 'DSA5818-IBR-A',
    category: 'Rifles',
    manufacturer: 'DSARMS',
    requiresFFL: true,
    dropShippable: false,
    priceBronze: 2345.00,
    priceGold: 2227.75,
    pricePlatinum: 2008.38
  },
  accessory: {
    name: 'HOGUE GRIP AR15 KIT MIL-SPEC BLK',
    sku: 'HO15056',
    category: 'Accessories',
    manufacturer: 'HOGUE',
    requiresFFL: false,
    dropShippable: true,
    priceBronze: 69.95,
    priceGold: 66.45,
    pricePlatinum: 42.62
  }
};

// Test FFL for firearm orders
const testFFL = {
  id: 1414,
  licenseNumber: '1-59-017-07-6F-13700',
  businessName: 'BACK ACRE GUN WORKS',
  address: {
    street: '1621 N CROFT AVE',
    city: 'INVERNESS',
    state: 'FL',
    zip: '344530570'
  }
};

async function generateNextOrderNumber() {
  // Get the highest existing order number
  const lastOrder = await db.select({ orderNumber: orders.orderNumber })
    .from(orders)
    .orderBy(orders.id.desc())
    .limit(1);
  
  let baseNumber = 2024001;
  if (lastOrder.length > 0 && lastOrder[0].orderNumber) {
    const match = lastOrder[0].orderNumber.match(/^(\d+)/);
    if (match) {
      baseNumber = parseInt(match[1]) + 1;
    }
  }
  
  return baseNumber;
}

function getProductPrice(product, tier) {
  switch (tier) {
    case 'Bronze': return product.priceBronze;
    case 'Gold Monthly': 
    case 'Gold Annually': return product.priceGold;
    case 'Platinum Monthly': 
    case 'Platinum Founder': 
    case 'Platinum Annual': return product.pricePlatinum;
    default: return product.priceBronze;
  }
}

async function createTestOrder(customer, product, fulfillmentType, orderNumber) {
  console.log(`\n📦 Creating ${fulfillmentType} order for ${customer.membershipTier} customer`);
  console.log(`   Customer: ${customer.firstName} ${customer.lastName} (${customer.email})`);
  console.log(`   Product: ${product.name}`);
  console.log(`   Order Number: ${orderNumber}`);
  
  const price = getProductPrice(product, customer.membershipTier);
  const quantity = 1;
  const totalAmount = price * quantity;
  
  // Determine fulfillment characteristics
  const requiresDropShip = fulfillmentType === 'DS - Weapon';
  const requiresInHouse = fulfillmentType === 'IH - Weapon';
  const isAccessory = fulfillmentType === 'Accessory';
  
  const fulfillmentTypeField = requiresDropShip ? 'Drop-Ship' : 
                              requiresInHouse ? 'In-House' : 'Direct';
  
  const orderingAccount = requiresDropShip ? '99902' : '99901'; // Test accounts
  
  // Create order record
  const orderData = {
    userId: customer.id,
    orderNumber: orderNumber,
    totalAmount: totalAmount.toString(),
    status: 'pending',
    customerEmail: customer.email,
    customerName: `${customer.firstName} ${customer.lastName}`,
    membershipTier: customer.membershipTier,
    
    // Shipping details
    shippingAddress: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'TX',
      zip: '12345'
    },
    
    // FFL details for firearms
    fflDealerId: product.requiresFFL ? testFFL.id : null,
    fflDealerName: product.requiresFFL ? testFFL.businessName : null,
    
    // Order metadata
    orderMetadata: {
      fulfillmentType: fulfillmentTypeField,
      orderingAccount: orderingAccount,
      requiresDropShip: requiresDropShip,
      requiresInHouse: requiresInHouse,
      isTestOrder: true,
      testCategory: fulfillmentType
    }
  };
  
  console.log(`   💰 Price: $${price} (${customer.membershipTier} tier)`);
  console.log(`   📋 Fulfillment: ${fulfillmentTypeField}`);
  console.log(`   🏢 Account: ${orderingAccount}`);
  console.log(`   🏪 FFL: ${product.requiresFFL ? testFFL.businessName : 'Not Required'}`);
  
  try {
    // Insert order
    const [createdOrder] = await db.insert(orders).values(orderData).returning();
    
    // Create order item
    const orderItemData = {
      orderId: createdOrder.id,
      productName: product.name,
      sku: product.sku,
      quantity: quantity,
      unitPrice: price.toString(),
      totalPrice: totalAmount.toString(),
      fflRequired: product.requiresFFL
    };
    
    await db.insert(orderItems).values(orderItemData);
    
    console.log(`   ✅ Order created successfully - ID: ${createdOrder.id}`);
    
    return {
      success: true,
      orderId: createdOrder.id,
      orderNumber: orderNumber,
      customer: customer,
      product: product,
      fulfillmentType: fulfillmentType,
      totalAmount: totalAmount,
      fulfillmentTypeField: fulfillmentTypeField,
      orderingAccount: orderingAccount
    };
    
  } catch (error) {
    console.error(`   ❌ Failed to create order: ${error.message}`);
    return {
      success: false,
      error: error.message,
      customer: customer,
      product: product,
      fulfillmentType: fulfillmentType
    };
  }
}

async function create9TierTestOrders() {
  console.log('\n🎯 CREATING 9 TIER TEST ORDERS');
  console.log('===============================');
  console.log('Creating orders for existing test customers across all tiers and fulfillment types:\n');
  
  const results = [];
  let baseOrderNumber = await generateNextOrderNumber();
  
  // Order creation matrix
  const orderMatrix = [
    // Bronze tier orders
    { customer: testCustomers.bronze, product: testProducts.dropShipWeapon, fulfillmentType: 'DS - Weapon' },
    { customer: testCustomers.bronze, product: testProducts.inHouseWeapon, fulfillmentType: 'IH - Weapon' },
    { customer: testCustomers.bronze, product: testProducts.accessory, fulfillmentType: 'Accessory' },
    
    // Gold Monthly tier orders
    { customer: testCustomers.goldMonthly, product: testProducts.dropShipWeapon, fulfillmentType: 'DS - Weapon' },
    { customer: testCustomers.goldMonthly, product: testProducts.inHouseWeapon, fulfillmentType: 'IH - Weapon' },
    { customer: testCustomers.goldMonthly, product: testProducts.accessory, fulfillmentType: 'Accessory' },
    
    // Platinum Monthly tier orders
    { customer: testCustomers.platinumMonthly, product: testProducts.dropShipWeapon, fulfillmentType: 'DS - Weapon' },
    { customer: testCustomers.platinumMonthly, product: testProducts.inHouseWeapon, fulfillmentType: 'IH - Weapon' },
    { customer: testCustomers.platinumMonthly, product: testProducts.accessory, fulfillmentType: 'Accessory' }
  ];
  
  console.log('📊 ORDER CREATION MATRIX:');
  console.log('-------------------------');
  orderMatrix.forEach((order, index) => {
    const orderNumber = `${baseOrderNumber + index}I0`; // Individual receiver, first order
    console.log(`${index + 1}. ${order.customer.membershipTier} → ${order.fulfillmentType} → ${orderNumber}`);
  });
  
  console.log('\n🚀 CREATING ORDERS...');
  console.log('======================');
  
  // Create all orders
  for (let i = 0; i < orderMatrix.length; i++) {
    const { customer, product, fulfillmentType } = orderMatrix[i];
    const orderNumber = `${baseOrderNumber + i}I0`; // Individual receiver, first order
    
    const result = await createTestOrder(customer, product, fulfillmentType, orderNumber);
    results.push(result);
    
    // Small delay between orders
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 ORDER CREATION SUMMARY');
  console.log('=========================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/9 orders`);
  console.log(`❌ Failed: ${failed.length}/9 orders`);
  
  if (successful.length > 0) {
    console.log('\n🎯 SUCCESSFUL ORDERS:');
    successful.forEach((result, index) => {
      console.log(`${index + 1}. ${result.orderNumber} - ${result.customer.membershipTier} - ${result.fulfillmentType} - $${result.totalAmount}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ FAILED ORDERS:');
    failed.forEach((result, index) => {
      console.log(`${index + 1}. ${result.customer.membershipTier} - ${result.fulfillmentType} - Error: ${result.error}`);
    });
  }
  
  console.log('\n🔄 FULFILLMENT TYPE BREAKDOWN:');
  console.log('------------------------------');
  const fulfillmentBreakdown = {
    'DS - Weapon': successful.filter(r => r.fulfillmentType === 'DS - Weapon').length,
    'IH - Weapon': successful.filter(r => r.fulfillmentType === 'IH - Weapon').length,
    'Accessory': successful.filter(r => r.fulfillmentType === 'Accessory').length
  };
  
  Object.entries(fulfillmentBreakdown).forEach(([type, count]) => {
    console.log(`${type}: ${count} orders`);
  });
  
  console.log('\n💰 TIER PRICING ANALYSIS:');
  console.log('-------------------------');
  const tierAnalysis = {};
  
  successful.forEach(result => {
    if (!tierAnalysis[result.customer.membershipTier]) {
      tierAnalysis[result.customer.membershipTier] = {
        count: 0,
        totalSpent: 0,
        orders: []
      };
    }
    tierAnalysis[result.customer.membershipTier].count++;
    tierAnalysis[result.customer.membershipTier].totalSpent += result.totalAmount;
    tierAnalysis[result.customer.membershipTier].orders.push(result);
  });
  
  Object.entries(tierAnalysis).forEach(([tier, data]) => {
    console.log(`${tier}: ${data.count} orders, $${data.totalSpent.toFixed(2)} total`);
  });
  
  console.log('\n🏢 ACCOUNT ROUTING SUMMARY:');
  console.log('---------------------------');
  const accountRouting = {
    '99901': successful.filter(r => r.orderingAccount === '99901').length, // In-House
    '99902': successful.filter(r => r.orderingAccount === '99902').length  // Drop-Ship
  };
  
  console.log(`99901 (In-House): ${accountRouting['99901']} orders`);
  console.log(`99902 (Drop-Ship): ${accountRouting['99902']} orders`);
  
  console.log('\n✅ 9 TIER TEST ORDERS COMPLETED');
  console.log('================================');
  console.log(`Successfully created ${successful.length} test orders across all tiers and fulfillment types.`);
  console.log('Orders are ready for RSR Engine submission and Zoho CRM tracking testing.');
  
  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    results: results
  };
}

// Run the order creation
create9TierTestOrders()
  .then((summary) => {
    console.log(`\n🏁 Order creation completed: ${summary.successful}/${summary.total} successful`);
    process.exit(summary.failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error creating orders:', error);
    process.exit(1);
  })
  .finally(() => {
    sql.end();
  });