#!/usr/bin/env node

import { ZohoService } from './server/zoho-service.js';

async function testZohoEmailVerificationFields() {
  console.log('🔍 TESTING ZOHO EMAIL VERIFICATION FIELDS');
  console.log('==========================================\n');
  
  try {
    const zoho = new ZohoService();
    
    // First, let's get the field schema to see what's available
    console.log('1️⃣ Fetching Zoho Contact field schema...');
    
    const response = await fetch('https://www.zohoapis.com/crm/v2/settings/fields?module=Contacts', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${process.env.ZOHO_ACCESS_TOKEN}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Field schema fetched successfully\n');
    
    // Look for email verification related fields
    const emailFields = data.fields?.filter(field => 
      field.api_name?.toLowerCase().includes('email') ||
      field.api_name?.toLowerCase().includes('verification') ||
      field.api_name?.toLowerCase().includes('verified') ||
      field.field_label?.toLowerCase().includes('email') ||
      field.field_label?.toLowerCase().includes('verification') ||
      field.field_label?.toLowerCase().includes('verified')
    ) || [];
    
    console.log('📋 Email/Verification Related Fields Found:');
    emailFields.forEach(field => {
      console.log(`  • ${field.api_name} - "${field.field_label}" (${field.data_type}) ${field.custom_field ? '[Custom]' : '[Standard]'}`);
    });
    
    if (emailFields.length === 0) {
      console.log('⚠️ No email verification fields found. Showing some custom fields:');
      const customFields = data.fields?.filter(f => f.custom_field === true).slice(0, 10) || [];
      customFields.forEach(field => {
        console.log(`  • ${field.api_name} - "${field.field_label}" (${field.data_type})`);
      });
    }
    
    console.log('\n2️⃣ Testing contact creation with various field name combinations...');
    
    // Test different possible field names
    const fieldVariations = [
      'Email_Verified',
      'Email_Verification_Status', 
      'Email_Verification_Time_Stamp',
      'Email_Verified_At',
      'Verification_Status',
      'Email_Verification_Date'
    ];
    
    for (const fieldName of fieldVariations) {
      try {
        const testContact = {
          Email: `${fieldName.toLowerCase().replace(/_/g, '.')}.test@thegunfirm.com`,
          First_Name: 'Email',
          Last_Name: 'Verification',
          [fieldName]: fieldName.includes('Time') || fieldName.includes('Date') ? 
            new Date().toISOString() : 'Yes'
        };
        
        console.log(`\n🧪 Testing field: ${fieldName}`);
        console.log(`📧 Test email: ${testContact.Email}`);
        
        const result = await zoho.createContact(testContact);
        console.log(`✅ SUCCESS with ${fieldName}!`);
        console.log(`📋 Contact ID: ${result.data?.[0]?.details?.id || 'Unknown'}`);
        
        // If successful, this is our field!
        break;
        
      } catch (error) {
        console.log(`❌ Failed with ${fieldName}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Error testing Zoho fields:', error.message);
    console.log('🔍 Full error details:', error);
  }
}

testZohoEmailVerificationFields().catch(console.error);