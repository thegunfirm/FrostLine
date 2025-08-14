#!/usr/bin/env node

/**
 * Email Verification Simulation Script
 * 
 * This script simulates the email verification process by directly calling
 * the verification endpoint with a token, bypassing the need to check email.
 * 
 * Usage: node simulate-email-verification.js <email> [tier]
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function simulateEmailVerification(email, tier = 'Bronze') {
  console.log(`\n🧪 SIMULATING EMAIL VERIFICATION FOR: ${email}`);
  console.log(`📧 Tier: ${tier}`);
  console.log('=' .repeat(60));

  try {
    // Step 1: Register user (this creates pending verification token)
    console.log('\n1️⃣ Registering user and creating verification token...');
    
    const registrationData = {
      email: email,
      password: 'TestPassword123!',
      firstName: email.split('@')[0].split('.')[0],
      lastName: email.split('@')[0].split('.')[1] || 'Test',
      subscriptionTier: tier
    };

    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, registrationData);
    console.log('✅ Registration successful:', registerResponse.data.message);
    
    if (registerResponse.data.verificationToken) {
      console.log('🎫 Verification token created:', registerResponse.data.verificationToken);
      
      // Step 2: Simulate clicking the email verification link
      console.log('\n2️⃣ Simulating email link click (GET request)...');
      
      const verificationUrl = `${BASE_URL}/verify-email?token=${registerResponse.data.verificationToken}`;
      console.log('🔗 Verification URL:', verificationUrl);
      
      // Use axios with maxRedirects to follow the redirect
      const verifyResponse = await axios.get(verificationUrl, {
        maxRedirects: 0,
        validateStatus: function (status) {
          return status >= 200 && status < 400; // Accept redirects
        }
      });
      
      console.log('✅ Email verification completed!');
      console.log('📍 Redirect location:', verifyResponse.headers.location);
      
      // Step 3: Check user status
      console.log('\n3️⃣ Checking user verification status...');
      
      const testLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: email,
        password: 'TestPassword123!'
      });
      
      if (testLoginResponse.data.success) {
        console.log('✅ User can now login successfully!');
        console.log('👤 User details:', {
          email: testLoginResponse.data.user.email,
          emailVerified: testLoginResponse.data.user.emailVerified,
          tier: testLoginResponse.data.user.subscriptionTier
        });
      }
      
    } else {
      console.log('⚠️ No verification token returned - check registration response');
    }
    
    console.log('\n🎉 EMAIL VERIFICATION SIMULATION COMPLETED!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n❌ SIMULATION FAILED:', error.response?.data || error.message);
    
    if (error.response?.status === 409) {
      console.log('\n💡 User already exists. Try with a different email or login directly.');
    }
  }
}

// Command line usage
const email = process.argv[2];
const tier = process.argv[3] || 'Bronze';

if (!email) {
  console.log('\n📋 EMAIL VERIFICATION SIMULATION SCRIPT');
  console.log('Usage: node simulate-email-verification.js <email> [tier]');
  console.log('\nExample:');
  console.log('  node simulate-email-verification.js test.user@thegunfirm.com Bronze');
  console.log('  node simulate-email-verification.js gold.member@thegunfirm.com "Gold Monthly"');
  console.log('\nAvailable Tiers:');
  console.log('  - Bronze');
  console.log('  - Gold Monthly');
  console.log('  - Gold Annually');
  console.log('  - Platinum Monthly'); 
  console.log('  - Platinum Founder');
  process.exit(1);
}

if (!email.includes('@')) {
  console.error('❌ Invalid email format. Please provide a valid email address.');
  process.exit(1);
}

// Run the simulation
simulateEmailVerification(email, tier).catch(console.error);