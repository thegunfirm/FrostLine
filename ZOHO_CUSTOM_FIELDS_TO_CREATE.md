# Zoho Deal Module - Custom Fields to Create

## Required Custom Fields for Product Information Mapping

Based on the product field mapping implementation, you need to create these custom fields in your Zoho Deal module:

### Text Fields (Single Line)
| Field Name | API Name | Type | Length | Description |
|------------|----------|------|--------|-------------|
| Product Code | `Product_Code` | Single Line Text | 100 chars | Internal SKU identifier |
| Distributor Part Number | `Distributor_Part_Number` | Single Line Text | 50 chars | Distributor stock number (RSR, Lipsey's, etc.) |
| Distributor | `Distributor` | Single Line Text | 50 chars | Name of distributor (RSR, Lipsey's, Sports South, etc.) |
| Manufacturer | `Manufacturer` | Single Line Text | 100 chars | Product manufacturer/brand |

### Number Fields
| Field Name | API Name | Type | Decimal Places | Description |
|------------|----------|------|----------------|-------------|
| Unit Price | `Unit_Price` | Currency | 2 | Price per individual item |
| Quantity | `Quantity` | Number | 0 | Number of items ordered |

### Boolean Fields (Checkbox)
| Field Name | API Name | Type | Description |
|------------|----------|------|-------------|
| FFL Required | `FFL_Required` | Boolean | Whether item requires FFL transfer |
| Drop Ship Eligible | `Drop_Ship_Eligible` | Boolean | Can be drop-shipped from distributor |
| In House Only | `In_House_Only` | Boolean | Requires TGF in-house processing |

### Picklist Field
| Field Name | API Name | Type | Options |
|------------|----------|------|---------|
| Product Category | `Product_Category` | Single Select Picklist | See options below |

**Product Category Options:**
- Handguns
- Rifles
- Shotguns
- Ammunition
- Magazines
- Accessories
- Optics
- Parts & Components
- Services
- Holsters
- Safes & Storage

### Textarea Fields (Multi-line)
| Field Name | API Name | Type | Description |
|------------|----------|------|-------------|
| Product Specifications | `Product_Specifications` | Multi Line Text | Technical specs, dimensions, etc. |
| Product Images | `Product_Images` | Multi Line Text | JSON array of image URLs |

## Standard Zoho Fields Already Used

These standard Zoho fields are automatically used and don't need to be created:

| Standard Field | API Name | Usage |
|----------------|----------|-------|
| Deal Name | `Deal_Name` | Product name or "Mixed Order" |
| Amount | `Amount` | Total deal value |
| Description | `Description` | Product description |

## Field Creation Instructions

1. **Access Zoho CRM Setup**:
   - Go to Setup → Customization → Modules and Fields
   - Select "Deals" module

2. **Create Each Custom Field**:
   - Click "New Custom Field"
   - Enter the exact field name and API name as specified above
   - Set the appropriate field type and length
   - Make fields optional (not mandatory) to avoid breaking existing deals

3. **For Picklist Field (Product Category)**:
   - Select "Pick List" type
   - Add all the category options listed above
   - Set as single-select

4. **Field Permissions**:
   - Ensure all user profiles have read/write access to these fields
   - Set appropriate field-level security if needed

## Validation Checklist

After creating the fields, verify:
- [ ] All 11 custom fields created with exact API names
- [ ] Product Category picklist has all 11 options
- [ ] Field types match the specifications
- [ ] User permissions allow read/write access
- [ ] Test Deal creation includes the new fields

## Integration Test

Once fields are created, test the integration by running:
```bash
node test-product-field-mapping.js
```

This will validate that the product data maps correctly to your new Zoho fields.