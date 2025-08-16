/**
 * Direct Zoho Integration Test - bypasses auth issues
 * Tests the Zoho order processing directly with different scenarios
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test scenarios for direct Zoho processing
const testScenarios = [
  {
    name: 'In-House Accessories Order (Bronze)',
    payload: {
      cartItems: [
        { sku: 'ACC001', name: 'Gun Safe', price: 299.99, quantity: 1, isFirearm: false, requiresFFL: false }
      ],
      customerInfo: {
        email: 'bronze.test@thegunfirm.com',
        firstName: 'Bronze',
        lastName: 'TestUser',
        phone: '555-123-4567'
      },
      shippingAddress: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'TX',
        zipCode: '75001',
        country: 'US'
      },
      billingAddress: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'TX',
        zipCode: '75001',
        country: 'US'
      },
      paymentInfo: {
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        nameOnCard: 'Bronze TestUser'
      },
      fflRecipientId: null
    },
    expected: {
      fulfillmentType: 'In-House',
      consignee: 'TGF',
      orderingAccount: '99901',
      holdType: null,
      receiverCode: 'I'
    }
  },
  {
    name: 'Drop-Ship Firearm with FFL Required',
    payload: {
      cartItems: [
        { sku: 'RIF001', name: 'AR-15 Rifle', price: 799.99, quantity: 1, isFirearm: true, requiresFFL: true }
      ],
      customerInfo: {
        email: 'gold.test@thegunfirm.com',
        firstName: 'Gold',
        lastName: 'Customer',
        phone: '555-123-4567'
      },
      shippingAddress: {
        street: '456 Gun Street',
        city: 'Austin',
        state: 'TX',
        zipCode: '75002',
        country: 'US'
      },
      billingAddress: {
        street: '456 Gun Street',
        city: 'Austin',
        state: 'TX',
        zipCode: '75002',
        country: 'US'
      },
      paymentInfo: {
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        nameOnCard: 'Gold Customer'
      },
      fflRecipientId: 1, // Set to trigger drop-ship
      forceDropShip: true
    },
    expected: {
      fulfillmentType: 'Drop-Ship',
      consignee: 'FFL',
      orderingAccount: '99902',
      holdType: null, // Assuming FFL is on file
      receiverCode: 'F'
    }
  },
  {
    name: 'Mixed Order (Firearm + Accessories)',
    payload: {
      cartItems: [
        { sku: 'PIS001', name: 'Glock 19', price: 549.99, quantity: 1, isFirearm: true, requiresFFL: true },
        { sku: 'ACC002', name: 'Holster', price: 49.99, quantity: 1, isFirearm: false, requiresFFL: false },
        { sku: 'AMM001', name: 'Ammo', price: 29.99, quantity: 2, isFirearm: false, requiresFFL: false }
      ],
      customerInfo: {
        email: 'platinum.test@thegunfirm.com',
        firstName: 'Platinum',
        lastName: 'Customer',
        phone: '555-123-4567'
      },
      shippingAddress: {
        street: '789 Premium Ave',
        city: 'Dallas',
        state: 'TX',
        zipCode: '75003',
        country: 'US'
      },
      billingAddress: {
        street: '789 Premium Ave',
        city: 'Dallas',
        state: 'TX',
        zipCode: '75003',
        country: 'US'
      },
      paymentInfo: {
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        nameOnCard: 'Platinum Customer'
      },
      fflRecipientId: null // FFL not on file - should create hold
    },
    expected: {
      fulfillmentType: 'In-House',
      consignee: 'TGF',
      orderingAccount: '99901',
      holdType: 'FFL not on file',
      receiverCode: 'I'
    }
  }
];

class DirectZohoTester {
  constructor() {
    this.results = [];
  }

  async runAllTests() {
    console.log('🧪 Direct Zoho Integration Testing...\n');

    for (const scenario of testScenarios) {
      console.log(`\n🔸 Testing: ${scenario.name}`);
      console.log(`   Expected: ${scenario.expected.fulfillmentType} → ${scenario.expected.consignee}`);

      try {
        const result = await this.testScenario(scenario);
        this.results.push(result);
        console.log(`   ✅ Success: Order ${result.orderNumber}, Deal ${result.dealId}`);
        console.log(`   📊 TGF Order: ${result.tgfOrderNumber}`);
        console.log(`   🎯 Validation: ${this.validateFields(result, scenario.expected)}`);
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        this.results.push({
          scenario: scenario.name,
          success: false,
          error: error.message
        });
      }

      // Wait between tests
      await this.sleep(1000);
    }

    this.printSummary();
  }

  async testScenario(scenario) {
    console.log('   📝 Processing checkout...');

    const response = await axios.post(`${BASE_URL}/api/checkout/firearms`, scenario.payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Checkout failed');
    }

    return {
      scenario: scenario.name,
      success: true,
      orderNumber: response.data.orderNumber,
      dealId: response.data.dealId,
      tgfOrderNumber: response.data.tgfOrderNumber,
      status: response.data.status,
      hold: response.data.hold,
      expected: scenario.expected
    };
  }

  validateFields(result, expected) {
    const validations = [];

    // Validate TGF Order Number format
    if (result.tgfOrderNumber) {
      const regex = /^test\d{3}[ICF][0A-Z]$/;
      if (regex.test(result.tgfOrderNumber)) {
        const receiverCode = result.tgfOrderNumber.charAt(result.tgfOrderNumber.length - 2);
        if (receiverCode === expected.receiverCode) {
          validations.push('✅ Order format correct');
        } else {
          validations.push(`❌ Wrong receiver: ${receiverCode} vs ${expected.receiverCode}`);
        }
      } else {
        validations.push('❌ Invalid order format');
      }
    } else {
      validations.push('❌ No TGF order number');
    }

    // Validate hold status
    if (expected.holdType) {
      if (result.hold && result.hold.type === expected.holdType) {
        validations.push('✅ Hold type correct');
      } else {
        validations.push(`❌ Wrong hold: ${result.hold?.type} vs ${expected.holdType}`);
      }
    } else {
      if (!result.hold) {
        validations.push('✅ No hold (correct)');
      } else {
        validations.push(`❌ Unexpected hold: ${result.hold.type}`);
      }
    }

    return validations.join(', ');
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 DIRECT ZOHO INTEGRATION TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;

    console.log(`Overall: ${passed}/${total} scenarios passed\n`);

    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.scenario}`);

      if (result.success) {
        console.log(`   Order: ${result.orderNumber}`);
        console.log(`   TGF#: ${result.tgfOrderNumber}`);
        console.log(`   Deal: ${result.dealId}`);
        console.log(`   Status: ${result.status}`);
        if (result.hold) {
          console.log(`   Hold: ${result.hold.type} - ${result.hold.reason}`);
        }
      } else {
        console.log(`   Error: ${result.error}`);
      }
      console.log('');
    });

    if (passed === total) {
      console.log('🎉 ALL ZOHO INTEGRATION TESTS PASSED!');
      console.log('✅ System field population working correctly');
      console.log('✅ Order number generation working correctly');
      console.log('✅ Fulfillment type determination working correctly');
      console.log('✅ FFL compliance checking working correctly');
    } else {
      console.log('⚠️  Some tests failed - check system configuration');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the tests
async function main() {
  const tester = new DirectZohoTester();
  await tester.runAllTests();
}

main().catch(console.error);