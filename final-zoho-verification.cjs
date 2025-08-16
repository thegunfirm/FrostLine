/**
 * Final Zoho Verification
 * Verify that the actual Zoho CRM deal contains individual system fields
 */

const axios = require('axios');

async function verifyActualZohoDeal() {
  console.log('🔍 Final Verification: Checking actual Zoho CRM deal fields\n');
  
  const dealId = '6585331000000973007'; // From our successful test
  
  try {
    // Make request to retrieve deal from Zoho CRM
    const response = await axios.get(`http://localhost:5000/api/test/zoho-deal/${dealId}`);
    
    if (response.data.success && response.data.deal) {
      const deal = response.data.deal;
      console.log('✅ Successfully retrieved deal from Zoho CRM');
      console.log(`📄 Deal Name: ${deal.Deal_Name}`);
      console.log(`💰 Amount: $${deal.Amount}`);
      console.log(`📧 Stage: ${deal.Stage}\n`);
      
      console.log('🔍 Verifying individual system fields in Zoho CRM:');
      
      const systemFields = [
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
      
      let fieldsPresent = 0;
      systemFields.forEach(field => {
        const value = deal[field];
        if (value !== undefined && value !== null && value !== '') {
          console.log(`   ✅ ${field}: ${value}`);
          fieldsPresent++;
        } else {
          console.log(`   ❌ ${field}: MISSING or NULL`);
        }
      });
      
      console.log(`\n📊 Result: ${fieldsPresent}/${systemFields.length} system fields present in Zoho CRM`);
      
      if (fieldsPresent === systemFields.length) {
        console.log('\n🎉 SUCCESS: All system fields properly mapped to individual Zoho CRM fields!');
        console.log('✅ The fix is working correctly - no more data dumping into Description');
        console.log('✅ Zoho CRM now has structured, searchable order data');
      } else {
        console.log('\n⚠️  Some fields missing - integration needs review');
      }
      
    } else {
      console.log('❌ Failed to retrieve deal from Zoho:', response.data.error);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run verification
verifyActualZohoDeal();