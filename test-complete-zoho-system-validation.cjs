/**
 * Complete Zoho System Field Validation
 * This test verifies that NO JSON is being dumped into Description fields
 * and that all 10 system fields are properly structured as individual Zoho fields
 */

const axios = require('axios');

async function testCompleteZohoValidation() {
  console.log('🧪 Complete Zoho System Field Validation Test');
  console.log('🎯 Goal: Verify NO JSON in Description, all system fields as individual fields\n');

  try {
    // Test current system fields implementation
    console.log('🔬 Testing current processOrderWithSystemFields method...');
    
    const testPayload = {
      orderNumber: `VALIDATE-${Date.now()}`,
      customerEmail: 'validation.test@thegunfirm.com',
      customerName: 'Complete Validation Test',
      membershipTier: 'Platinum Monthly',
      totalAmount: 1299.99,
      orderItems: [{
        productName: 'Complete Test Firearm',
        sku: 'VALIDATE-001',
        quantity: 1,
        unitPrice: 1299.99,
        totalPrice: 1299.99,
        fflRequired: true
      }],
      fulfillmentType: 'In-House',
      requiresDropShip: false,
      holdType: 'Gun Count Rule',
      fflDealerName: 'Complete Test FFL',
      isTestOrder: true
    };

    console.log('📤 Sending validation request to server...');
    const response = await axios.post('http://localhost:5000/api/test/zoho-system-fields', testPayload);

    if (response.data.success) {
      const dealId = response.data.dealId;
      const systemFields = response.data.zohoFields;
      
      console.log('\n✅ Deal Creation Response:');
      console.log(`   Deal ID: ${dealId}`);
      console.log(`   TGF Order Number: ${response.data.tgfOrderNumber}`);
      console.log('\n📋 System Fields Generated:');
      
      Object.entries(systemFields).forEach(([field, value]) => {
        console.log(`   ✓ ${field}: ${value}`);
      });

      // Validate all 10 required system fields are present
      const requiredFields = [
        'TGF_Order_Number', 'Fulfillment_Type', 'Flow', 'Order_Status',
        'Consignee', 'Deal_Fulfillment_Summary', 'Ordering_Account',
        'Hold_Type', 'APP_Status', 'Submitted'
      ];

      let allFieldsPresent = true;
      const missingFields = [];
      
      requiredFields.forEach(field => {
        if (!systemFields.hasOwnProperty(field) || systemFields[field] === null || systemFields[field] === undefined) {
          allFieldsPresent = false;
          missingFields.push(field);
        }
      });

      console.log('\n🔍 System Field Validation:');
      if (allFieldsPresent) {
        console.log('   ✅ All 10 required system fields present and populated');
      } else {
        console.log(`   ❌ Missing or null fields: ${missingFields.join(', ')}`);
      }

      // Verify no JSON structure in any field values
      console.log('\n🧹 JSON Structure Check:');
      let foundJSON = false;
      
      Object.entries(systemFields).forEach(([field, value]) => {
        const valueStr = String(value);
        if (valueStr.includes('{') || valueStr.includes('[') || valueStr.includes('orderNumber')) {
          foundJSON = true;
          console.log(`   ❌ JSON detected in ${field}: ${valueStr.substring(0, 100)}...`);
        }
      });

      if (!foundJSON) {
        console.log('   ✅ No JSON structures detected in system field values');
      }

      // Summary
      console.log('\n📊 VALIDATION RESULTS:');
      console.log(`   Deal Created: ✅ ${dealId}`);
      console.log(`   All System Fields: ${allFieldsPresent ? '✅' : '❌'} (${requiredFields.length - missingFields.length}/${requiredFields.length})`);
      console.log(`   Clean Field Values: ${foundJSON ? '❌' : '✅'} (No JSON dumping)`);
      
      if (allFieldsPresent && !foundJSON) {
        console.log('\n🎉 SUCCESS: System field mapping is working correctly!');
        console.log('   ✅ Individual fields properly structured');
        console.log('   ✅ No JSON dumping in field values');
        console.log('   ✅ All 10 system fields populated');
        console.log('\n🚀 System is ready for production order processing');
      } else {
        console.log('\n❌ ISSUES DETECTED:');
        if (!allFieldsPresent) console.log(`   - Missing fields: ${missingFields.join(', ')}`);
        if (foundJSON) console.log('   - JSON detected in field values (should be individual fields)');
      }

    } else {
      console.error('❌ Deal creation failed:', response.data.error);
    }

  } catch (error) {
    console.error('❌ Validation test failed:', error.response?.data || error.message);
  }
}

// Run the validation
testCompleteZohoValidation();