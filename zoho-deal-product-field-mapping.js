#!/usr/bin/env node

/**
 * Zoho Deal Product Field Mapping Discovery
 * This script discovers available fields in Zoho Deal module for product information mapping
 */

import fs from 'fs';
import path from 'path';

// Import our Zoho service
async function discoverZohoDealFields() {
  try {
    // Dynamic import for ES modules
    const { ZohoService } = await import('./server/zoho-service.ts');
    const zohoService = new ZohoService();

    console.log('🔍 Discovering Zoho Deal module fields for product mapping...\n');

    // Get Deal module field metadata
    const dealFields = await zohoService.getModuleFields('Deals');
    
    console.log('📋 Available Deal Module Fields:\n');
    
    // Filter and categorize fields that could be used for product information
    const productRelevantFields = [];
    const customFields = [];
    const standardFields = [];

    dealFields.forEach(field => {
      const fieldInfo = {
        apiName: field.api_name,
        displayLabel: field.display_label,
        dataType: field.data_type,
        maxLength: field.length,
        mandatory: field.system_mandatory || field.web_tab_mandatory,
        customField: field.custom_field,
        readOnly: field.read_only
      };

      if (field.custom_field) {
        customFields.push(fieldInfo);
      } else {
        standardFields.push(fieldInfo);
      }

      // Check if field could be used for product information
      const productKeywords = ['product', 'item', 'description', 'detail', 'spec', 'model', 'brand', 'category', 'sku', 'part'];
      const isProductRelevant = productKeywords.some(keyword => 
        field.api_name.toLowerCase().includes(keyword) || 
        field.display_label.toLowerCase().includes(keyword)
      );
      
      if (isProductRelevant || field.data_type === 'textarea' || field.data_type === 'text') {
        productRelevantFields.push(fieldInfo);
      }
    });

    console.log('🏷️  Standard Fields Available for Product Data:');
    standardFields.filter(f => !f.readOnly).forEach(field => {
      console.log(`   • ${field.displayLabel} (${field.apiName}) - ${field.dataType}${field.maxLength ? ` [${field.maxLength}]` : ''}`);
    });

    console.log('\n🔧 Custom Fields Available:');
    if (customFields.length > 0) {
      customFields.forEach(field => {
        console.log(`   • ${field.displayLabel} (${field.apiName}) - ${field.dataType}${field.maxLength ? ` [${field.maxLength}]` : ''}`);
      });
    } else {
      console.log('   • No custom fields found - you may need to create product-specific fields');
    }

    console.log('\n📦 Suggested Product Information Fields to Create/Use:\n');

    // Our product data structure from the order splitting system
    const productDataFields = [
      { name: 'Product_Name', description: 'Product display name', dataType: 'text', maxLength: 255 },
      { name: 'Product_SKU', description: 'Internal SKU identifier', dataType: 'text', maxLength: 100 },
      { name: 'RSR_Stock_Number', description: 'RSR distributor stock number', dataType: 'text', maxLength: 50 },
      { name: 'Product_Quantity', description: 'Quantity ordered', dataType: 'integer' },
      { name: 'Unit_Price', description: 'Price per unit', dataType: 'currency' },
      { name: 'Total_Price', description: 'Total price for this item', dataType: 'currency' },
      { name: 'FFL_Required', description: 'Whether item requires FFL transfer', dataType: 'boolean' },
      { name: 'Drop_Ship_Eligible', description: 'Whether item can be drop-shipped', dataType: 'boolean' },
      { name: 'In_House_Only', description: 'Whether item requires in-house processing', dataType: 'boolean' },
      { name: 'Product_Category', description: 'Product category/type', dataType: 'text', maxLength: 100 },
      { name: 'Manufacturer', description: 'Product manufacturer', dataType: 'text', maxLength: 100 },
      { name: 'Product_Description', description: 'Detailed product description', dataType: 'textarea' },
      { name: 'Product_Specifications', description: 'Technical specifications', dataType: 'textarea' },
      { name: 'Product_Images', description: 'Product image URLs (JSON)', dataType: 'textarea' }
    ];

    productDataFields.forEach(field => {
      console.log(`   • ${field.name}: ${field.description}`);
      console.log(`     Type: ${field.dataType}${field.maxLength ? `, Max Length: ${field.maxLength}` : ''}`);
      console.log('');
    });

    // Generate field mapping recommendation
    const fieldMapping = {
      // Core product identification
      productName: 'Product_Name',
      sku: 'Product_SKU', 
      rsrStockNumber: 'RSR_Stock_Number',
      
      // Pricing and quantity
      quantity: 'Product_Quantity',
      unitPrice: 'Unit_Price',
      totalPrice: 'Total_Price',
      
      // Product attributes
      fflRequired: 'FFL_Required',
      dropShipEligible: 'Drop_Ship_Eligible', 
      inHouseOnly: 'In_House_Only',
      
      // Classification
      category: 'Product_Category',
      manufacturer: 'Manufacturer',
      
      // Detailed information
      description: 'Product_Description',
      specifications: 'Product_Specifications',
      images: 'Product_Images'
    };

    console.log('🗺️  Recommended Field Mapping (JavaScript Object):\n');
    console.log('const PRODUCT_FIELD_MAPPING = ' + JSON.stringify(fieldMapping, null, 2) + ';');

    console.log('\n📝 Next Steps:');
    console.log('1. Create the custom fields in Zoho CRM Deal module');
    console.log('2. Update the order integration to map product data to these fields');
    console.log('3. Test with sample product data');

    // Save the field mapping to a file
    const mappingData = {
      timestamp: new Date().toISOString(),
      recommendedFields: productDataFields,
      fieldMapping: fieldMapping,
      existingCustomFields: customFields,
      relevantStandardFields: standardFields.filter(f => !f.readOnly)
    };

    fs.writeFileSync('zoho-deal-product-field-mapping.json', JSON.stringify(mappingData, null, 2));
    console.log('\n💾 Field mapping data saved to: zoho-deal-product-field-mapping.json');

    return mappingData;

  } catch (error) {
    console.error('❌ Error discovering Zoho Deal fields:', error);
    
    // Provide fallback mapping based on common e-commerce product fields
    console.log('\n🔄 Providing fallback product field mapping...\n');
    
    const fallbackMapping = {
      // Core product identification  
      productName: 'Deal_Name', // Use deal name for main product
      sku: 'Product_Code', // Common standard field
      rsrStockNumber: 'Vendor_Part_Number',
      
      // Pricing and quantity
      quantity: 'Quantity', 
      unitPrice: 'Amount', // Standard deal amount
      totalPrice: 'Amount', // Map to deal total
      
      // Product attributes (would need custom fields)
      fflRequired: 'FFL_Required',
      dropShipEligible: 'Drop_Ship_Eligible',
      inHouseOnly: 'In_House_Only',
      
      // Classification
      category: 'Type', // Standard field
      manufacturer: 'Manufacturer',
      
      // Detailed information  
      description: 'Description', // Standard field
      specifications: 'Product_Details',
      images: 'Product_Images'
    };

    console.log('const FALLBACK_PRODUCT_MAPPING = ' + JSON.stringify(fallbackMapping, null, 2) + ';');
    return { fieldMapping: fallbackMapping };
  }
}

// Run the discovery
discoverZohoDealFields().then(result => {
  console.log('\n✅ Product field mapping discovery completed');
}).catch(error => {
  console.error('❌ Discovery failed:', error);
  process.exit(1);
});