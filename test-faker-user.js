/**
 * Test script to create a "faker" test user that bypasses email verification
 * This user will be created directly in Zoho CRM for testing purposes
 */

import axios from 'axios';

const API_BASE = 'http://localhost:5000';

async function createFakerTestUser() {
  const testUser = {
    email: `faker.test.${Date.now()}@gunfirm.com`,
    password: 'FakerTestPassword123!',
    firstName: 'John',
    lastName: 'FakerTest',
    phone: '(555) 999-0001',
    subscriptionTier: 'Platinum'
  };

  console.log('🧪 Creating "Faker" Test User (bypassing email verification)');
  console.log('=' .repeat(60));
  console.log('Test user email:', testUser.email);
  console.log('Subscription tier:', testUser.subscriptionTier);
  console.log('');

  try {
    const response = await axios.post(`${API_BASE}/api/auth/test-register`, testUser);
    
    if (response.data.success) {
      console.log('✅ SUCCESS: Test user created in Zoho CRM!');
      console.log('');
      console.log('📋 User Details:');
      console.log('- Email:', response.data.user.email);
      console.log('- Name:', response.data.user.firstName, response.data.user.lastName);
      console.log('- Zoho Contact ID:', response.data.zohoContactId);
      console.log('- Email Verified:', response.data.user.emailVerified);
      console.log('- Test Account:', response.data.user.isTestAccount);
      console.log('- Subscription Tier:', response.data.user.subscriptionTier);
      console.log('');
      console.log('🎉 This user should now be visible in your Zoho CRM!');
      console.log('');
      console.log('📝 Next steps:');
      console.log('1. Check your Zoho CRM Contacts module');
      console.log('2. Look for contact:', response.data.user.firstName, response.data.user.lastName);
      console.log('3. Verify the contact has "Test" account type');
      console.log('4. You can now test login with this user');
      
    } else {
      console.log('❌ FAILED: Test user creation failed');
      console.log('Error:', response.data.message);
      console.log('');
      console.log('💡 This likely means ZOHO_ACCESS_TOKEN is not configured');
    }
    
  } catch (error) {
    console.log('💥 ERROR: Request failed');
    console.error('Details:', error.response?.data || error.message);
    console.log('');
    console.log('🔧 Common solutions:');
    console.log('1. Make sure the server is running (npm run dev)');
    console.log('2. Configure ZOHO_ACCESS_TOKEN and ZOHO_REFRESH_TOKEN secrets');
    console.log('3. Verify Zoho CRM integration is working');
  }
}

// Run the faker test
createFakerTestUser();