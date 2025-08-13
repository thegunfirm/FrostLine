#!/usr/bin/env node

import axios from 'axios';
const baseURL = 'http://localhost:5000';

// Test accounts for each tier
const testAccounts = [
  {
    tier: 'Bronze',
    billingCycle: 'monthly', // Bronze is free so cycle doesn't matter
    amount: 0,
    user: {
      email: `bronze.test.${Date.now()}@thegunfirm.com`,
      firstName: 'Bronze',
      lastName: 'TestUser',
      password: 'TestPassword123!'
    }
  },
  {
    tier: 'Gold',
    billingCycle: 'monthly',
    amount: 5,
    user: {
      email: `gold.monthly.${Date.now()}@thegunfirm.com`,
      firstName: 'Gold',
      lastName: 'MonthlyUser',
      password: 'TestPassword123!'
    }
  },
  {
    tier: 'Gold',
    billingCycle: 'yearly',
    amount: 50,
    user: {
      email: `gold.yearly.${Date.now()}@thegunfirm.com`,
      firstName: 'Gold',
      lastName: 'YearlyUser',
      password: 'TestPassword123!'
    }
  },
  {
    tier: 'Platinum Monthly',
    billingCycle: 'monthly',
    amount: 10,
    user: {
      email: `platinum.monthly.${Date.now()}@thegunfirm.com`,
      firstName: 'Platinum',
      lastName: 'MonthlyUser',
      password: 'TestPassword123!'
    }
  },
  {
    tier: 'Platinum Founder',
    billingCycle: 'yearly',
    amount: 50,
    user: {
      email: `platinum.founder.${Date.now()}@thegunfirm.com`,
      firstName: 'Platinum',
      lastName: 'FounderUser',
      password: 'TestPassword123!'
    }
  }
];

console.log('🧪 Creating 5 Test User Accounts Through UI Process...');
console.log('📝 This simulates the complete registration and subscription flow');
console.log('✅ Each account will be processed with proper tier assignment');
console.log('🔄 Results should sync to Zoho CRM Contact module with Tier field\n');

async function createTestAccount(account, index) {
  try {
    console.log(`\n🎯 Creating Test Account ${index + 1}/5`);
    console.log(`   Tier: ${account.tier}`);
    console.log(`   Billing: ${account.billingCycle}`);
    console.log(`   Amount: $${account.amount}`);
    console.log(`   Email: ${account.user.email}`);

    // Step 1: Register user account (this would normally happen through UI form)
    console.log('   📝 Step 1: User registration...');
    const registrationResponse = await axios.post(`${baseURL}/api/auth/register`, {
      email: account.user.email,
      firstName: account.user.firstName,
      lastName: account.user.lastName,
      password: account.user.password
    });

    if (registrationResponse.status === 200 || registrationResponse.status === 201) {
      console.log('   ✅ User registration successful');
    } else {
      console.log('   ⚠️  User registration response:', registrationResponse.status);
    }

    // Step 2: Process subscription (this would normally happen through UI subscription form)
    console.log('   💳 Step 2: Processing subscription...');
    const subscriptionResponse = await axios.post(`${baseURL}/api/fap/process-subscription`, {
      subscriptionTier: account.tier,
      billingCycle: account.billingCycle,
      amount: account.amount,
      customerInfo: {
        email: account.user.email,
        firstName: account.user.firstName,
        lastName: account.user.lastName
      }
    });

    if (subscriptionResponse.data.success) {
      console.log('   ✅ Subscription processed successfully');
      console.log(`   📧 Transaction ID: ${subscriptionResponse.data.transactionId}`);
      console.log(`   🎉 Account created with ${account.tier} membership`);
      
      return {
        success: true,
        email: account.user.email,
        tier: account.tier,
        billingCycle: account.billingCycle,
        transactionId: subscriptionResponse.data.transactionId
      };
    } else {
      console.log('   ❌ Subscription failed:', subscriptionResponse.data.error);
      return {
        success: false,
        email: account.user.email,
        tier: account.tier,
        error: subscriptionResponse.data.error
      };
    }

  } catch (error) {
    console.log(`   ❌ Error creating account: ${error.message}`);
    return {
      success: false,
      email: account.user.email,
      tier: account.tier,
      error: error.message
    };
  }
}

async function runTest() {
  const results = [];
  
  // Create accounts sequentially to avoid rate limiting
  for (let i = 0; i < testAccounts.length; i++) {
    const result = await createTestAccount(testAccounts[i], i);
    results.push(result);
    
    // Small delay between account creations
    if (i < testAccounts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary report
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST ACCOUNT CREATION SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}\n`);

  if (successful.length > 0) {
    console.log('🎉 Successfully Created Accounts:');
    successful.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.email}`);
      console.log(`      Tier: ${result.tier} (${result.billingCycle})`);
      console.log(`      Transaction: ${result.transactionId}\n`);
    });
  }

  if (failed.length > 0) {
    console.log('❌ Failed Account Creations:');
    failed.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.email}`);
      console.log(`      Tier: ${result.tier}`);
      console.log(`      Error: ${result.error}\n`);
    });
  }

  console.log('🔍 Next Steps:');
  console.log('   1. Check Zoho CRM Contacts module for these accounts');
  console.log('   2. Verify "Tier" field is populated correctly');
  console.log('   3. Confirm subscription status in each contact record');
  console.log('\n✨ Test Complete!');
}

runTest().catch(console.error);