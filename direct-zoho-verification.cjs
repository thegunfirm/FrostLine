#!/usr/bin/env node

// Manually load environment variables from .env file
const fs = require('fs');
const path = require('path');

try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (e) {
  console.log('No .env file found, using system environment variables');
}

async function verifyZohoDealsAndProducts() {
  console.log('🔍 Direct Zoho Deals and Products verification...');

  const accessToken = process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN;
  const apiHost = process.env.ZOHO_CRM_BASE || 'https://www.zohoapis.com';

  if (!accessToken) {
    console.log('❌ No Zoho access token found');
    return;
  }

  console.log('🔑 Using token:', accessToken.substring(0, 20) + '...');
  console.log('🌐 API Host:', apiHost);

  try {
    // Get recent deals
    console.log('\n📋 Fetching recent deals...');
    const dealsResponse = await fetch(`${apiHost}/crm/v6/Deals?fields=Deal_Name,Amount,Stage,Created_Time,Product_Details&sort_order=desc&sort_by=Created_Time&per_page=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!dealsResponse.ok) {
      console.log('❌ Deals API failed:', dealsResponse.status, dealsResponse.statusText);
      const errorText = await dealsResponse.text();
      console.log('Error response:', errorText.substring(0, 500));
    } else {
      const dealsData = await dealsResponse.json();
      console.log('✅ Deals API response received');
      
      if (dealsData.data && dealsData.data.length > 0) {
        console.log(`📊 Found ${dealsData.data.length} recent deals:`);
        dealsData.data.forEach((deal, index) => {
          console.log(`${index + 1}. ${deal.Deal_Name} (ID: ${deal.id})`);
          console.log(`   Amount: $${deal.Amount || 'N/A'}`);
          console.log(`   Stage: ${deal.Stage || 'N/A'}`);
          console.log(`   Created: ${deal.Created_Time || 'N/A'}`);
          
          if (deal.Product_Details && deal.Product_Details.length > 0) {
            console.log(`   ✅ Products in subform: ${deal.Product_Details.length}`);
            deal.Product_Details.forEach((product, pIndex) => {
              console.log(`     ${pIndex + 1}. ${product.Product_Name || 'N/A'} - Qty: ${product.Quantity || 'N/A'} - $${product.Unit_Price || 'N/A'}`);
              console.log(`        Code: ${product.Product_Code || 'N/A'}`);
              console.log(`        Manufacturer: ${product.Manufacturer || 'N/A'}`);
            });
          } else {
            console.log('   ❌ No products in subform!');
          }
          console.log('');
        });
      } else {
        console.log('📋 No recent deals found');
      }
    }

    // Get recent products from Products module
    console.log('\n🏭 Fetching recent products...');
    const productsResponse = await fetch(`${apiHost}/crm/v6/Products?fields=Product_Name,Product_Code,Manufacturer,Unit_Price,Created_Time&sort_order=desc&sort_by=Created_Time&per_page=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!productsResponse.ok) {
      console.log('❌ Products API failed:', productsResponse.status, productsResponse.statusText);
      const errorText = await productsResponse.text();
      console.log('Error response:', errorText.substring(0, 500));
    } else {
      const productsData = await productsResponse.json();
      console.log('✅ Products API response received');
      
      if (productsData.data && productsData.data.length > 0) {
        console.log(`📊 Found ${productsData.data.length} recent products in Products module:`);
        productsData.data.forEach((product, index) => {
          console.log(`${index + 1}. ${product.Product_Name || 'N/A'} (ID: ${product.id})`);
          console.log(`   Code: ${product.Product_Code || 'N/A'}`);
          console.log(`   Manufacturer: ${product.Manufacturer || 'N/A'}`);
          console.log(`   Unit Price: $${product.Unit_Price || 'N/A'}`);
          console.log('');
        });
      } else {
        console.log('🏭 No recent products found in Products module');
      }
    }

  } catch (error) {
    console.log('❌ Error during verification:', error.message);
  }
}

verifyZohoDealsAndProducts().catch(console.error);