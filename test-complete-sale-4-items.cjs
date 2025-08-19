// Test a complete sale with 3 accessories + 1 Glock
console.log('🛒 Processing Complete Test Sale: 3 Accessories + 1 Glock');
console.log('  👤 Fake Customer');
console.log('  📦 Real RSR Inventory');
console.log('  🏪 Real FFL');
console.log('  💳 Sandbox Authorize.Net');
console.log('  🚫 NO RSR API Orders');
console.log('');

async function processTestSale() {
  try {
    // Get fresh token first
    console.log('🔄 Getting fresh Zoho token...');
    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.ZOHO_WEBSERVICES_CLIENT_ID,
        client_secret: process.env.ZOHO_WEBSERVICES_CLIENT_SECRET,
        refresh_token: process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN
      })
    });
    
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error('Failed to get fresh token');
    }
    
    console.log('✅ Fresh token obtained');
    
    // Create test order with 4 real products
    const testOrder = {
      customerInfo: {
        firstName: 'John',
        lastName: 'TestBuyer',
        email: 'john.testbuyer@fakemail.com',
        phone: '555-123-4567',
        membershipTier: 'Gold'
      },
      shippingAddress: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'TX',
        zipCode: '75001'
      },
      orderItems: [
        // Accessory 1: ALG Combat Trigger
        {
          id: 'ALG001',
          name: 'ALG Combat Trigger',
          sku: 'ACT', // Manufacturer part number
          manufacturerPartNumber: 'ACT',
          rsrStockNumber: 'ALG05158',
          manufacturer: 'ALG Defense',
          category: 'Triggers',
          quantity: 1,
          unitPrice: 65.00,
          totalPrice: 65.00,
          fflRequired: false,
          dropShipEligible: true,
          inHouseOnly: false
        },
        // Accessory 2: CMMG Receiver Extension Kit
        {
          id: 'CMMG001',
          name: 'CMMG Receiver Extension Kit',
          sku: '55DA219',
          manufacturerPartNumber: '55DA219',
          rsrStockNumber: 'CMMG55DA219',
          manufacturer: 'CMMG',
          category: 'Parts',
          quantity: 1,
          unitPrice: 32.50,
          totalPrice: 32.50,
          fflRequired: false,
          dropShipEligible: true,
          inHouseOnly: false
        },
        // Accessory 3: XS DXT2 Big Dot Night Sights
        {
          id: 'XS001',
          name: 'XS DXT2 Big Dot Night Sights',
          sku: 'GL-0003S-5',
          manufacturerPartNumber: 'GL-0003S-5',
          rsrStockNumber: 'XS24GL0003S5',
          manufacturer: 'XS Sight Systems',
          category: 'Sights',
          quantity: 1,
          unitPrice: 118.75,
          totalPrice: 118.75,
          fflRequired: false,
          dropShipEligible: true,
          inHouseOnly: false
        },
        // Firearm: Glock 19 Gen 5
        {
          id: 'GLOCK001',
          name: 'GLOCK 19 Gen 5 9mm',
          sku: 'PA195S201',
          manufacturerPartNumber: 'PA195S201',
          rsrStockNumber: 'GLOCK19015',
          manufacturer: 'GLOCK',
          category: 'Handguns',
          subcategoryName: 'Semi-Auto Pistols',
          quantity: 1,
          unitPrice: 487.50,
          totalPrice: 487.50,
          fflRequired: true,
          dropShipEligible: true,
          inHouseOnly: false
        }
      ],
      fflInfo: {
        fflId: 'TX-12345',
        businessName: 'Test Gun Shop',
        licenseNumber: '1-12-345-67-8A-01234',
        contactEmail: 'ffl@testgunshop.com',
        phone: '555-987-6543',
        address: {
          street: '456 FFL Street',
          city: 'Dallas',
          state: 'TX',
          zipCode: '75002'
        }
      },
      paymentInfo: {
        method: 'credit_card',
        provider: 'authorize_net_sandbox',
        transactionId: 'TEST_' + Date.now(),
        amount: 703.75, // Total of all items
        status: 'captured'
      },
      orderNumber: 'TGF' + Date.now().toString().slice(-6),
      totalAmount: 703.75,
      membershipTier: 'Gold',
      orderStatus: 'payment_processed'
    };

    console.log('📋 Test Order Summary:');
    console.log('  Order Number:', testOrder.orderNumber);
    console.log('  Customer:', testOrder.customerInfo.firstName, testOrder.customerInfo.lastName);
    console.log('  Items:', testOrder.orderItems.length);
    testOrder.orderItems.forEach((item, i) => {
      console.log(`    ${i+1}. ${item.name} (${item.sku}) - $${item.totalPrice} ${item.fflRequired ? '[FFL Required]' : ''}`);
    });
    console.log('  Total Amount: $' + testOrder.totalAmount);
    console.log('  FFL:', testOrder.fflInfo.businessName);
    console.log('');

    // Submit order to backend
    console.log('🚀 Submitting test order to backend...');
    
    const orderResponse = await fetch('http://localhost:5000/api/orders/test-complete-sale', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testOrder)
    });
    
    if (!orderResponse.ok) {
      throw new Error(`Order submission failed: ${orderResponse.status}`);
    }
    
    const orderResult = await orderResponse.json();
    
    console.log('📥 Order Processing Result:');
    console.log(JSON.stringify(orderResult, null, 2));
    
    if (orderResult.success) {
      console.log('✅ ORDER PROCESSED SUCCESSFULLY');
      console.log('🆔 Order ID:', orderResult.orderId);
      
      if (orderResult.zohoResult) {
        console.log('🔗 Zoho Deal ID:', orderResult.zohoResult.dealId);
        console.log('✅ Zoho integration successful');
      }
      
      // Verify products were created in Zoho with correct mapping
      if (orderResult.zohoResult && orderResult.zohoResult.dealId) {
        console.log('');
        console.log('🔍 Verifying Zoho deal and products...');
        
        // Fetch the deal to verify subform population
        const dealResponse = await fetch(`https://www.zohoapis.com/crm/v2/Deals/${orderResult.zohoResult.dealId}?fields=Product_Details,Subform_1,Deal_Name,Amount`, {
          headers: { 'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token }
        });
        
        const dealData = await dealResponse.json();
        
        if (dealData.data && dealData.data[0]) {
          const deal = dealData.data[0];
          const subformData = deal.Product_Details || deal.Subform_1 || [];
          
          console.log('📊 Deal Verification:');
          console.log('  Deal Name:', deal.Deal_Name);
          console.log('  Amount: $' + deal.Amount);
          console.log('  Products in subform:', subformData.length);
          
          if (subformData.length > 0) {
            console.log('✅ SUCCESS: Products populated in subform');
            subformData.forEach((product, i) => {
              console.log(`    ${i+1}. ${product.Product_Name || 'Unknown'}`);
              console.log(`       Code: ${product.Product_Code || 'N/A'}`);
              console.log(`       Distributor Part: ${product.Distributor_Part_Number || 'N/A'}`);
              console.log(`       Qty: ${product.Quantity}, Price: $${product.Unit_Price}`);
            });
          } else {
            console.log('❌ No products found in subform');
          }
        }
      }
      
    } else {
      console.log('❌ ORDER FAILED:', orderResult.error);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

processTestSale();