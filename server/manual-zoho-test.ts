import { ZohoService } from './zoho-service';
import { OrderZohoIntegration } from './order-zoho-integration';

async function testZohoIntegration() {
  console.log('🧪 Manual Zoho Integration Test\n');

  try {
    console.log('1️⃣ Initializing Zoho service...');
    const zohoService = new ZohoService({
      clientId: process.env.ZOHO_CLIENT_ID!,
      clientSecret: process.env.ZOHO_CLIENT_SECRET!,
      redirectUri: process.env.ZOHO_REDIRECT_URI!,
      accountsHost: process.env.ZOHO_ACCOUNTS_HOST!,
      apiHost: process.env.ZOHO_CRM_BASE!,
      accessToken: process.env.ZOHO_ACCESS_TOKEN,
      refreshToken: process.env.ZOHO_REFRESH_TOKEN
    });

    console.log('2️⃣ Testing contact lookup for bronze.test@example.com...');
    const existingContact = await zohoService.findContactByEmail('bronze.test@example.com');
    if (existingContact) {
      console.log('✅ Found existing contact:', existingContact.id);
      console.log('   Name:', `${existingContact.First_Name} ${existingContact.Last_Name}`);
    } else {
      console.log('⚠️  Contact not found - will create new one');
    }

    console.log('3️⃣ Testing Order-to-Deal integration...');
    const integration = new OrderZohoIntegration();

    const testOrderData = {
      orderNumber: `TEST-${Date.now()}`,
      totalAmount: 599.98,
      customerEmail: 'bronze.test@example.com',
      customerName: 'Bronze Test User',
      membershipTier: 'Bronze',
      orderItems: [
        {
          productName: 'Glock 19 Gen5',
          sku: 'GLOCK19GEN5',
          quantity: 1,
          unitPrice: 549.99,
          totalPrice: 549.99,
          fflRequired: true
        },
        {
          productName: 'Federal 9mm Ammunition',
          sku: 'FED9MM',
          quantity: 2,
          unitPrice: 24.99,
          totalPrice: 49.98,
          fflRequired: false
        }
      ],
      fflDealerName: 'Test FFL Dealer',
      orderStatus: 'pending'
    };

    console.log('4️⃣ Creating deal for order:', testOrderData.orderNumber);
    const result = await integration.processOrderToDeal(testOrderData);

    if (result.success) {
      console.log('\n🎉 SUCCESS! Deal created in Zoho CRM');
      console.log('🆔 Deal ID:', result.dealId);
      console.log('👤 Contact ID:', result.contactId);
      console.log('\n📋 Next steps:');
      console.log('   1. Check Zoho CRM → Deals module');
      console.log('   2. Look for deal:', testOrderData.orderNumber);
      console.log('   3. Verify contact link and deal details');
    } else {
      console.log('\n❌ FAILED to create deal');
      console.error('Error:', result.error);
    }

    console.log('\n5️⃣ Checking deals for bronze test user...');
    if (existingContact) {
      const deals = await zohoService.getContactDeals(existingContact.id);
      console.log(`📊 Found ${deals.length} deals for contact`);
      deals.forEach((deal, index) => {
        console.log(`   ${index + 1}. ${deal.Deal_Name} - $${deal.Amount} (${deal.Stage})`);
      });
    }

  } catch (error: any) {
    console.error('\n💥 Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testZohoIntegration().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('💥 Test execution failed:', error);
});