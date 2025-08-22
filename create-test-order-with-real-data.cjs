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

async function createTestOrderWithRealData() {
  console.log('🛒 Creating test order with real inventory data...');

  // Test order data based on what we found in the database
  const testOrderData = {
    userId: 9, // Using existing user from database
    items: [
      {
        id: 133970, // GLOCK 17 Gen 5 9mm (PA175S201)
        sku: "PA175S201",
        name: "GLOCK 17 Gen 5 9mm Luger 4.49\" Barrel 17-Round",
        manufacturer: "Glock Inc",
        category: "Handguns",
        price: 639.99,
        quantity: 1,
        requires_ffl: true,
        tier_price: 639.99 // Bronze tier
      },
      {
        id: 125935, // B5 AK P-GRIP BLACK (AKG-1503)
        sku: "AKG-1503", 
        name: "B5 AK P-GRIP BLACK",
        manufacturer: "B5",
        category: "Accessories",
        price: 20.00,
        quantity: 1,
        requires_ffl: false,
        tier_price: 20.00 // Bronze tier
      }
    ],
    totalPrice: 659.99, // 639.99 + 20.00
    fflDealerId: "1-59-017-07-6F-13700", // BACK ACRE GUN WORKS in FL
    fflRequired: true,
    shippingAddress: {
      street: "123 Test Street",
      city: "Test City", 
      state: "FL",
      zip: "12345"
    },
    paymentMethod: "credit_card",
    status: "confirmed"
  };

  try {
    console.log('📤 Submitting order to API...');
    const response = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testOrderData)
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.log('❌ Order creation failed:', response.status, response.statusText);
      console.log('Response:', responseText.substring(0, 1000));
      return;
    }

    try {
      const result = JSON.parse(responseText);
      console.log('✅ Order created successfully!');
      console.log('📋 Order Details:');
      console.log(`   Order ID: ${result.id}`);
      console.log(`   Total: $${result.total_price}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   FFL Required: ${result.ffl_required}`);
      console.log(`   FFL Dealer: ${result.ffl_dealer_id}`);
      
      if (result.zoho_deal_id) {
        console.log(`   ✅ Zoho Deal ID: ${result.zoho_deal_id}`);
      } else {
        console.log('   ⚠️  No Zoho Deal ID (may be due to token issues)');
      }

      // Test the manual sync endpoint for this order
      console.log('\n🔄 Testing manual Zoho sync...');
      const syncResponse = await fetch(`http://localhost:5000/api/orders/${result.id}/sync-zoho`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const syncResult = await syncResponse.text();
      if (syncResponse.ok) {
        try {
          const syncData = JSON.parse(syncResult);
          if (syncData.success) {
            console.log('✅ Manual sync successful!');
            console.log(`   Zoho Deal ID: ${syncData.dealId}`);
          } else {
            console.log('❌ Manual sync failed:', syncData.error);
          }
        } catch (e) {
          console.log('❌ Manual sync failed - invalid JSON response');
        }
      } else {
        console.log('❌ Manual sync request failed:', syncResponse.status);
      }

    } catch (parseError) {
      console.log('❌ Failed to parse order response:', parseError.message);
      console.log('Raw response:', responseText.substring(0, 500));
    }

  } catch (error) {
    console.log('❌ Error creating test order:', error.message);
  }
}

createTestOrderWithRealData().catch(console.error);