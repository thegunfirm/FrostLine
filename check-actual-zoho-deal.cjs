/**
 * Check Actual Zoho Deal - Retrieve the real deal to see what's in Description
 */

const axios = require('axios');

async function checkActualZohoDeal() {
  console.log('🔍 Checking Actual Zoho Deal Content');
  console.log('🎯 Investigating what is actually in the Description field\n');

  try {
    // Use the most recent deal ID from our fresh test
    const dealId = '6585331000000983011';
    
    console.log(`📋 Retrieving Deal: ${dealId}`);
    
    const response = await axios.get(`http://localhost:5000/api/test/zoho-deal/${dealId}`);

    if (response.data.success) {
      const dealData = response.data.deal;
      
      console.log('\n📊 Deal Field Contents:');
      console.log(`   Deal Name: ${dealData.Deal_Name || 'N/A'}`);
      console.log(`   Account Name: ${dealData.Account_Name || 'N/A'}`);
      console.log(`   Amount: ${dealData.Amount || 'N/A'}`);
      console.log(`   Stage: ${dealData.Stage || 'N/A'}`);
      
      console.log('\n📝 DESCRIPTION FIELD CONTENT:');
      console.log('═'.repeat(60));
      console.log(dealData.Description || 'No description');
      console.log('═'.repeat(60));
      
      // Check system fields
      console.log('\n🔧 SYSTEM FIELDS:');
      const systemFields = [
        'TGF_Order_Number', 'Fulfillment_Type', 'Flow', 'Order_Status',
        'Consignee', 'Deal_Fulfillment_Summary', 'Ordering_Account',
        'Hold_Type', 'APP_Status', 'Submitted'
      ];
      
      systemFields.forEach(field => {
        const value = dealData[field];
        if (value !== undefined && value !== null) {
          console.log(`   ✅ ${field}: ${value}`);
        } else {
          console.log(`   ❌ ${field}: MISSING`);
        }
      });
      
      // Check if description contains JSON
      const description = dealData.Description || '';
      const hasJSON = description.includes('{') || description.includes('[') || description.includes('orderNumber');
      
      console.log('\n🧹 JSON ANALYSIS:');
      console.log(`   Description has JSON: ${hasJSON ? 'YES ❌' : 'NO ✅'}`);
      
      if (hasJSON) {
        console.log('   🚨 PROBLEM DETECTED: JSON found in Description field');
        console.log('   📍 This indicates the buildOrderDescription method is still dumping JSON');
      } else {
        console.log('   ✅ Description is clean - no JSON detected');
      }
      
    } else {
      console.error('❌ Failed to retrieve deal:', response.data.error);
    }

  } catch (error) {
    console.error('❌ Check failed:', error.response?.data || error.message);
  }
}

// Run the check
checkActualZohoDeal();