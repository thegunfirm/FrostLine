/**
 * Test CMS Subscription Management System
 * This tests both the backend API endpoints and the payment processing
 */

console.log('🧪 Testing CMS Subscription Management System...\n');

// Test the FAP payment service with all 5 tiers
async function testAllSubscriptionTiers() {
  const testResults = [];
  const tiers = [
    { name: 'Bronze', monthlyPrice: 0, yearlyPrice: 0 },
    { name: 'Gold', monthlyPrice: 5.00, yearlyPrice: 50.00 },
    { name: 'Platinum Monthly', monthlyPrice: 10.00, yearlyPrice: 120.00 },
    { name: 'Platinum Founder', monthlyPrice: 4.17, yearlyPrice: 50.00 },
    { name: 'Platinum Annual', monthlyPrice: 8.25, yearlyPrice: 99.00 }
  ];

  console.log('📊 Testing all subscription tiers...\n');

  for (const tier of tiers) {
    if (tier.name === 'Bronze') {
      // Test Bronze free tier
      console.log(`🆓 Testing ${tier.name} (Free Tier)...`);
      try {
        const response = await fetch('http://localhost:5000/api/fap/process-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriptionTier: tier.name,
            billingCycle: 'monthly',
            amount: 0,
            customerInfo: {
              firstName: 'CMS Test',
              lastName: `${tier.name} User`,
              email: `cms-test-${tier.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}@example.com`
            }
          })
        });

        const result = await response.json();
        if (result.success) {
          testResults.push({
            tier: tier.name,
            email: `cms-test-${tier.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}@example.com`,
            transactionId: result.transactionId,
            amount: 0,
            billingCycle: 'monthly'
          });
          console.log(`   ✅ Success: Transaction ID ${result.transactionId}`);
        } else {
          console.log(`   ❌ Failed: ${result.error}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    } else if (tier.name === 'Platinum Annual') {
      console.log(`⏸️  Skipping ${tier.name} (Future tier, not active)`);
      continue;
    } else {
      // Test paid tiers - both monthly and yearly
      for (const cycle of ['monthly', 'yearly']) {
        const amount = cycle === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice;
        console.log(`💳 Testing ${tier.name} (${cycle} - $${amount})...`);
        
        try {
          const response = await fetch('http://localhost:5000/api/fap/process-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscriptionTier: tier.name,
              billingCycle: cycle,
              amount: amount,
              customerInfo: {
                firstName: 'CMS Test',
                lastName: `${tier.name} User`,
                email: `cms-test-${tier.name.toLowerCase().replace(/\s+/g, '-')}-${cycle}-${Date.now()}@example.com`
              }
            })
          });

          const result = await response.json();
          if (result.success) {
            testResults.push({
              tier: tier.name,
              email: `cms-test-${tier.name.toLowerCase().replace(/\s+/g, '-')}-${cycle}-${Date.now()}@example.com`,
              transactionId: result.transactionId,
              amount: amount,
              billingCycle: cycle
            });
            console.log(`   ✅ Success: Transaction ID ${result.transactionId}`);
          } else {
            console.log(`   ❌ Failed: ${result.error}`);
          }
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
    }
  }

  return testResults;
}

// Test the CMS API endpoints
async function testCMSEndpoints() {
  console.log('\n🔧 Testing CMS API Endpoints...\n');
  
  try {
    // Test getting subscription tiers (this requires auth, so it will likely fail)
    console.log('📋 Testing GET /api/cms/subscription-tiers...');
    const tiersResponse = await fetch('http://localhost:5000/api/cms/subscription-tiers');
    
    if (tiersResponse.status === 401) {
      console.log('   🔒 Expected: Requires authentication (401)');
    } else if (tiersResponse.ok) {
      const tiers = await tiersResponse.json();
      console.log(`   ✅ Success: Retrieved ${tiers.length} tiers`);
      tiers.forEach(tier => {
        console.log(`      - ${tier.tier}: Monthly $${tier.monthlyPrice}, Annual $${tier.annualPrice}`);
      });
    } else {
      console.log(`   ❌ Failed: ${tiersResponse.status} ${tiersResponse.statusText}`);
    }

    // Test the public subscription tiers endpoint
    console.log('📋 Testing GET /api/fap/subscription-tiers...');
    const publicTiersResponse = await fetch('http://localhost:5000/api/fap/subscription-tiers');
    
    if (publicTiersResponse.ok) {
      const publicTiers = await publicTiersResponse.json();
      console.log(`   ✅ Success: Retrieved ${publicTiers.length} public tiers`);
      publicTiers.forEach(tier => {
        console.log(`      - ${tier.name}: Monthly $${tier.monthlyPrice}, Yearly $${tier.yearlyPrice}`);
        console.log(`        Benefits: ${tier.benefits.join(', ')}`);
      });
    } else {
      console.log(`   ❌ Failed: ${publicTiersResponse.status} ${publicTiersResponse.statusText}`);
    }

  } catch (error) {
    console.log(`   ❌ Error testing endpoints: ${error.message}`);
  }
}

// Main test execution
async function runTests() {
  console.log('🎯 CMS Subscription Management System Test Suite\n');
  console.log('=' + '='.repeat(60) + '\n');

  // Test subscription tier processing
  const paymentResults = await testAllSubscriptionTiers();
  
  // Test CMS endpoints
  await testCMSEndpoints();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  if (paymentResults.length > 0) {
    console.log(`\n✅ Successfully processed ${paymentResults.length} subscription payments:`);
    paymentResults.forEach(result => {
      console.log(`   - ${result.tier} (${result.billingCycle}): $${result.amount} - Transaction: ${result.transactionId}`);
      console.log(`     Email: ${result.email}`);
    });
  } else {
    console.log('\n❌ No subscription payments were processed successfully');
  }

  console.log('\n🔍 NEXT STEPS:');
  console.log('1. Test the CMS UI by visiting /cms/subscription-management as an admin user');
  console.log('2. Verify the subscription management page loads correctly');
  console.log('3. Test the "Test All Tiers" button in the CMS interface');
  console.log('4. Check that all 5 tiers display with correct pricing');
  
  console.log('\n✨ Test completed! ✨');
}

// Run the tests
runTests().catch(console.error);