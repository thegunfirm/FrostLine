#!/usr/bin/env node

const axios = require('axios');

async function testZohoProductSubform() {
  console.log('🔍 TESTING ZOHO PRODUCT CREATION & SUBFORM ASSIGNMENT');
  console.log('====================================================');
  
  // Check recent orders for Zoho Deal IDs
  try {
    const ordersResponse = await axios.get('http://localhost:5000/api/orders');
    const orders = ordersResponse.data;
    
    console.log(`📊 Found ${orders.length} orders in database`);
    
    for (const order of orders.slice(-3)) {
      console.log(`\n📝 Order ${order.id}:`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Zoho Deal ID: ${order.zohoContactId || 'Not set'}`);
      console.log(`   Created: ${order.orderDate}`);
      
      if (order.zohoContactId) {
        console.log(`   🎯 Found Zoho Deal: ${order.zohoContactId}`);
        
        // This would be where we verify the actual Zoho deal has products in subform
        console.log(`   🔍 Need to verify Zoho Deal ${order.zohoContactId} has products in subform`);
      }
    }
    
    // Check if there are any test scripts for Zoho verification
    console.log('\n🔧 Looking for Zoho verification scripts...');
    const fs = require('fs');
    const verificationScripts = fs.readdirSync('.')
      .filter(file => file.includes('zoho') && file.includes('test') && file.endsWith('.cjs'))
      .slice(0, 5);
      
    console.log(`📋 Found verification scripts: ${verificationScripts.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Error checking orders:', error.message);
  }
}

testZohoProductSubform();