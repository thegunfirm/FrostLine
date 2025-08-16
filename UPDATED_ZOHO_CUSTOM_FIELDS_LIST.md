# Updated Zoho Deal Module - Custom Fields to Create

## Required Custom Fields for Product Information Mapping (Updated)

Based on the updated product field mapping with distributor changes, you need to create these custom fields in your Zoho Deal module:

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

## Summary - **12 Custom Fields** to Create

**Text Fields (4):**
- `Product_Code` (100 chars) - Internal SKU identifier
- `Distributor_Part_Number` (50 chars) - Distributor stock number (RSR, Lipsey's, etc.)
- `Distributor` (50 chars) - Name of distributor (RSR, Lipsey's, Sports South, etc.)
- `Manufacturer` (100 chars) - Product manufacturer/brand

**Number/Currency Fields (2):**
- `Unit_Price` (Currency, 2 decimals) - Price per individual item
- `Quantity` (Number, 0 decimals) - Number of items ordered

**Boolean Fields (3):**
- `FFL_Required` - Whether item requires FFL transfer
- `Drop_Ship_Eligible` - Can be drop-shipped from distributor
- `In_House_Only` - Requires TGF in-house processing

**Picklist Field (1):**
- `Product_Category` - Single select with 11 options

**Textarea Fields (2):**
- `Product_Specifications` - Technical specs, dimensions, etc.
- `Product_Images` - JSON array of image URLs

## Distributor Field Notes

The new `Distributor` field will automatically populate based on the source:
- **"RSR"** - When RSR stock number is provided
- **"Lipsey's"** - When Lipsey's distributor is specified
- **"Sports South"** - When Sports South distributor is specified
- **"Zanders"** - When Zanders distributor is specified
- **Custom values** - Any other distributor name can be specified

This prepares the system for future distributor integrations beyond RSR.

## Standard Zoho Fields Used (No Creation Needed)

These standard Zoho fields are automatically used:
- `Deal_Name` - Product name or "Mixed Order"
- `Amount` - Total deal value
- `Description` - Product description

## Quick Setup Checklist

1. Create **12 custom fields** with exact API names above
2. Set Product Category picklist with 11 options
3. Configure field permissions for all users
4. Test with sample Deal creation
5. Verify integration with order splitting system

Total fields in each Deal: **9 system fields** + **12 product fields** + **3 standard fields** = **24 comprehensive fields** for complete order tracking.