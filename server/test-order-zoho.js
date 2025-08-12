// Test script to verify order-to-Zoho integration
import { OrderZohoIntegration } from './order-zoho-integration';

async function testOrderToZoho() {
  console.log('🔍 Testing Order-to-Zoho Integration...\n');

  try {
    const integration = new OrderZohoIntegration();

    // Test with one of our known test users
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

    console.log('📧 Creating deal for:', testOrderData.customerEmail);
    console.log('🛒 Order total:', testOrderData.totalAmount);
    console.log('📦 Items:', testOrderData.orderItems.length);

    const result = await integration.processOrderToDeal(testOrderData);

    if (result.success) {
      console.log('\n✅ SUCCESS!');
      console.log('🆔 Deal ID:', result.dealId);
      console.log('👤 Contact ID:', result.contactId);
      console.log('\n🔍 Check your Zoho CRM → Deals for the new record');
    } else {
      console.log('\n❌ FAILED!');
      console.log('🚨 Error:', result.error);
    }

  } catch (error) {
    console.error('\n💥 Integration test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testOrderToZoho().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});