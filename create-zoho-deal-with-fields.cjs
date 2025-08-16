#!/usr/bin/env node

/**
 * Create Zoho Deal with All RSR Fields
 * This will create a deal with all the custom RSR integration fields populated
 */

const { execSync } = require('child_process');

console.log('🎯 CREATING ZOHO DEAL WITH FULL RSR FIELDS');
console.log('===========================================\n');

async function createDealWithAllFields() {
  try {
    console.log('📦 Creating comprehensive order deal with RSR fields...');
    
    // Create a test API endpoint that calls the processOrderWithRSRFields method
    const testEndpoint = `
      // Test endpoint to create deal with RSR fields
      app.post("/api/test/create-rsr-deal", async (req, res) => {
        try {
          const { orderZohoIntegration } = await import('./order-zoho-integration');
          
          const testOrderData = {
            orderNumber: \`RSR-FIELDS-TEST-\${Date.now()}\`,
            totalAmount: 1299.99,
            customerEmail: 'rsrfieldtest@thegunfirm.com',
            customerName: 'RSR Fields Test Customer',
            membershipTier: 'Bronze',
            orderItems: [
              {
                productName: 'GLOCK 19 Gen 5 9mm Luger',
                sku: 'PI1950203',
                rsrStockNumber: 'PI1950203',
                quantity: 1,
                unitPrice: 1299.99,
                totalPrice: 1299.99,
                fflRequired: true
              }
            ],
            fflDealerName: 'RSR Test FFL Dealer',
            orderStatus: 'pending',
            fulfillmentType: 'Drop-Ship',
            orderingAccount: '99902',
            requiresDropShip: true,
            holdType: 'FFL not on file',
            isTestOrder: true
          };

          console.log('🔄 Using processOrderWithRSRFields for comprehensive field mapping...');
          const result = await orderZohoIntegration.processOrderWithRSRFields(testOrderData);

          if (result.success) {
            res.json({
              success: true,
              dealId: result.dealId,
              tgfOrderNumber: result.tgfOrderNumber,
              zohoFields: result.zohoFields,
              message: 'RSR deal created with all fields'
            });
          } else {
            res.status(500).json({
              success: false,
              error: result.error,
              message: 'RSR deal creation failed'
            });
          }

        } catch (error) {
          console.error('RSR deal creation error:', error);
          res.status(500).json({
            success: false,
            error: error.message,
            message: 'RSR deal creation execution failed'
          });
        }
      });
    `;

    // Write the endpoint temporarily to routes file (append)
    const routesPath = './server/routes.ts';
    const { readFileSync, writeFileSync } = require('fs');
    
    console.log('📝 Adding temporary test endpoint...');
    const routesContent = readFileSync(routesPath, 'utf8');
    const tempRoutesContent = routesContent + '\n\n  ' + testEndpoint.trim() + '\n';
    writeFileSync(routesPath + '.backup', routesContent); // Backup original
    writeFileSync(routesPath, tempRoutesContent);

    // Wait for server to reload
    console.log('⏳ Waiting for server to reload...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Make the API call
    console.log('🚀 Calling RSR fields API...');
    const response = execSync(`curl -s -X POST "http://localhost:5000/api/test/create-rsr-deal" \\
      -H "Content-Type: application/json"`, { 
      encoding: 'utf8',
      timeout: 30000
    });

    console.log('API Response:');
    console.log(response);
    console.log('\n');

    // Restore original routes file
    console.log('🔄 Restoring original routes file...');
    const originalContent = readFileSync(routesPath + '.backup', 'utf8');
    writeFileSync(routesPath, originalContent);
    require('fs').unlinkSync(routesPath + '.backup');

    // Parse the response
    try {
      const result = JSON.parse(response);
      
      if (result.success && result.dealId) {
        console.log('✅ SUCCESS! Comprehensive RSR deal created');
        console.log('🆔 Deal ID:', result.dealId);
        console.log('📊 TGF Order Number:', result.tgfOrderNumber);
        console.log('\n📋 RSR Fields Populated:');
        
        if (result.zohoFields) {
          Object.entries(result.zohoFields).forEach(([key, value]) => {
            if (value) {
              console.log(\`• \${key}: \${value}\`);
            }
          });
        }
        
        console.log('\n🎯 CHECK YOUR ZOHO CRM NOW:');
        console.log('===========================');
        console.log('1. Log into your Zoho CRM');
        console.log('2. Go to the DEALS module');
        console.log('3. Look for deal: "RSR Fields Test Customer"');
        console.log(\`4. Deal ID: \${result.dealId}\`);
        console.log(\`5. TGF Order Number: \${result.tgfOrderNumber}\`);
        console.log('6. Click on the deal to see ALL RSR FIELDS populated:');
        console.log('   • TGF Order Number');
        console.log('   • Fulfillment Type (Drop-Ship)');
        console.log('   • Flow (WD › FFL)');
        console.log('   • Order Status');
        console.log('   • Consignee');
        console.log('   • Deal Fulfillment Summary');
        console.log('   • Ordering Account (99902)');
        console.log('   • Hold Type (FFL not on file)');
        console.log('   • APP Status');
        console.log('   • Submitted timestamp');
        console.log('   • Plus tracking fields');
        
        return true;
      } else {
        console.log('❌ RSR deal creation failed');
        console.log('Error:', result.error || 'Unknown error');
        return false;
      }
    } catch (parseError) {
      console.log('⚠️  Could not parse response:');
      console.log(response.substring(0, 500));
      return false;
    }

  } catch (error) {
    console.log('💥 Test failed:', error.message);
    
    // Make sure to restore routes file even on error
    try {
      const { readFileSync, writeFileSync, existsSync } = require('fs');
      if (existsSync('./server/routes.ts.backup')) {
        const originalContent = readFileSync('./server/routes.ts.backup', 'utf8');
        writeFileSync('./server/routes.ts', originalContent);
        require('fs').unlinkSync('./server/routes.ts.backup');
        console.log('🔄 Routes file restored after error');
      }
    } catch (restoreError) {
      console.log('⚠️  Could not restore routes file:', restoreError.message);
    }
    
    return false;
  }
}

// Run the test
createDealWithAllFields()
  .then((success) => {
    console.log('\n' + '='.repeat(70));
    if (success) {
      console.log('🏆 RSR FIELDS DEAL CREATION: SUCCESS');
      console.log('All 13+ RSR integration fields should now be populated in Zoho!');
    } else {
      console.log('⚠️  RSR FIELDS DEAL CREATION: FAILED');
      console.log('Check the error messages above');
    }
    console.log('='.repeat(70));
  })
  .catch((error) => {
    console.error('Test execution failed:', error.message);
  });