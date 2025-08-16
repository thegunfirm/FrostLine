/**
 * Simple Product Field Mapping Validation Test
 * Tests the product field mapping functionality without full order integration
 */

const { zohoOrderFieldsService } = require('./server/services/zoho-order-fields-service.ts');

async function validateProductMapping() {
  console.log('🧪 Testing Product Field Mapping Validation...\n');

  // Test Case 1: Single Product Mapping
  console.log('📦 Test Case 1: Single Product Mapping');
  const singleProduct = {
    productName: 'Smith & Wesson M&P Shield Plus 9mm',
    sku: 'SW-MP-SHIELD-PLUS-9MM', 
    rsrStockNumber: 'RSR123456',
    quantity: 1,
    unitPrice: 549.99,
    totalPrice: 549.99,
    fflRequired: true,
    dropShipEligible: true,
    inHouseOnly: false,
    category: 'Handguns',
    manufacturer: 'Smith & Wesson',
    description: 'Compact striker-fired pistol perfect for concealed carry',
    specifications: 'Barrel: 3.1", Capacity: 10+1/13+1, Weight: 20.2 oz',
    images: ['https://rsrgroup.com/images/SW-MP-SHIELD-PLUS-9MM.jpg']
  };

  const singleProductFields = zohoOrderFieldsService.mapProductToZohoDeal(singleProduct, 549.99);
  const singleValidation = zohoOrderFieldsService.validateProductFields(singleProductFields);

  console.log('✅ Single Product Mapped Fields:');
  console.log(JSON.stringify(singleProductFields, null, 2));
  console.log(`\n🔍 Validation: ${singleValidation.valid ? 'PASSED' : 'FAILED'}`);
  if (!singleValidation.valid) {
    console.log('❌ Errors:', singleValidation.errors);
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test Case 2: Multiple Products (Mixed Order)
  console.log('📦 Test Case 2: Multiple Products (Mixed Order)');
  const multipleProducts = [
    {
      productName: 'Glock 19 Gen 5',
      sku: 'GLOCK-19-GEN5',
      quantity: 1,
      unitPrice: 599.99,
      fflRequired: true,
      category: 'Handguns',
      manufacturer: 'Glock'
    },
    {
      productName: 'Magpul PMAG 30',
      sku: 'MAGPUL-PMAG-30',
      quantity: 5,
      unitPrice: 15.99,
      fflRequired: false,
      category: 'Magazines',
      manufacturer: 'Magpul'
    },
    {
      productName: 'Federal 9mm HST',
      sku: 'FED-9MM-HST',
      quantity: 10,
      unitPrice: 32.99,
      fflRequired: false,
      category: 'Ammunition',
      manufacturer: 'Federal'
    }
  ];

  const totalOrderValue = multipleProducts.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0);
  const multiProductFields = zohoOrderFieldsService.mapMultipleProductsToZohoDeal(multipleProducts, totalOrderValue);
  const multiValidation = zohoOrderFieldsService.validateProductFields(multiProductFields);

  console.log('✅ Multiple Products Mapped Fields:');
  console.log(JSON.stringify(multiProductFields, null, 2));
  console.log(`\n🔍 Validation: ${multiValidation.valid ? 'PASSED' : 'FAILED'}`);
  if (!multiValidation.valid) {
    console.log('❌ Errors:', multiValidation.errors);
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test Case 3: Edge Cases
  console.log('📦 Test Case 3: Edge Cases & Validation');
  
  // Test with minimal data
  const minimalProduct = {
    productName: 'Minimal Product',
    unitPrice: 10.00
  };

  const minimalFields = zohoOrderFieldsService.mapProductToZohoDeal(minimalProduct, 10.00);
  const minimalValidation = zohoOrderFieldsService.validateProductFields(minimalFields);

  console.log('🔹 Minimal Product Fields:');
  console.log(JSON.stringify(minimalFields, null, 2));
  console.log(`   Validation: ${minimalValidation.valid ? 'PASSED' : 'FAILED'}`);

  // Test with invalid data
  const invalidProduct = {
    productName: '', // Empty name
    unitPrice: -5.00, // Negative price
    quantity: 0 // Zero quantity
  };

  const invalidFields = zohoOrderFieldsService.mapProductToZohoDeal(invalidProduct, -5.00);
  const invalidValidation = zohoOrderFieldsService.validateProductFields(invalidFields);

  console.log('\n🔹 Invalid Product Fields:');
  console.log(JSON.stringify(invalidFields, null, 2));
  console.log(`   Validation: ${invalidValidation.valid ? 'PASSED' : 'FAILED'}`);
  if (!invalidValidation.valid) {
    console.log('   Expected Errors:', invalidValidation.errors);
  }

  console.log('\n🎯 Product Field Mapping Validation Complete!');
  
  const allTestsPassed = singleValidation.valid && multiValidation.valid && minimalValidation.valid && !invalidValidation.valid;
  console.log(`\n${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  return allTestsPassed;
}

// Export for use in other scripts
module.exports = { validateProductMapping };

// Run if called directly
if (require.main === module) {
  validateProductMapping()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    });
}