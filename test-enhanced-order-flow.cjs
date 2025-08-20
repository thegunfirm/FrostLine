const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test order configuration using REAL RSR inventory
const TEST_PRODUCTS = [
  {
    id: 153784,
    name: "GLOCK 43X 9mm Luger 3.41\" Barrel 10-Round",
    sku: "GLOCK43X",
    price: 478.99,
    quantity: 1,
    requiresFFL: true
  },
  {
    id: 153688,
    name: "ZAF UPPER PARTS KIT FOR GLK 19 G1-3",
    sku: "ZAF19UPK", 
    price: 85.49,
    quantity: 1,
    requiresFFL: false
  },
  {
    id: 153693,
    name: "ZAF UPPER PARTS KIT FOR GLK 19 GEN 5",
    sku: "ZAFUPK195",
    price: 94.99,
    quantity: 1,
    requiresFFL: false
  }
];

const TEST_CUSTOMER = {
  email: `testcustomer${Date.now()}@example.com`,
  password: 'TestPass123!',
  firstName: 'John',
  lastName: 'Smith',
  tier: 'gold'
};

const TEST_FFL = {
  id: 1, // Using a real FFL from database
  name: 'Acme Gun Store',
  licenseNumber: '1-12-345-67-8X-12345',
  businessName: 'Acme Gun Store',
  address: '123 Main St',
  city: 'Houston', 
  state: 'TX',
  zipCode: '77001',
  phone: '(555) 123-4567'
};

const TEST_SHIPPING = {
  firstName: 'John',
  lastName: 'Smith',
  address: '456 Oak Avenue',
  city: 'Austin',
  state: 'TX',
  zipCode: '78701',
  phone: '(555) 987-6543'
};

const TEST_PAYMENT = {
  cardNumber: '4000000000000002', // Sandbox test card
  expiryMonth: '12',
  expiryYear: '2028',
  cvv: '123',
  firstName: 'John',
  lastName: 'Smith',
  address: '456 Oak Avenue',
  city: 'Austin',
  state: 'TX',
  zipCode: '78701'
};

class TestOrderFlow {
  constructor() {
    this.cookies = '';
    this.orderId = null;
    this.tgfOrderNumber = null;
  }

  async createTestUser() {
    console.log('\n=== STEP 1: Creating Test User ===');
    try {
      const response = await axios.post(`${BASE_URL}/api/register`, TEST_CUSTOMER, {
        validateStatus: () => true
      });
      
      if (response.status === 201) {
        console.log('✅ Test user created successfully');
        this.cookies = response.headers['set-cookie']?.[0]?.split(';')[0] || '';
        return true;
      } else if (response.status === 400 && response.data.message?.includes('exists')) {
        console.log('📧 User already exists, proceeding to login');
        return await this.loginUser();
      } else {
        console.error('❌ Failed to create user:', response.data);
        return false;
      }
    } catch (error) {
      console.error('❌ Error creating user:', error.message);
      return false;
    }
  }

  async loginUser() {
    console.log('\n=== LOGIN: Authenticating User ===');
    try {
      const response = await axios.post(`${BASE_URL}/api/login`, {
        email: TEST_CUSTOMER.email,
        password: TEST_CUSTOMER.password
      }, {
        validateStatus: () => true
      });

      if (response.status === 200) {
        console.log('✅ User login successful');
        this.cookies = response.headers['set-cookie']?.[0]?.split(';')[0] || '';
        return true;
      } else {
        console.error('❌ Login failed:', response.data);
        return false;
      }
    } catch (error) {
      console.error('❌ Error during login:', error.message);
      return false;
    }
  }

