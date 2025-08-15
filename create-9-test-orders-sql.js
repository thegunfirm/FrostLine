#!/usr/bin/env node

/**
 * Create 9 Test Orders via Direct SQL
 * 
 * Creates orders for existing test customers across 3 tiers and 3 fulfillment types:
 * - Bronze, Gold Monthly, Platinum Monthly
 * - DS Weapon (to FFL), IH Weapon (to TGF), Accessory (to customer)
 * Total: 9 individual orders
 */

// Test customers (existing in database)
const testCustomers = [
  {
    id: 'local-1755201988529-a6fmbvsiuia',
    email: 'checkbox.test.1755201976389@thegunfirm.com',
    firstName: 'CheckboxTest',
    lastName: 'User',
    membershipTier: 'Bronze'
  },
  {
    id: 'local-1755134278038-ln2woe05qng',
    email: 'simulation.test@thegunfirm.com',
    firstName: 'simulation',
    lastName: 'test',
    membershipTier: 'Gold Monthly'
  },
  {
    id: 'local-1755121425581-kuf0fjd9f6',
    email: 'direct.zoho.test@thegunfirm.com',
    firstName: 'Direct',
    lastName: 'ZohoTest',
    membershipTier: 'Platinum Monthly'
  }
];

// Test products
const testProducts = [
  {
    name: 'GLOCK 19 Gen 5 9mm Luger 4.02" Barrel 15-Round',
    sku: 'GLOCK19GEN5',
    category: 'Handguns',
    manufacturer: 'Glock Inc',
    requiresFFL: true,
    dropShippable: true,
    priceBronze: 619.99,
    priceGold: 529.99,
    pricePlatinum: 469.99,
    fulfillmentType: 'DS - Weapon'
  },
  {
    name: 'DSA SA58 IBR 18" 308WIN 20RD BLK',
    sku: 'DSA5818-IBR-A',
    category: 'Rifles',
    manufacturer: 'DSARMS',
    requiresFFL: true,
    dropShippable: false,
    priceBronze: 2345.00,
    priceGold: 2227.75,
    pricePlatinum: 2008.38,
    fulfillmentType: 'IH - Weapon'
  },
  {
    name: 'HOGUE GRIP AR15 KIT MIL-SPEC BLK',
    sku: 'HO15056',
    category: 'Accessories',
    manufacturer: 'HOGUE',
    requiresFFL: false,
    dropShippable: true,
    priceBronze: 69.95,
    priceGold: 66.45,
    pricePlatinum: 42.62,
    fulfillmentType: 'Accessory'
  }
];

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

