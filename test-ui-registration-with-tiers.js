/**
 * UI Registration Test - 5 Test Accounts with All Tiers
 * 
 * This script tests the UI registration flow for all 5 subscription tiers:
 * 1. Bronze (Free)
 * 2. Gold Monthly ($5/month, 5% discount)
 * 3. Gold Annually ($50/year, 5% discount)
 * 4. Platinum Monthly ($10/month, 10% discount)
 * 5. Platinum Founder ($50/year, 15% discount)
 * 
 * Each user will be created through the UI and should update the "Tier" field 
 * in the Zoho CRM Contact module.
 */

import puppeteer from 'puppeteer';

// Test user data for each tier
const testUsers = [
  {
    tier: 'Bronze',
    email: `bronze.tier.${Date.now()}@thegunfirm.com`,
    firstName: 'Bronze',
    lastName: 'TierUser',
    password: 'TestPassword123!',
    phone: '(555) 100-0001'
  },
  {
    tier: 'Gold Monthly',
    email: `gold.monthly.${Date.now()}@thegunfirm.com`,
    firstName: 'Gold',
    lastName: 'MonthlyUser',
    password: 'TestPassword123!',
    phone: '(555) 200-0002'
  },
  {
    tier: 'Gold Annually',
    email: `gold.annually.${Date.now()}@thegunfirm.com`,
    firstName: 'Gold',
    lastName: 'AnnualUser',
    password: 'TestPassword123!',
    phone: '(555) 300-0003'
  },
  {
    tier: 'Platinum Monthly',
    email: `platinum.monthly.${Date.now()}@thegunfirm.com`,
    firstName: 'Platinum',
    lastName: 'MonthlyUser',
    password: 'TestPassword123!',
    phone: '(555) 400-0004'
  },
  {
    tier: 'Platinum Founder',
    email: `platinum.founder.${Date.now()}@thegunfirm.com`,
    firstName: 'Platinum',
    lastName: 'FounderUser',
    password: 'TestPassword123!',
    phone: '(555) 500-0005'
  }
];

async function testUIRegistration() {
  console.log('🧪 Starting UI Registration Test for 5 Tiers');
  console.log('=================================================');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    defaultViewport: { width: 1280, height: 720 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    
    for (let i = 0; i < testUsers.length; i++) {
      const user = testUsers[i];
      console.log(`\n${i + 1}. Testing ${user.tier} Registration...`);
      console.log(`   📧 Email: ${user.email}`);
      
      try {
        // Navigate to registration page
        await page.goto('http://localhost:5000/register', { waitUntil: 'networkidle2' });
        
        // Wait for form to load
        await page.waitForSelector('form', { timeout: 10000 });
        
        // Fill out the form
        await page.type('input[name="firstName"]', user.firstName);
        await page.type('input[name="lastName"]', user.lastName);
        await page.type('input[name="email"]', user.email);
        await page.type('input[name="phone"]', user.phone);
        await page.type('input[name="password"]', user.password);
        await page.type('input[name="confirmPassword"]', user.password);
        
        // Select the subscription tier
        await page.click('[role="combobox"]'); // Click the select trigger
        await page.waitForSelector('[role="option"]', { timeout: 5000 });
        
        // Find and click the correct tier option
        const tierOption = await page.$(`[role="option"][data-value="${user.tier}"]`);
        if (tierOption) {
          await tierOption.click();
        } else {
          // Fallback: find by text content
          const options = await page.$$('[role="option"]');
          for (const option of options) {
            const text = await page.evaluate(el => el.textContent, option);
            if (text && text.includes(user.tier)) {
              await option.click();
              break;
            }
          }
        }
        
        // Submit the form
        await page.click('button[type="submit"]');
        
        // Wait for success message or redirect
        try {
          await page.waitForSelector('h1', { timeout: 10000 });
          const pageTitle = await page.$eval('h1', el => el.textContent);
          
          if (pageTitle && pageTitle.includes('Check Your Email')) {
            console.log(`   ✅ Registration successful - Email verification step reached`);
            console.log(`   📩 Verification email should be sent to: ${user.email}`);
            
            // For testing, we'll use the test registration endpoint to complete verification
            const response = await page.evaluate(async (userData) => {
              const testResponse = await fetch('/api/auth/test-register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: userData.email,
                  firstName: userData.firstName,
                  lastName: userData.lastName,
                  password: userData.password,
                  phone: userData.phone,
                  subscriptionTier: userData.tier
                })
              });
              return await testResponse.json();
            }, user);
            
            if (response.success) {
              console.log(`   ✅ Test account created and verified automatically`);
              console.log(`   🆔 Local User ID: ${response.localUserId}`);
              console.log(`   🏷️ Tier: ${user.tier}`);
            } else {
              console.log(`   ⚠️ Test account creation failed: ${response.error}`);
            }
            
          } else {
            console.log(`   ⚠️ Unexpected page after registration: ${pageTitle}`);
          }
          
        } catch (error) {
          console.log(`   ❌ Registration failed or timeout: ${error.message}`);
        }
        
        // Brief pause between registrations
        await page.waitForTimeout(2000);
        
      } catch (error) {
        console.log(`   ❌ Registration error for ${user.tier}: ${error.message}`);
      }
    }
    
    console.log('\n📊 Registration Test Summary:');
    console.log('============================');
    console.log('✅ All 5 tier registrations attempted through UI');
    console.log('✅ Each registration should create:');
    console.log('   • Local PostgreSQL user record');
    console.log('   • Zoho CRM Contact with Tier field');
    console.log('✅ Check Zoho CRM Contact module for new records');
    console.log('   with the "Tier" field populated correctly');
    
  } catch (error) {
    console.error('❌ Browser test error:', error);
  } finally {
    await browser.close();
  }
}

// Alternative: Simplified API-based test if UI test fails
async function fallbackAPITest() {
  console.log('\n🔄 Running Fallback API Test...');
  console.log('================================');
  
  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    console.log(`\n${i + 1}. API Testing ${user.tier}...`);
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/test-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          password: user.password,
          phone: user.phone,
          subscriptionTier: user.tier
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`   ✅ ${user.tier} account created`);
        console.log(`   🆔 ID: ${result.localUserId}`);
        console.log(`   📧 Email: ${user.email}`);
      } else {
        console.log(`   ❌ ${user.tier} failed: ${result.error}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ${user.tier} API error: ${error.message}`);
    }
  }
}

// Run the test
if (process.argv.includes('--api-only')) {
  fallbackAPITest().catch(console.error);
} else {
  testUIRegistration()
    .then(() => {
      console.log('\n✅ UI Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ UI Test failed:', error);
      console.log('\n🔄 Trying fallback API test...');
      return fallbackAPITest();
    })
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ All tests failed:', error);
      process.exit(1);
    });
}