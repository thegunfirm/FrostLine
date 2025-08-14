#!/usr/bin/env node

// Direct test of Zoho email verification fields with confirmed field names
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function testZohoEmailVerificationFields() {
  console.log('🔍 TESTING ZOHO EMAIL VERIFICATION FIELDS');
  console.log('Field Names Confirmed:');
  console.log('  - Email Verified (checkbox)');
  console.log('  - Email Verification Time Stamp (date/time)');
  console.log('==========================================\n');
  
  try {
    // Test creating a contact directly with the confirmed field names
    const testContact = {
      Email: 'field.confirmed.test@thegunfirm.com',
      First_Name: 'Field',
      Last_Name: 'Confirmed',
      'Email Verified': true, // Checkbox field
      'Email Verification Time Stamp': new Date().toISOString(), // Date/time field
      Tier: 'Bronze' // Known working field
    };
    
    console.log('📋 Testing contact creation with confirmed field names...');
    console.log('Contact data:', JSON.stringify(testContact, null, 2));
    
    const response = await fetch('https://www.zohoapis.com/crm/v2/Contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${process.env.ZOHO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: [testContact]
      })
    });
    
    const result = await response.json();
    console.log('✅ Zoho Response:', JSON.stringify(result, null, 2));
    
    if (result.data?.[0]?.status === 'success') {
      console.log('\n🎉 SUCCESS! Email verification fields are working correctly!');
      console.log(`📝 Contact ID: ${result.data[0].details.id}`);
      
      // Test updating the fields
      console.log('\n2️⃣ Testing field update...');
      const updateResponse = await fetch('https://www.zohoapis.com/crm/v2/Contacts', {
        method: 'PUT',
        headers: {
          'Authorization': `Zoho-oauthtoken ${process.env.ZOHO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: [{
            id: result.data[0].details.id,
            'Email Verified': true,
            'Email Verification Time Stamp': new Date().toISOString()
          }]
        })
      });
      
      const updateResult = await updateResponse.json();
      console.log('📋 Update Response:', JSON.stringify(updateResult, null, 2));
      
      if (updateResult.data?.[0]?.status === 'success') {
        console.log('✅ Field update also successful!');
      }
      
    } else {
      console.log('❌ Contact creation failed. Response details:');
      console.log(result);
    }
    
  } catch (error) {
    console.log('❌ Error during field testing:', error.message);
  }
}

testZohoEmailVerificationFields().catch(console.error);