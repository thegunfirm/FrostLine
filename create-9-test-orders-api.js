#!/usr/bin/env node

/**
 * Create 9 Test Orders via API
 * 
 * Creates orders for existing test customers across 3 tiers and 3 fulfillment types:
 * - Bronze, Gold Monthly, Platinum Monthly
 * - DS Weapon (to FFL), IH Weapon (to TGF), Accessory (to customer)
 * Total: 9 individual orders
 */

const API_BASE = 'http://localhost:5000/api';

// Test customers for each tier (existing accounts)
const testCustomers = {
  bronze: {
    email: 'checkbox.test.1755201976389@thegunfirm.com',
    password: 'password123', // Standard test password
    membershipTier: 'Bronze'
  },
  goldMonthly: {
    email: 'simulation.test@thegunfirm.com',
    password: 'password123',
    membershipTier: 'Gold Monthly'
  },
  platinumMonthly: {
    email: 'direct.zoho.test@thegunfirm.com',
    password: 'password123',
    membershipTier: 'Platinum Monthly'
  }
};

// Test products for each fulfillment type
const testProducts = {
  dropShipWeapon: {
    name: 'GLOCK 19 Gen 5 9mm Luger 4.02" Barrel 15-Round',
    sku: 'GLOCK19GEN5',
    category: 'Handguns',
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
    requiresFFL: false,
    dropShippable: true,
    priceBronze: 69.95,
    priceGold: 66.45,
    pricePlatinum: 42.62
  }
};

// Test FFL
const testFFL = {
  id: 1414,
  businessName: 'BACK ACRE GUN WORKS',
  licenseNumber: '1-59-017-07-6F-13700'
};

async function makeRequest(url, method = 'GET', body = null, sessionCookie = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (sessionCookie) {
    options.headers['Cookie'] = sessionCookie;
  }
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  return {
    status: response.status,
    data: response.status === 204 ? null : await response.json(),
    headers: response.headers
  };
}

async function loginCustomer(customerData) {
  console.log(`🔐 Logging in ${customerData.email}`);
  
  const response = await makeRequest(`${API_BASE}/login`, 'POST', {
    email: customerData.email,
    password: customerData.password
  });
  
  if (response.status === 200) {
    const sessionCookie = response.headers.get('set-cookie');
    console.log(`   ✅ Login successful for ${customerData.membershipTier} customer`);
    return sessionCookie;
  } else {
    console.log(`   ❌ Login failed: ${response.status} - ${JSON.stringify(response.data)}`);
    return null;
  }
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

async function createOrder(sessionCookie, customer, product, fulfillmentType) {
  console.log(`\n📦 Creating ${fulfillmentType} order for ${customer.membershipTier} customer`);
  console.log(`   Product: ${product.name}`);
  
  const price = getProductPrice(product, customer.membershipTier);
  const quantity = 1;
  const totalAmount = price * quantity;
  
  // Determine fulfillment characteristics
  const requiresDropShip = fulfillmentType === 'DS - Weapon';
  const requiresInHouse = fulfillmentType === 'IH - Weapon';
  const isAccessory = fulfillmentType === 'Accessory';
  
  const fulfillmentTypeField = requiresDropShip ? 'Drop-Ship' : 
                              requiresInHouse ? 'In-House' : 'Direct';
  
  const orderData = {
    items: [{
      productName: product.name,
      sku: product.sku,
      quantity: quantity,
      unitPrice: price,
      totalPrice: totalAmount,
      fflRequired: product.requiresFFL,
      category: product.category,
      manufacturer: product.manufacturer || 'Unknown'
    }],
    
    totalAmount: totalAmount,
    
    // Shipping address
    shippingAddress: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'TX',
      zip: '12345',
      firstName: 'Test',
      lastName: 'Customer'
    },
    
    // FFL information for firearms
    fflDealerId: product.requiresFFL ? testFFL.id : null,
    fflDealerName: product.requiresFFL ? testFFL.businessName : null,
    
    // Order metadata
    orderMetadata: {
      fulfillmentType: fulfillmentTypeField,
      orderingAccount: requiresDropShip ? '99902' : '99901',
      requiresDropShip: requiresDropShip,
      requiresInHouse: requiresInHouse,
      isTestOrder: true,
      testCategory: fulfillmentType
    }
  };
  
  console.log(`   💰 Price: $${price} (${customer.membershipTier} tier)`);
  console.log(`   📋 Fulfillment: ${fulfillmentTypeField}`);
  console.log(`   🏢 Account: ${requiresDropShip ? '99902' : '99901'}`);
  console.log(`   🏪 FFL: ${product.requiresFFL ? testFFL.businessName : 'Not Required'}`);
  
  // Create the order via API
  const response = await makeRequest(`${API_BASE}/orders`, 'POST', orderData, sessionCookie);
  
  if (response.status === 201 || response.status === 200) {
    console.log(`   ✅ Order created successfully`);
    if (response.data.orderNumber) {
      console.log(`   📋 Order Number: ${response.data.orderNumber}`);
    }
    
    return {
      success: true,
      orderNumber: response.data.orderNumber || 'Unknown',
      customer: customer,
      product: product,
      fulfillmentType: fulfillmentType,
      totalAmount: totalAmount,
      fulfillmentTypeField: fulfillmentTypeField,
      orderingAccount: requiresDropShip ? '99902' : '99901',
      response: response.data
    };
  } else {
    console.log(`   ❌ Order creation failed: ${response.status}`);
    console.log(`   Error: ${JSON.stringify(response.data)}`);
    
    return {
      success: false,
      error: response.data,
      customer: customer,
      product: product,
      fulfillmentType: fulfillmentType
    };
  }
}

