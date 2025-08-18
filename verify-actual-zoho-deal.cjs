#!/usr/bin/env node

const axios = require('axios');

async function verifyZohoDeal() {
  console.log('🔍 VERIFYING ACTUAL ZOHO DEAL CONTENT');
  console.log('====================================');
  
  try {
    // Check if we have a working Zoho token
    const tokenResponse = await axios.get('http://localhost:5000/api/test/zoho-token-status');
    console.log('🔑 Zoho Token Status:', tokenResponse.data);
    
    // Test deal ID from our orders
    const dealId = '6585331000000988245';
    console.log(`🎯 Testing Deal ID: ${dealId}`);
    
    // Try to fetch the deal details
    const dealResponse = await axios.get(`http://localhost:5000/api/test/zoho-deal/${dealId}`);
    console.log('📋 Deal Details:', dealResponse.data);
    
    // Check for products in the deal
    if (dealResponse.data.success && dealResponse.data.deal) {
      const deal = dealResponse.data.deal;
      console.log('\n📦 PRODUCT VERIFICATION:');
      console.log('- Product_Details:', deal.Product_Details || 'Not found');
      console.log('- Deal_Products:', deal.Deal_Products || 'Not found');
      console.log('- Quoted_Items:', deal.Quoted_Items || 'Not found');
      
      // Check if any product-related fields exist
      const productFields = Object.keys(deal).filter(key => 
        key.toLowerCase().includes('product') || 
        key.toLowerCase().includes('item') ||
        key.toLowerCase().includes('sku')
      );
      
      console.log('\n🔍 All product-related fields found:');
      productFields.forEach(field => {
        console.log(`- ${field}: ${JSON.stringify(deal[field])}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Verification Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
  }
}

verifyZohoDeal();