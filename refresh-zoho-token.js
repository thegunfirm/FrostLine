#!/usr/bin/env node

import axios from 'axios';

async function refreshZohoToken() {
  console.log('🔄 Attempting to refresh Zoho OAuth token...');
  
  try {
    const response = await axios.post('http://localhost:5000/api/zoho/refresh-token');
    
    if (response.data.success) {
      console.log('✅ Zoho token refreshed successfully');
      console.log(`🔑 New token expires in: ${response.data.expires_in} seconds`);
      return true;
    } else {
      console.log('❌ Token refresh failed:', response.data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Error refreshing token:', error.message);
    return false;
  }
}

refreshZohoToken();