async function create9TestOrders() {
  console.log('\n🎯 CREATING 9 TIER TEST ORDERS VIA API');
  console.log('======================================');
  console.log('Creating orders for existing test customers across all tiers and fulfillment types:\n');
  
  const results = [];
  
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
    console.log(`${index + 1}. ${order.customer.membershipTier} → ${order.fulfillmentType}`);
  });
  
  console.log('\n🚀 PROCESSING ORDERS...');
  console.log('========================');
  
  // Group by customer to minimize login operations
  const customerSessions = {};
  
  for (const customerKey of Object.keys(testCustomers)) {
    const customer = testCustomers[customerKey];
    const sessionCookie = await loginCustomer(customer);
    if (sessionCookie) {
      customerSessions[customerKey] = sessionCookie;
    }
  }
  
  // Create orders
  for (let i = 0; i < orderMatrix.length; i++) {
    const { customer, product, fulfillmentType } = orderMatrix[i];
    
    // Find the session for this customer
    const customerKey = Object.keys(testCustomers).find(key => 
      testCustomers[key].email === customer.email
    );
    
    const sessionCookie = customerSessions[customerKey];
    
    if (!sessionCookie) {
      console.log(`   ❌ No session for ${customer.membershipTier} customer, skipping`);
      results.push({
        success: false,
        error: 'No session available',
        customer: customer,
        product: product,
        fulfillmentType: fulfillmentType
      });
      continue;
    }
    
    const result = await createOrder(sessionCookie, customer, product, fulfillmentType);
    results.push(result);
    
    // Small delay between orders
    await new Promise(resolve => setTimeout(resolve, 1000));
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
      console.log(`${index + 1}. ${result.customer.membershipTier} - ${result.fulfillmentType} - Error: ${result.error?.message || 'Unknown error'}`);
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
        totalSpent: 0
      };
    }
    tierAnalysis[result.customer.membershipTier].count++;
    tierAnalysis[result.customer.membershipTier].totalSpent += result.totalAmount;
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

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.status === 200;
  } catch (error) {
    try {
      // Try different health check endpoint
      const response = await fetch(`${API_BASE}/category-ribbons/active`);
      return response.status === 200 || response.status === 304;
    } catch (error2) {
      return false;
    }
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking server status...');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('❌ Server is not running on localhost:5000');
    console.error('Please ensure the development server is started with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Server is running, proceeding with order creation...');
  
  const summary = await create9TestOrders();
  
  console.log(`\n🏁 Order creation completed: ${summary.successful}/${summary.total} successful`);
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});