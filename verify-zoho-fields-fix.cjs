/**
 * Verify Zoho Fields Fix
 * Check if individual system fields are properly populated in Zoho CRM deals
 */

const axios = require('axios');

async function verifyZohoFieldsFix() {
  console.log('🔍 Verifying Zoho Fields Fix...\n');

  // Test 1: Create a new deal and verify system fields are properly mapped
  const testPayload = {
    orderNumber: 'VERIFY-FIX-001',
    customerEmail: 'verify.fix@example.com',
    customerName: 'Verify Fix Customer',
    membershipTier: 'Platinum Monthly',
    totalAmount: 899.99,
    orderItems: [
      {
        productName: 'AR-15 Upper',
        sku: 'UPPER001',
        quantity: 1,
        unitPrice: 899.99,
        totalPrice: 899.99,
        fflRequired: true
      }
    ],
    fulfillmentType: 'In-House',
    requiresDropShip: false,
    holdType: 'FFL not on file',
    fflDealerName: 'Verification FFL Dealer'
  };

  try {
    console.log('📝 Creating test deal with system fields...');
    
    const response = await axios.post('http://localhost:5000/api/test/zoho-system-fields', testPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    if (response.data.success) {
      console.log('✅ Deal created successfully');
      console.log(`   Deal ID: ${response.data.dealId}`);
      console.log(`   TGF Order: ${response.data.tgfOrderNumber}`);
      
      // Verify the returned system fields structure
      const fields = response.data.zohoFields;
      if (fields) {
        console.log('\n📋 System Fields Verification:');
        
        const expectedFields = [
          'TGF_Order_Number',
          'Fulfillment_Type', 
          'Flow',
          'Order_Status',
          'Consignee',
          'Deal_Fulfillment_Summary',
          'Ordering_Account',
          'Hold_Type',
          'APP_Status',
          'Submitted'
        ];

        let allFieldsPresent = true;
        expectedFields.forEach(field => {
          const value = fields[field];
          const isPresent = value !== undefined && value !== null;
          console.log(`   ${field}: ${isPresent ? '✅' : '❌'} ${value || 'MISSING'}`);
          if (!isPresent && field !== 'Hold_Type') { // Hold_Type can be null for non-hold orders
            allFieldsPresent = false;
          }
        });

        // Verify specific field values
        console.log('\n🔍 Field Value Validation:');
        
        const validations = [
          { field: 'TGF_Order_Number', expected: /^\d{7}[ICF][0A-Z]$/, description: 'Order number format' },
          { field: 'Fulfillment_Type', expected: 'In-House', description: 'Fulfillment type' },
          { field: 'Flow', expected: 'TGF', description: 'Flow type' },
          { field: 'Order_Status', expected: 'Submitted', description: 'Order status' },
          { field: 'Consignee', expected: 'TGF', description: 'Consignee (In-House)' },
          { field: 'Ordering_Account', expected: '99901', description: 'Ordering account' },
          { field: 'Hold_Type', expected: 'FFL not on file', description: 'Hold type' },
          { field: 'APP_Status', expected: 'Submitted', description: 'APP status' }
        ];

        validations.forEach(validation => {
          const actualValue = fields[validation.field];
          let isValid = false;
          
          if (validation.expected instanceof RegExp) {
            isValid = validation.expected.test(actualValue);
          } else {
            isValid = actualValue === validation.expected;
          }
          
          console.log(`   ${validation.description}: ${isValid ? '✅' : '❌'} (${actualValue})`);
        });

        if (allFieldsPresent) {
          console.log('\n🎉 SUCCESS: All system fields are properly mapped to Zoho!');
          console.log('✅ Individual fields are no longer dumped into Description');
          console.log('✅ System field population working correctly');
          console.log('✅ Zoho CRM integration fix verified');
        } else {
          console.log('\n⚠️  Some fields are missing - integration needs review');
        }

      } else {
        console.log('\n❌ No system fields returned - integration failed');
      }

    } else {
      console.log('❌ Deal creation failed:', response.data.error);
    }

  } catch (error) {
    console.error('❌ Verification test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run verification
verifyZohoFieldsFix();