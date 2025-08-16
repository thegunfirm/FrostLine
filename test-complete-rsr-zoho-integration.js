#!/usr/bin/env node

/**
 * Complete RSR + Zoho Integration Test
 * 
 * This script creates ACTUAL deals in Zoho CRM using the existing integration services.
 * It imports the TypeScript services directly and creates real Zoho deals.
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';

async function createActualZohoDeals() {
  console.log('\n🎯 CREATING ACTUAL ZOHO DEALS');
  console.log('=============================');
  console.log('This will create real deals in your Zoho CRM\n');

  // Create a temporary TypeScript file that uses our integration services
  const tempScript = `
import 'dotenv/config';
import { ZohoService } from './server/zoho-service';

const testDeals = [
  {
    dealName: 'TGF Order Bronze-Test-001',
    contactEmail: 'bronze.test@thegunfirm.com',
    contactFirstName: 'Bronze',
    contactLastName: 'Test Customer',
    amount: 619.99,
    stage: 'Proposal/Price Quote',
    customFields: {
      'TGF_Order_Number': 'Bronze-Test-001',
      'Fulfillment_Type': 'Drop-Ship',
      'Flow': 'WD › FFL',
      'Order_Status': 'Submitted',
      'Consignee': 'FFL Dealer',
      'Deal_Fulfillment_Summary': 'Drop-Ship • 1 item • Bronze',
      'Ordering_Account': '99902',
      'Hold_Type': 'Firearm Hold',
      'APP_Status': 'Test Order',
      'Carrier': '',
      'Tracking_Number': '',
      'Estimated_Ship_Date': '',
      'Submitted': new Date().toISOString(),
      'APP_Confirmed': '',
      'Last_Distributor_Update': ''
    }
  },
  {
    dealName: 'TGF Order Gold-Test-001',
    contactEmail: 'gold.test@thegunfirm.com',
    contactFirstName: 'Gold',
    contactLastName: 'Test Customer',
    amount: 2227.75,
    stage: 'Proposal/Price Quote',
    customFields: {
      'TGF_Order_Number': 'Gold-Test-001',
      'Fulfillment_Type': 'In-House',
      'Flow': 'TGF › FFL',
      'Order_Status': 'Submitted',
      'Consignee': 'FFL Dealer',
      'Deal_Fulfillment_Summary': 'In-House • 1 item • Gold Monthly',
      'Ordering_Account': '99901',
      'Hold_Type': 'Firearm Hold',
      'APP_Status': 'Test Order',
      'Carrier': '',
      'Tracking_Number': '',
      'Estimated_Ship_Date': '',
      'Submitted': new Date().toISOString(),
      'APP_Confirmed': '',
      'Last_Distributor_Update': ''
    }
  },
  {
    dealName: 'TGF Order Platinum-Test-001',
    contactEmail: 'platinum.test@thegunfirm.com',
    contactFirstName: 'Platinum',
    contactLastName: 'Test Customer',
    amount: 42.62,
    stage: 'Proposal/Price Quote',
    customFields: {
      'TGF_Order_Number': 'Platinum-Test-001',
      'Fulfillment_Type': 'Direct',
      'Flow': 'WD › Customer',
      'Order_Status': 'Submitted',
      'Consignee': 'Customer',
      'Deal_Fulfillment_Summary': 'Direct • 1 item • Platinum Monthly',
      'Ordering_Account': '99901',
      'Hold_Type': '',
      'APP_Status': 'Test Order',
      'Carrier': '',
      'Tracking_Number': '',
      'Estimated_Ship_Date': '',
      'Submitted': new Date().toISOString(),
      'APP_Confirmed': '',
      'Last_Distributor_Update': ''
    }
  }
];

async function createDealsInZoho() {
  console.log('🔧 Initializing Zoho service...');
  
  const zohoService = new ZohoService({
    clientId: process.env.ZOHO_CLIENT_ID!,
    clientSecret: process.env.ZOHO_CLIENT_SECRET!,
    redirectUri: process.env.ZOHO_REDIRECT_URI!,
    accountsHost: process.env.ZOHO_ACCOUNTS_HOST || 'https://accounts.zoho.com',
    apiHost: process.env.ZOHO_CRM_BASE || 'https://www.zohoapis.com',
    accessToken: process.env.ZOHO_ACCESS_TOKEN,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN
  });

  const results = [];

  for (let i = 0; i < testDeals.length; i++) {
    const deal = testDeals[i];
    console.log(\`\\n📦 Creating Deal \${i + 1}/3: \${deal.dealName}\`);
    console.log(\`   Contact: \${deal.contactFirstName} \${deal.contactLastName}\`);
    console.log(\`   Email: \${deal.contactEmail}\`);
    console.log(\`   Amount: $\${deal.amount}\`);

    try {
      // Find or create contact
      console.log(\`   🔍 Finding/creating contact...\`);
      let contact = await zohoService.findContactByEmail(deal.contactEmail);
      
      if (!contact) {
        console.log(\`   ➕ Creating new contact...\`);
        contact = await zohoService.createContact({
          First_Name: deal.contactFirstName,
          Last_Name: deal.contactLastName,
          Email: deal.contactEmail
        });
        console.log(\`   ✅ Contact created: \${contact.id}\`);
      } else {
        console.log(\`   ✅ Contact found: \${contact.id}\`);
      }

      // Create deal
      console.log(\`   💼 Creating deal...\`);
      const dealData = {
        Deal_Name: deal.dealName,
        Amount: deal.amount,
        Stage: deal.stage,
        Contact_Name: contact.id,
        ...deal.customFields
      };

      const dealResult = await zohoService.createDeal(dealData);
      
      if (dealResult && dealResult.id) {
        console.log(\`   ✅ Deal created successfully!\`);
        console.log(\`   🆔 Deal ID: \${dealResult.id}\`);
        console.log(\`   📊 RSR Fields: \${Object.keys(deal.customFields).length} fields mapped\`);
        
        results.push({
          dealName: deal.dealName,
          dealId: dealResult.id,
          contactId: contact.id,
          success: true
        });
      } else {
        throw new Error('Deal creation returned no ID');
      }

    } catch (error) {
      console.log(\`   ❌ Error: \${error.message}\`);
      results.push({
        dealName: deal.dealName,
        success: false,
        error: error.message
      });
    }

    // Wait between requests
    if (i < testDeals.length - 1) {
      console.log(\`   ⏳ Waiting 3 seconds before next deal...\`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\\n📊 ZOHO DEAL CREATION RESULTS');
  console.log('==============================');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(\`✅ Successfully Created: \${successful.length} deals\`);
  console.log(\`❌ Failed: \${failed.length} deals\`);

  if (successful.length > 0) {
    console.log('\\n🎉 DEALS CREATED IN ZOHO CRM:');
    successful.forEach(result => {
      console.log(\`   • \${result.dealName} → Deal ID: \${result.dealId}\`);
    });

    console.log('\\n🎯 CHECK YOUR ZOHO CRM NOW!');
    console.log('Go to Zoho CRM → Deals module');
    console.log('Look for deals with names starting with "TGF Order"');
    console.log('All RSR integration fields should be populated');
  }

  if (failed.length > 0) {
    console.log('\\n⚠️  FAILED DEALS:');
    failed.forEach(result => {
      console.log(\`   • \${result.dealName}: \${result.error}\`);
    });
  }

  return {
    total: testDeals.length,
    successful: successful.length,
    failed: failed.length,
    results
  };
}

createDealsInZoho().then((summary) => {
  if (summary.successful > 0) {
    console.log('\\n🏆 SUCCESS! Deals created in Zoho CRM');
    console.log('The RSR + Zoho integration is working live!');
  } else {
    console.log('\\n⚠️  No deals were created - check Zoho API configuration');
  }
}).catch(console.error);
`;

  // Write the temporary script
  const scriptPath = './temp-zoho-live-test.ts';
  writeFileSync(scriptPath, tempScript);

  try {
    console.log('🚀 Executing live Zoho deal creation...\n');
    
    // Run the TypeScript script
    execSync(`npx tsx ${scriptPath}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });

  } catch (error) {
    console.error('💥 Error executing live test:', error.message);
  } finally {
    // Clean up
    try {
      unlinkSync(scriptPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

createActualZohoDeals();