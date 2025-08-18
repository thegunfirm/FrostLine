// Direct test of Zoho subform creation using the exact same methods as the server
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testZohoSubformDirectly() {
  console.log('🔧 DIRECT ZOHO SUBFORM TEST');
  console.log('============================');
  
  try {
    // Import the server Zoho service with the exact same config
    const { ZohoService } = require('./server/zoho-service.ts');
    
    const zohoConfig = {
      clientId: process.env.ZOHO_WEBSERVICES_CLIENT_ID,
      clientSecret: process.env.ZOHO_WEBSERVICES_CLIENT_SECRET,
      redirectUri: process.env.ZOHO_REDIRECT_URI,
      accountsHost: process.env.ZOHO_ACCOUNTS_HOST || 'https://accounts.zoho.com',
      apiHost: process.env.ZOHO_CRM_BASE || 'https://www.zohoapis.com',
      accessToken: process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN,
      refreshToken: process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN
    };

    console.log('🔧 Creating ZohoService with config...');
    const zohoService = new ZohoService(zohoConfig);
    
    // Test order data matching our accessories test
    const testOrderData = {
      contactId: '6585331000005593139', // Bronze test user contact ID
      orderNumber: 'TGF-TEST-' + Date.now(),
      totalAmount: 1500.00,
      orderItems: [
        {
          productName: 'Magpul PMAG Magazine',
          sku: '153800',
          quantity: 2,
          unitPrice: 15.99,
          totalPrice: 31.98,
          rsrStockNumber: '153800',
          manufacturer: 'Magpul',
          category: 'Magazines',
          fflRequired: false,
          dropShipEligible: true,
          inHouseOnly: false
        },
        {
          productName: 'Trijicon TenMile Scope',
          sku: '150932', 
          quantity: 1,
          unitPrice: 750.00,
          totalPrice: 750.00,
          rsrStockNumber: '150932',
          manufacturer: 'Trijicon',
          category: 'Optics',
          fflRequired: false,
          dropShipEligible: true,
          inHouseOnly: false
        },
        {
          productName: 'Trijicon Huron Scope',
          sku: '150818',
          quantity: 1,
          unitPrice: 650.00,
          totalPrice: 650.00,
          rsrStockNumber: '150818',
          manufacturer: 'Trijicon',
          category: 'Optics',
          fflRequired: false,
          dropShipEligible: true,
          inHouseOnly: false
        }
      ],
      membershipTier: 'Bronze',
      fflRequired: true,
      fflDealerName: 'BACK ACRE GUN WORKS',
      orderStatus: 'processing',
      systemFields: {
        TGF_Order_Number: 'TGF-TEST-' + Date.now(),
        Customer_Tier: 'Bronze',
        Order_Source: 'TheGunFirm.com',
        Payment_Method: 'Authorize.Net',
        Fulfillment_Type: 'Mixed'
      }
    };

    console.log('🚀 Creating Zoho deal with subform...');
    console.log(`📋 Order contains ${testOrderData.orderItems.length} products`);
    
    const result = await zohoService.createOrderDeal(testOrderData);
    
    console.log('📊 Deal creation result:', result);
    
    if (result.success) {
      console.log(`✅ SUCCESS: Deal created with ID: ${result.dealId}`);
      console.log('🔍 This deal should contain subforms with the 3 accessories');
      
      // Wait and then verify the subform
      console.log('⏳ Waiting 2 seconds for Zoho to process...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('🔍 Verifying subform population...');
      const verification = await zohoService.verifyDealSubform(result.dealId, 3);
      
      if (verification) {
        console.log('🎉 SUBFORM VERIFICATION SUCCESSFUL!');
        console.log('✅ All products appear in the subform as expected');
      } else {
        console.log('❌ SUBFORM VERIFICATION FAILED');
        console.log('⚠️  Subform may be empty or using different field name');
      }
    } else {
      console.log('❌ DEAL CREATION FAILED');
      console.log('Error:', result.error);
    }

  } catch (error) {
    console.error('❌ Direct test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testZohoSubformDirectly();