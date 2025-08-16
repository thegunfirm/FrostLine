# Zoho Deal Module - Product Information Field Mapping

## Available Product Data from Orders

From our order splitting system, we have the following product information available:

```javascript
// Sample product data structure
const productData = {
  productName: "Smith & Wesson M&P Shield",
  sku: "SW-MP-SHIELD-9MM", 
  rsrStockNumber: "123456",
  quantity: 1,
  unitPrice: 349.99,
  totalPrice: 349.99,
  fflRequired: true,
  dropShipEligible: true,
  inHouseOnly: false,
  category: "Handguns",
  manufacturer: "Smith & Wesson",
  description: "Compact 9mm pistol for concealed carry",
  specifications: "Barrel: 3.1\", Capacity: 7+1, Weight: 18.3 oz",
  images: ["url1", "url2"]
};
```

## Recommended Field Mapping

### Core Product Identification
| Product Data | Zoho Deal Field | Field Type | Notes |
|--------------|----------------|------------|--------|
| `productName` | `Deal_Name` | Standard Text | Use for main product or "Mixed Order" for multi-product |
| `sku` | `Product_Code` | Custom Text | Internal SKU identifier |
| `rsrStockNumber` | `Vendor_Part_Number` | Custom Text | RSR distributor stock number |

### Pricing and Quantity  
| Product Data | Zoho Deal Field | Field Type | Notes |
|--------------|----------------|------------|--------|
| `quantity` | `Quantity` | Standard Integer | Number of items ordered |
| `unitPrice` | `Unit_Price` | Custom Currency | Price per individual item |
| `totalPrice` | `Amount` | Standard Currency | Total deal value (maps to standard Amount field) |

### Product Classification
| Product Data | Zoho Deal Field | Field Type | Notes |
|--------------|----------------|------------|--------|
| `category` | `Product_Category` | Custom Picklist | Handguns, Rifles, Shotguns, Accessories, etc. |
| `manufacturer` | `Manufacturer` | Custom Text | Brand/manufacturer name |
| `description` | `Description` | Standard Textarea | Standard Zoho field for detailed description |

### Compliance and Fulfillment Attributes
| Product Data | Zoho Deal Field | Field Type | Notes |
|--------------|----------------|------------|--------|
| `fflRequired` | `FFL_Required` | Custom Boolean | Whether item requires FFL transfer |
| `dropShipEligible` | `Drop_Ship_Eligible` | Custom Boolean | Can be drop-shipped from distributor |
| `inHouseOnly` | `In_House_Only` | Custom Boolean | Requires TGF in-house processing |

### Extended Product Information
| Product Data | Zoho Deal Field | Field Type | Notes |
|--------------|----------------|------------|--------|
| `specifications` | `Product_Specifications` | Custom Textarea | Technical specs, dimensions, etc. |
| `images` | `Product_Images` | Custom Textarea | JSON array of image URLs |

## Implementation Code

```javascript
// Product field mapping configuration
const DEAL_PRODUCT_FIELD_MAPPING = {
  // Core identification
  productName: 'Deal_Name',
  sku: 'Product_Code', 
  rsrStockNumber: 'Vendor_Part_Number',
  
  // Pricing and quantity
  quantity: 'Quantity',
  unitPrice: 'Unit_Price',
  totalPrice: 'Amount',
  
  // Classification
  category: 'Product_Category',
  manufacturer: 'Manufacturer',
  description: 'Description',
  
  // Compliance attributes
  fflRequired: 'FFL_Required',
  dropShipEligible: 'Drop_Ship_Eligible', 
  inHouseOnly: 'In_House_Only',
  
  // Extended information
  specifications: 'Product_Specifications',
  images: 'Product_Images'
};

// Function to map product data to Zoho Deal fields
function mapProductToZohoDeal(productData) {
  const zohoFields = {};
  
  Object.keys(DEAL_PRODUCT_FIELD_MAPPING).forEach(productField => {
    const zohoField = DEAL_PRODUCT_FIELD_MAPPING[productField];
    const value = productData[productField];
    
    if (value !== undefined && value !== null) {
      // Handle special formatting
      if (productField === 'images' && Array.isArray(value)) {
        zohoFields[zohoField] = JSON.stringify(value);
      } else {
        zohoFields[zohoField] = value;
      }
    }
  });
  
  return zohoFields;
}
```

## Custom Fields to Create in Zoho

You'll need to create these custom fields in the Zoho Deal module:

### Text Fields
- `Product_Code` (Text, 100 chars) - Internal SKU
- `Vendor_Part_Number` (Text, 50 chars) - RSR stock number  
- `Manufacturer` (Text, 100 chars) - Product manufacturer

### Number/Currency Fields
- `Unit_Price` (Currency) - Price per unit
- `Quantity` (Integer) - Number of items

### Boolean Fields
- `FFL_Required` (Boolean) - Requires FFL transfer
- `Drop_Ship_Eligible` (Boolean) - Can be drop-shipped
- `In_House_Only` (Boolean) - Requires in-house processing

### Picklist Field
- `Product_Category` (Picklist) with options:
  - Handguns
  - Rifles  
  - Shotguns
  - Ammunition
  - Accessories
  - Optics
  - Parts & Components
  - Services

### Textarea Fields
- `Product_Specifications` (Textarea) - Technical specifications
- `Product_Images` (Textarea) - JSON array of image URLs

## Multi-Product Orders

For orders with multiple products (after order splitting), you have two options:

1. **Single Deal Approach**: Use `Deal_Name = "Mixed Order"` and store product details in `Description`
2. **Multiple Deals Approach**: Create separate deals for each product (recommended for our order splitting system)

Our current order splitting system creates separate deals for each shipping outcome, which naturally handles the multi-product scenario.

## Integration with Order Splitting

The order splitting system should map product data when creating each deal:

```javascript
// In the order splitting service
const dealData = {
  ...systemFieldMapping, // Existing TGF fields
  ...mapProductToZohoDeal(productData), // New product fields
  // Other deal fields...
};
```

This ensures each split order contains complete product information for tracking and customer service purposes.