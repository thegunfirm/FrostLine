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

async function checkZohoDealsAndProducts() {
  console.log('🔍 Checking Zoho Deals module and Products module configuration...');

  try {
    // Make API call to check recent deals
    const response = await fetch('http://localhost:5000/api/zoho/test-deals-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        checkType: 'recent_deals_and_products'
      })
    });

    if (!response.ok) {
      console.log('❌ API call failed:', response.status, response.statusText);
      const text = await response.text();
      console.log('Response:', text.substring(0, 500));
      return;
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Zoho check completed successfully');
      
      if (result.deals && result.deals.length > 0) {
        console.log('\n📋 Recent Deals:');
        result.deals.forEach((deal, index) => {
          console.log(`${index + 1}. ${deal.Deal_Name} (ID: ${deal.id})`);
          console.log(`   Amount: $${deal.Amount}`);
          console.log(`   Stage: ${deal.Stage}`);
          console.log(`   Created: ${deal.Created_Time}`);
          
          if (deal.Product_Details && deal.Product_Details.length > 0) {
            console.log(`   Products in subform: ${deal.Product_Details.length}`);
            deal.Product_Details.forEach((product, pIndex) => {
              console.log(`     ${pIndex + 1}. ${product.Product_Name} - Qty: ${product.Quantity} - $${product.Unit_Price}`);
            });
          } else {
            console.log('   ⚠️  No products in subform');
          }
        });
      } else {
        console.log('📋 No recent deals found');
      }

      if (result.products && result.products.length > 0) {
        console.log('\n🏭 Recent Products in Products Module:');
        result.products.forEach((product, index) => {
          console.log(`${index + 1}. ${product.Product_Name} (ID: ${product.id})`);
          console.log(`   Code: ${product.Product_Code}`);
          console.log(`   Manufacturer: ${product.Manufacturer}`);
          console.log(`   Unit Price: $${product.Unit_Price}`);
        });
      } else {
        console.log('🏭 No recent products found in Products module');
      }

      if (result.issues && result.issues.length > 0) {
        console.log('\n⚠️  Issues found:');
        result.issues.forEach(issue => {
          console.log(`- ${issue}`);
        });
      }

    } else {
      console.log('❌ Zoho check failed:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Error checking Zoho:', error.message);
  }
}

checkZohoDealsAndProducts().catch(console.error);