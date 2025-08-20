#!/usr/bin/env node

/**
 * Test Unified Order System
 * 
 * Tests the Amazon-style unified order experience that treats Zoho as system of record
 * Demonstrates pulling related deals and presenting as cohesive order experience
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test order number from previous successful checkout
const TEST_ORDER_NUMBER = '1755652199945-485';

async function testUnifiedOrderAPI() {
  console.log('🧪 Testing Unified Order API...\n');
  
  try {
    console.log(`📋 Fetching unified order summary for: ${TEST_ORDER_NUMBER}`);
    
    const response = await axios.get(
      `${BASE_URL}/api/orders/unified/${TEST_ORDER_NUMBER}`
    );
    
    if (response.status === 200) {
      const orderData = response.data;
      
      console.log('✅ UNIFIED ORDER API SUCCESS');
      console.log('================================\n');
      
      // Display unified order summary
      console.log(`📦 Master Order: ${orderData.masterOrderNumber}`);
      console.log(`👤 Customer: ${orderData.customerEmail}`);
      console.log(`📅 Date: ${orderData.orderDate}`);
      console.log(`💰 Total: $${orderData.totalAmount}`);
      console.log(`📊 Status: ${orderData.overallStatus}`);
      console.log(`💳 Payment: ${orderData.paymentStatus}\n`);
      
      // Display shipment groups (Amazon-style)
      console.log('📦 SHIPMENT GROUPS (Amazon-Style):');
      console.log('=====================================');
      
      Object.entries(orderData.shipmentGroups).forEach(([groupKey, group]) => {
        console.log(`\n🚢 Group: ${groupKey}`);
        console.log(`   Type: ${group.fulfillmentType}`);
        console.log(`   Status: ${group.status}`);
        console.log(`   Deal ID: ${group.dealId}`);
        console.log(`   Subtotal: $${group.subtotal}`);
        
        if (group.estimatedDelivery) {
          console.log(`   Est. Delivery: ${group.estimatedDelivery}`);
        }
        
        if (group.trackingNumber) {
          console.log(`   Tracking: ${group.trackingNumber}`);
        }
        
        console.log(`   Items (${group.items.length}):`);
        group.items.forEach((item, index) => {
          console.log(`     ${index + 1}. ${item.productName}`);
          console.log(`        SKU: ${item.productCode}`);
          console.log(`        Qty: ${item.quantity} × $${item.unitPrice} = $${item.totalPrice}`);
          
          if (item.manufacturerPartNumber) {
            console.log(`        MPN: ${item.manufacturerPartNumber}`);
          }
          
          if (item.rsrStockNumber) {
            console.log(`        RSR: ${item.rsrStockNumber}`);
          }
          
          if (item.isFirearm) {
            console.log(`        🔫 FIREARM`);
          }
        });
      });
      
      // Display summary metrics
      console.log('\n📊 ORDER SUMMARY:');
      console.log('==================');
      console.log(`Total Items: ${orderData.summary.totalItems}`);
      console.log(`Total Deals: ${orderData.summary.totalDeals}`);
      console.log(`In-House Items: ${orderData.summary.inHouseItems}`);
      console.log(`Drop-Ship to FFL: ${orderData.summary.dropShipToFflItems}`);
      console.log(`Drop-Ship to Customer: ${orderData.summary.dropShipToCustomerItems}`);
      
      // Display compliance info
      console.log('\n🛡️ COMPLIANCE STATUS:');
      console.log('======================');
      console.log(`Contains Firearms: ${orderData.metadata.hasFirearms ? 'Yes' : 'No'}`);
      console.log(`Requires FFL: ${orderData.metadata.requiresFfl ? 'Yes' : 'No'}`);
      
      if (orderData.metadata.holdStatus) {
        console.log(`⚠️  Hold Status: ${orderData.metadata.holdStatus}`);
      }
      
      if (orderData.metadata.complianceNotes) {
        console.log(`📝 Compliance Notes: ${orderData.metadata.complianceNotes}`);
      }
      
    } else {
      console.log('❌ API request failed with status:', response.status);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API ERROR:', error.response.status, error.response.data);
    } else {
      console.log('❌ NETWORK ERROR:', error.message);
    }
  }
}

async function testCustomerOrderHistory() {
  console.log('\n\n🧪 Testing Customer Order History API...\n');
  
  // Using test email from previous checkout
  const testEmail = 'test@thegunfirm.com';
  
  try {
    console.log(`📋 Fetching order history for: ${testEmail}`);
    
    const response = await axios.get(
      `${BASE_URL}/api/orders/history/${encodeURIComponent(testEmail)}`
    );
    
    if (response.status === 200) {
      const orderHistory = response.data;
      
      console.log('✅ ORDER HISTORY API SUCCESS');
      console.log('==============================\n');
      
      if (orderHistory.length === 0) {
        console.log('📝 No orders found for this customer');
        return;
      }
      
      console.log(`📦 Found ${orderHistory.length} order(s):`);
      
      orderHistory.forEach((order, index) => {
        console.log(`\n${index + 1}. Order ${order.masterOrderNumber}`);
        console.log(`   Date: ${order.orderDate}`);
        console.log(`   Total: $${order.totalAmount}`);
        console.log(`   Status: ${order.overallStatus}`);
        console.log(`   Items: ${order.summary.totalItems}`);
        console.log(`   Shipments: ${order.summary.totalDeals}`);
        
        if (order.metadata.hasFirearms) {
          console.log(`   🔫 Contains Firearms`);
        }
      });
      
    } else {
      console.log('❌ API request failed with status:', response.status);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API ERROR:', error.response.status, error.response.data);
    } else {
      console.log('❌ NETWORK ERROR:', error.message);
    }
  }
}

async function runAllTests() {
  console.log('🎯 UNIFIED ORDER SYSTEM TEST');
  console.log('=============================');
  console.log('Testing Amazon-style order experience with Zoho as system of record\n');
  
  await testUnifiedOrderAPI();
  await testCustomerOrderHistory();
  
  console.log('\n\n✅ Testing complete!');
  console.log('\n🌐 Visit http://localhost:5000/unified-order to see the frontend');
  console.log(`💡 Try searching for order: ${TEST_ORDER_NUMBER}`);
}

// Run the tests
runAllTests().catch(console.error);