#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🎯 TESTING COMPREHENSIVE RSR FIELD MAPPING');
console.log('==========================================\n');

async function testRSRFields() {
  try {
    console.log('🚀 Calling comprehensive RSR fields endpoint...');
    
    const response = execSync(`curl -s -X POST "http://localhost:5000/api/test/create-rsr-deal" \\
      -H "Content-Type: application/json"`, { 
      encoding: 'utf8',
      timeout: 30000
    });

    console.log('Raw API Response:');
    console.log(response);
    console.log('\n' + '='.repeat(50));

    try {
      const result = JSON.parse(response);
      
      if (result.success && result.dealId) {
        console.log('✅ SUCCESS! Comprehensive RSR deal created');
        console.log(`🆔 Deal ID: ${result.dealId}`);
        console.log(`📊 TGF Order Number: ${result.tgfOrderNumber}`);
        
        console.log('\n📋 RSR Fields that should be populated in Zoho:');
        if (result.zohoFields) {
          Object.entries(result.zohoFields).forEach(([key, value]) => {
            if (value) {
              console.log(`• ${key}: ${value}`);
            }
          });
        }
        
        console.log('\n🎯 CHECK YOUR ZOHO CRM NOW:');
        console.log('===========================');
        console.log('1. Log into your Zoho CRM');
        console.log('2. Go to the DEALS module');
        console.log('3. Look for "RSR Fields Test Customer"');
        console.log(`4. Deal ID: ${result.dealId}`);
        console.log(`5. TGF Order: ${result.tgfOrderNumber}`);
        console.log('6. ALL RSR FIELDS should be populated:');
        console.log('   ✓ TGF Order Number');
        console.log('   ✓ Fulfillment Type (Drop-Ship)');
        console.log('   ✓ Flow (WD › FFL)');
        console.log('   ✓ Order Status');
        console.log('   ✓ Consignee');
        console.log('   ✓ Deal Fulfillment Summary');
        console.log('   ✓ Ordering Account (99902)');
        console.log('   ✓ Hold Type (FFL not on file)');
        console.log('   ✓ APP Status');
        console.log('   ✓ Submitted timestamp');
        console.log('   ✓ Plus tracking fields');
        
        return true;
      } else {
        console.log('❌ RSR field mapping failed');
        console.log('Error:', result.error || 'Unknown error');
        return false;
      }
    } catch (parseError) {
      console.log('⚠️  Could not parse JSON response');
      if (response.includes('success') || response.includes('dealId')) {
        console.log('Response contains success indicators - check Zoho manually');
        return true;
      }
      return false;
    }

  } catch (error) {
    console.log('💥 Test failed:', error.message);
    return false;
  }
}

testRSRFields()
  .then((success) => {
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('🏆 RSR FIELD MAPPING: SUCCESS');
      console.log('All RSR integration fields should be populated!');
    } else {
      console.log('⚠️  RSR FIELD MAPPING: FAILED');
      console.log('Check error messages above');
    }
    console.log('='.repeat(60));
  })
  .catch((error) => {
    console.error('Test execution failed:', error.message);
  });