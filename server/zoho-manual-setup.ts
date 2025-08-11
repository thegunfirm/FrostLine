import { createZohoService } from './zoho-service';

/**
 * Manual Zoho Setup Script
 * 
 * Since OAuth is failing, this provides manual token setup.
 * Run this script when you have tokens from Zoho Developer Console.
 */

export async function manualZohoSetup(accessToken: string, refreshToken?: string) {
  console.log('🔧 Setting up Zoho manually with provided tokens...');
  
  try {
    const zohoService = await createZohoService();
    if (!zohoService) {
      throw new Error('Failed to create Zoho service');
    }

    // Manually set the tokens
    zohoService.config.accessToken = accessToken;
    if (refreshToken) {
      zohoService.config.refreshToken = refreshToken;
    }

    console.log('✅ Tokens set successfully');
    
    // Test the connection
    console.log('🧪 Testing Zoho connection...');
    const testResult = await zohoService.getConnectionStatus();
    console.log('📊 Connection test result:', testResult);
    
    // Try to make a basic API call
    console.log('🔍 Testing basic API call...');
    const modules = await zohoService.listModules();
    console.log('📋 Available modules:', modules?.slice(0, 3).map(m => m.module_name));
    
    console.log('🎉 Manual Zoho setup completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Manual setup failed:', error);
    return false;
  }
}

// Helper to get tokens from Zoho Developer Console
export function getTokenInstructions() {
  return `
📋 How to get Zoho tokens manually:

1. Go to https://api-console.zoho.com/
2. Select your application
3. Click "Self Client" tab
4. Generate tokens with these scopes:
   - ZohoCRM.modules.ALL
   - ZohoCRM.settings.ALL
   - ZohoCRM.users.ALL
   - ZohoCRM.org.READ

5. Copy the access_token and refresh_token
6. Use them with the manual setup function

⚠️  Tokens expire in 1 hour, but refresh tokens can generate new ones.
  `;
}