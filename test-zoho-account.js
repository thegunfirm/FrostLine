#!/usr/bin/env node

// Test script to create a test account in Zoho CRM after OAuth completion
// This will verify the Zoho integration is working properly

const axios = require('axios');

async function createTestAccount() {
  console.log('🧪 Creating test account for Zoho verification...');
  
  const testAccount = {
    firstName: "Test",
    lastName: "Account", 
    email: "zoho.test.verification@thegunfirm.com",
    phone: "555-0199",
    subscriptionTier: "Bronze Monthly"
  };
  
  try {
    const response = await axios.post('http://localhost:5000/api/register', testAccount, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ Test account created successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('');
    console.log('📋 Check your Zoho CRM for this new contact:');
    console.log(`- Name: ${testAccount.firstName} ${testAccount.lastName}`);
    console.log(`- Email: ${testAccount.email}`);
    console.log(`- Phone: ${testAccount.phone}`);
    console.log(`- Subscription: ${testAccount.subscriptionTier}`);
    console.log(`- Lead Source: Website`);
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Registration failed:', error.response.data);
      if (error.response.status === 400 && error.response.data.message?.includes('No access token')) {
        console.log('');
        console.log('🔐 OAuth authentication needed first!');
        console.log('Complete authentication at the provided URL, then run this script again.');
      }
    } else {
      console.error('Network error:', error.message);
    }
  }
}

async function checkZohoStatus() {
  try {
    const response = await axios.get('http://localhost:5000/api/zoho/status', {
      timeout: 5000
    });
    
    console.log('🔍 Zoho Connection Status:', response.data);
    return response.data.isConnected;
  } catch (error) {
    console.log('❌ Could not check Zoho status:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Zoho CRM Integration\n');
  
  // Check connection status first
  const isConnected = await checkZohoStatus();
  console.log('');
  
  if (!isConnected) {
    console.log('⚠️  OAuth authentication required first');
    console.log('Please complete authentication at the provided URL');
    console.log('');
  }
  
  // Attempt to create test account regardless
  await createTestAccount();
}

if (require.main === module) {
  main().catch(console.error);
}