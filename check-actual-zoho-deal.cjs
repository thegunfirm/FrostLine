/**
 * Check Actual Zoho Deal
 * Directly query Zoho CRM to see what fields are actually populated
 */

const axios = require('axios');

async function checkActualZohoDeal() {
  console.log('🔍 Checking actual Zoho CRM deal fields...\n');
  
  // Use one of the deal IDs from our recent tests
  const dealId = '6585331000000973007';
  
  try {
    console.log(`📋 Retrieving deal ${dealId} from Zoho CRM...`);
    
    const response = await axios.get(`http://localhost:5000/api/zoho/deals/${dealId}`, {
      timeout: 30000
    });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      const deal = response.data.data[0];
      
      console.log('✅ Successfully retrieved deal from Zoho CRM');
      console.log(`📄 Deal Name: ${deal.Deal_Name || 'N/A'}`);
      console.log(`💰 Amount: ${deal.Amount || 'N/A'}`);
      console.log(`📧 Stage: ${deal.Stage || 'N/A'}\n`);
      
      console.log('🔍 Checking individual system fields in actual Zoho deal:');
      
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
      let fieldsEmpty = 0;
      
      systemFields.forEach(field => {
        const value = deal[field];
        if (value !== undefined && value !== null && value !== '') {
          console.log(`   ✅ ${field}: ${value}`);
          fieldsPresent++;
        } else {
          console.log(`   ❌ ${field}: ${value === undefined ? 'UNDEFINED' : value === null ? 'NULL' : 'EMPTY'}`);
          fieldsEmpty++;
        }
      });
      
      // Also check if data is still being dumped into Description
      const description = deal.Description;
      if (description) {
        console.log(`\n📝 Description field content:`);
        console.log(`   ${description.substring(0, 200)}${description.length > 200 ? '...' : ''}`);
        
        // Check if it's JSON (indicates old behavior)
        try {
          JSON.parse(description);
          console.log('   ⚠️  Description contains JSON - old behavior still active!');
        } catch (e) {
          console.log('   ✅ Description is plain text - not JSON dumping');
        }
      } else {
        console.log(`\n📝 Description field: EMPTY`);
      }
      
      console.log(`\n📊 Field Population Summary:`);
      console.log(`   Fields Present: ${fieldsPresent}`);
      console.log(`   Fields Empty: ${fieldsEmpty}`);
      console.log(`   Total Fields: ${systemFields.length}`);
      
      if (fieldsPresent === 0) {
        console.log('\n❌ CRITICAL ISSUE: NO system fields are populated in Zoho CRM');
        console.log('   The API calls are succeeding but fields are not being saved');
        console.log('   This suggests a field mapping or API payload issue');
      } else if (fieldsPresent < systemFields.length) {
        console.log('\n⚠️  PARTIAL SUCCESS: Some fields populated, others missing');
      } else {
        console.log('\n🎉 SUCCESS: All system fields properly populated in Zoho CRM');
      }
      
      // Show all available fields in the deal
      console.log('\n📋 All available fields in this Zoho deal:');
      Object.keys(deal).forEach(key => {
        const value = deal[key];
        if (value !== null && value !== undefined && value !== '') {
          console.log(`   ${key}: ${typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value}`);
        }
      });
      
    } else {
      console.log('❌ No deal data found in response');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Failed to retrieve deal from Zoho:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the check
checkActualZohoDeal();