async function create9TestOrdersSQL() {
  console.log('\n🎯 CREATING 9 TIER TEST ORDERS VIA SQL');
  console.log('======================================');
  
  let baseOrderNumber = 2025001; // Start with new base number
  let orderCounter = 0;
  
  console.log('\n📊 ORDER CREATION MATRIX:');
  console.log('-------------------------');
  
  const orderInserts = [];
  const itemInserts = [];
  
  // Create orders for each customer and product combination
  for (const customer of testCustomers) {
    for (const product of testProducts) {
      orderCounter++;
      const orderNumber = `${baseOrderNumber + orderCounter - 1}I0`; // Individual receiver, first order
      const price = getProductPrice(product, customer.membershipTier);
      const quantity = 1;
      const totalAmount = price * quantity;
      
      // Determine fulfillment characteristics
      const requiresDropShip = product.fulfillmentType === 'DS - Weapon';
      const requiresInHouse = product.fulfillmentType === 'IH - Weapon';
      const isAccessory = product.fulfillmentType === 'Accessory';
      
      const fulfillmentTypeField = requiresDropShip ? 'Drop-Ship' : 
                                  requiresInHouse ? 'In-House' : 'Direct';
      
      const orderingAccount = requiresDropShip ? '99902' : '99901'; // Test accounts
      
      console.log(`${orderCounter}. ${customer.membershipTier} → ${product.fulfillmentType} → ${orderNumber} ($${price})`);
      
      // Prepare order insert
      const orderInsert = `
        INSERT INTO orders (
          user_id, order_number, total_amount, status, customer_email, 
          customer_name, membership_tier, shipping_address, ffl_dealer_id, 
          ffl_dealer_name, order_metadata, created_at
        ) VALUES (
          '${customer.id}',
          '${orderNumber}',
          ${totalAmount},
          'pending',
          '${customer.email}',
          '${customer.firstName} ${customer.lastName}',
          '${customer.membershipTier}',
          '{"street":"123 Test Street","city":"Test City","state":"TX","zip":"12345"}',
          ${product.requiresFFL ? 1414 : 'NULL'},
          ${product.requiresFFL ? "'BACK ACRE GUN WORKS'" : 'NULL'},
          '{"fulfillmentType":"${fulfillmentTypeField}","orderingAccount":"${orderingAccount}","requiresDropShip":${requiresDropShip},"requiresInHouse":${requiresInHouse},"isTestOrder":true,"testCategory":"${product.fulfillmentType}"}',
          NOW()
        );`;
      
      orderInserts.push(orderInsert);
      
      // Prepare order item insert (will be done after orders are created)
      const itemInsert = `
        INSERT INTO order_items (
          order_id, product_name, sku, quantity, unit_price, total_price, ffl_required
        ) VALUES (
          (SELECT id FROM orders WHERE order_number = '${orderNumber}'),
          '${product.name.replace(/'/g, "''")}',
          '${product.sku}',
          ${quantity},
          ${price},
          ${totalAmount},
          ${product.requiresFFL}
        );`;
      
      itemInserts.push(itemInsert);
    }
  }
  
  console.log('\n🚀 EXECUTING SQL INSERTS...');
  console.log('============================');
  
  // Execute order inserts
  let successfulOrders = 0;
  let failedOrders = 0;
  
  for (let i = 0; i < orderInserts.length; i++) {
    try {
      console.log(`Creating order ${i + 1}/9...`);
      
      // Use environment to execute SQL
      const { spawn } = require('child_process');
      
      await new Promise((resolve, reject) => {
        const psql = spawn('psql', [process.env.DATABASE_URL, '-c', orderInserts[i]], {
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let output = '';
        let error = '';
        
        psql.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        psql.stderr.on('data', (data) => {
          error += data.toString();
        });
        
        psql.on('close', (code) => {
          if (code === 0) {
            console.log(`   ✅ Order ${i + 1} created successfully`);
            successfulOrders++;
            resolve();
          } else {
            console.log(`   ❌ Order ${i + 1} failed: ${error}`);
            failedOrders++;
            reject(new Error(error));
          }
        });
      });
      
    } catch (error) {
      console.log(`   ❌ Order ${i + 1} failed: ${error.message}`);
      failedOrders++;
    }
  }
  
  // Execute item inserts
  console.log('\n🔗 CREATING ORDER ITEMS...');
  console.log('---------------------------');
  
  let successfulItems = 0;
  let failedItems = 0;
  
  for (let i = 0; i < itemInserts.length; i++) {
    try {
      console.log(`Creating order item ${i + 1}/9...`);
      
      const { spawn } = require('child_process');
      
      await new Promise((resolve, reject) => {
        const psql = spawn('psql', [process.env.DATABASE_URL, '-c', itemInserts[i]], {
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let output = '';
        let error = '';
        
        psql.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        psql.stderr.on('data', (data) => {
          error += data.toString();
        });
        
        psql.on('close', (code) => {
          if (code === 0) {
            console.log(`   ✅ Order item ${i + 1} created successfully`);
            successfulItems++;
            resolve();
          } else {
            console.log(`   ❌ Order item ${i + 1} failed: ${error}`);
            failedItems++;
            reject(new Error(error));
          }
        });
      });
      
    } catch (error) {
      console.log(`   ❌ Order item ${i + 1} failed: ${error.message}`);
      failedItems++;
    }
  }
  
  console.log('\n📊 ORDER CREATION SUMMARY');
  console.log('=========================');
  console.log(`✅ Orders Created: ${successfulOrders}/9`);
  console.log(`✅ Items Created: ${successfulItems}/9`);
  console.log(`❌ Failed Orders: ${failedOrders}/9`);
  console.log(`❌ Failed Items: ${failedItems}/9`);
  
  if (successfulOrders > 0) {
    console.log('\n🔄 FULFILLMENT TYPE BREAKDOWN:');
    console.log('------------------------------');
    console.log('DS - Weapon: 3 orders (Drop-Ship to FFL)');
    console.log('IH - Weapon: 3 orders (In-House to TGF)');
    console.log('Accessory: 3 orders (Direct to customer)');
    
    console.log('\n💰 TIER PRICING BREAKDOWN:');
    console.log('--------------------------');
    
    testCustomers.forEach((customer, index) => {
      const customerTotal = testProducts.reduce((sum, product) => {
        return sum + getProductPrice(product, customer.membershipTier);
      }, 0);
      console.log(`${customer.membershipTier}: 3 orders, $${customerTotal.toFixed(2)} total`);
    });
    
    console.log('\n🏢 ACCOUNT ROUTING SUMMARY:');
    console.log('---------------------------');
    console.log('99901 (In-House): 6 orders (IH Weapon + Accessory)');
    console.log('99902 (Drop-Ship): 3 orders (DS Weapon)');
  }
  
  console.log('\n✅ 9 TIER TEST ORDERS COMPLETED');
  console.log('================================');
  console.log(`Successfully created ${successfulOrders} test orders with ${successfulItems} items.`);
  console.log('Orders are ready for RSR Engine submission and Zoho CRM tracking testing.');
  
  return {
    ordersCreated: successfulOrders,
    itemsCreated: successfulItems,
    ordersFailed: failedOrders,
    itemsFailed: failedItems
  };
}

// Run the creation
create9TestOrdersSQL()
  .then((summary) => {
    console.log(`\n🏁 Completed: ${summary.ordersCreated} orders, ${summary.itemsCreated} items created`);
    process.exit(summary.ordersFailed > 0 || summary.itemsFailed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });