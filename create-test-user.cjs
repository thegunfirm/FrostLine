#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function createTestUser() {
  console.log('👤 CREATING TEST USER');
  console.log('====================');
  
  try {
    // Create a new test user
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      email: 'test.quick@example.com',
      password: 'testpass123',
      firstName: 'Quick',
      lastName: 'Test',
      subscriptionTier: 'Bronze'
    });

    console.log('✅ User Registration Response:', registerResponse.data);
    
    // Login with the new user
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'test.quick@example.com',
      password: 'testpass123'
    }, {
      withCredentials: true
    });

    console.log('✅ Login Response:', loginResponse.data);
    const sessionCookie = loginResponse.headers['set-cookie']?.[0]?.split(';')[0];
    
    // Get user ID from response
    const userId = loginResponse.data.id;
    console.log('👤 User ID:', userId);
    
    return { userId, sessionCookie };

  } catch (error) {
    console.error('❌ Test User Creation Failed:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return null;
  }
}

createTestUser();