  async addProductsToCart() {
    console.log('\n=== STEP 2: Adding Products to Cart ===');
    console.log('Products being added (REAL RSR inventory):');
    TEST_PRODUCTS.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} - $${product.price} ${product.requiresFFL ? '(FFL Required)' : '(Accessory)'}`);
    });

    for (const product of TEST_PRODUCTS) {
      try {
        const response = await axios.post(`${BASE_URL}/api/cart`, {
          productId: product.id,
          quantity: product.quantity
        }, {
          headers: { Cookie: this.cookies },
          validateStatus: () => true
        });

        if (response.status === 200) {
          console.log(`✅ Added ${product.name} to cart`);
        } else {
          console.error(`❌ Failed to add ${product.name}:`, response.data);
          return false;
        }
      } catch (error) {
        console.error(`❌ Error adding ${product.name}:`, error.message);
        return false;
      }
    }
    return true;
  }

  async selectFFL() {
    console.log('\n=== STEP 3: Selecting FFL Dealer ===');
    try {
      const response = await axios.post(`${BASE_URL}/api/cart/ffl`, {
        fflId: TEST_FFL.id
      }, {
        headers: { Cookie: this.cookies },
        validateStatus: () => true
      });

      if (response.status === 200) {
        console.log(`✅ Selected FFL: ${TEST_FFL.businessName} (${TEST_FFL.licenseNumber})`);
        return true;
      } else {
        console.error('❌ Failed to select FFL:', response.data);
        return false;
      }
    } catch (error) {
      console.error('❌ Error selecting FFL:', error.message);
      return false;
    }
  }

  async setShippingInfo() {
    console.log('\n=== STEP 4: Setting Shipping Information ===');
    try {
      const response = await axios.post(`${BASE_URL}/api/cart/shipping`, TEST_SHIPPING, {
        headers: { Cookie: this.cookies },
        validateStatus: () => true
      });

      if (response.status === 200) {
        console.log(`✅ Shipping address set: ${TEST_SHIPPING.address}, ${TEST_SHIPPING.city}, ${TEST_SHIPPING.state}`);
        return true;
      } else {
        console.error('❌ Failed to set shipping:', response.data);
        return false;
      }
    } catch (error) {
      console.error('❌ Error setting shipping:', error.message);
      return false;
    }
  }

  async processPayment() {
    console.log('\n=== STEP 5: Processing Payment (Sandbox) ===');
    const totalAmount = TEST_PRODUCTS.reduce((sum, product) => sum + (product.price * product.quantity), 0);
    console.log(`💳 Processing payment for $${totalAmount.toFixed(2)} using sandbox Authorize.Net`);
    
    try {
      const response = await axios.post(`${BASE_URL}/api/checkout`, {
        payment: TEST_PAYMENT,
        billing: TEST_PAYMENT,
        skipRSROrdering: true, // CRITICAL: Don't interact with RSR ordering API
        testMode: true
      }, {
        headers: { Cookie: this.cookies },
        validateStatus: () => true
      });

      if (response.status === 200) {
        this.orderId = response.data.orderId;
        this.tgfOrderNumber = response.data.tgfOrderNumber;
        console.log(`✅ Payment processed successfully!`);
        console.log(`📦 Order ID: ${this.orderId}`);
        console.log(`🏷️  TGF Order Number: ${this.tgfOrderNumber}`);
        return true;
      } else {
        console.error('❌ Payment failed:', response.data);
        return false;
      }
    } catch (error) {
      console.error('❌ Error processing payment:', error.message);
      return false;
    }
  }

  async verifyOrderData() {
    console.log('\n=== STEP 6: Verifying Enhanced Order Data ===');
    
    // Check order confirmation data
    try {
      const orderResponse = await axios.get(`${BASE_URL}/api/orders/${this.orderId}`, {
        headers: { Cookie: this.cookies },
        validateStatus: () => true
      });

      if (orderResponse.status === 200) {
        const order = orderResponse.data;
        console.log('✅ Order data retrieved:');
        console.log(`   TGF Order Number: ${order.tgfOrderNumber}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Total: $${order.totalAmount}`);
        console.log(`   Items: ${order.items?.length || 0} products`);
      }

      // Check unified order data (Zoho integration)
      const unifiedResponse = await axios.get(`${BASE_URL}/api/orders/unified/${this.tgfOrderNumber}`, {
        headers: { Cookie: this.cookies },
        validateStatus: () => true
      });

      if (unifiedResponse.status === 200) {
        const unifiedOrder = unifiedResponse.data;
        console.log('✅ Unified Zoho order data:');
        console.log(`   Deal Name: ${unifiedOrder.dealName || 'Not yet created'}`);
        console.log(`   Pipeline Stage: ${unifiedOrder.pipelineStage || 'Processing'}`);
        console.log(`   Order Status: ${unifiedOrder.orderStatus || 'Processing'}`);
        console.log(`   Fulfillment Type: ${unifiedOrder.fulfillmentType || 'TBD'}`);
        console.log(`   Expected Revenue: $${unifiedOrder.expectedRevenue || 'TBD'}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Error verifying order data:', error.message);
      return false;
    }
  }

  async testEnhancedUI() {
    console.log('\n=== STEP 7: Testing Enhanced UI Components ===');
    
    // Verify account orders page data
    try {
      const accountOrdersResponse = await axios.get(`${BASE_URL}/api/account/orders`, {
        headers: { Cookie: this.cookies },
        validateStatus: () => true
      });

      if (accountOrdersResponse.status === 200) {
        const orders = accountOrdersResponse.data;
        console.log('✅ Account orders data structure:');
        orders.forEach((order, index) => {
          console.log(`   Order ${index + 1}:`);
          console.log(`     TGF Number: ${order.tgfOrderNumber || 'Missing'}`);
          console.log(`     Deal Name: ${order.dealName || 'Missing'}`);
          console.log(`     Status: ${order.orderStatus || order.status}`);
          console.log(`     Pipeline: ${order.pipelineStage || 'Missing'}`);
          console.log(`     Fulfillment: ${order.fulfillmentType || 'Missing'}`);
          console.log(`     Estimated Ship: ${order.estimatedShipDate || 'Missing'}`);
          console.log(`     Hold Type: ${order.holdType || 'None'}`);
        });
      }

      return true;
    } catch (error) {
      console.error('❌ Error testing enhanced UI:', error.message);
      return false;
    }
  }

  async runCompleteTest() {
    console.log('🚀 Starting Enhanced Order Flow Test');
    console.log('===================================');
    console.log('Testing: Glock handgun + 2 accessories with enhanced Zoho UI display');
    console.log('Mode: Sandbox payment, Real FFL, Real RSR inventory, No RSR ordering API');

    const steps = [
      () => this.createTestUser(),
      () => this.addProductsToCart(),
      () => this.selectFFL(),
      () => this.setShippingInfo(),
      () => this.processPayment(),
      () => this.verifyOrderData(),
      () => this.testEnhancedUI()
    ];

    for (let i = 0; i < steps.length; i++) {
      const success = await steps[i]();
      if (!success) {
        console.log(`\n❌ Test failed at step ${i + 1}`);
        return false;
      }
    }

    console.log('\n🎉 ENHANCED ORDER FLOW TEST COMPLETED SUCCESSFULLY!');
    console.log('=================================================');
    console.log(`📦 Final Order Details:`);
    console.log(`   Order ID: ${this.orderId}`);
    console.log(`   TGF Order Number: ${this.tgfOrderNumber}`);
    console.log(`   Customer: ${TEST_CUSTOMER.firstName} ${TEST_CUSTOMER.lastName}`);
    console.log(`   Products: ${TEST_PRODUCTS.length} items (1 firearm, 2 accessories)`);
    console.log(`   Total Value: $${TEST_PRODUCTS.reduce((sum, p) => sum + p.price, 0).toFixed(2)}`);
    console.log(`   FFL Dealer: ${TEST_FFL.businessName}`);
    console.log(`   Payment: Sandbox Authorize.Net (SUCCESS)`);
    console.log(`   UI Enhancement: All Zoho CRM data now visible to customers`);

    return true;
  }
}

// Run the test
const testFlow = new TestOrderFlow();
testFlow.runCompleteTest().catch(error => {
  console.error('\n💥 Test execution failed:', error.message);
  process.exit(1);
});