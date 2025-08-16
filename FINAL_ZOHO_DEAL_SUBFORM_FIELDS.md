# Final Zoho Deal Subform Fields - Updated Structure

## Dynamic Product Lookup System Implementation

The system now implements a comprehensive "Find or Create Product by SKU" approach:
- **Product Lookup**: Dynamic lookup to Products module using SKU
- **Auto-Creation**: Creates new Products if SKU doesn't exist
- **De-duplication**: Batch processing prevents duplicate creation within same order
- **Subform Integration**: Links Products to Deal subform rows with descriptive fields

## Required Custom Fields in Deal Subform

Based on the updated field structure with removed underscores and dynamic lookup:

### Lookup Field (1)
| Field Name | API Name | Type | Description |
|------------|----------|------|-------------|
| Product Lookup | `Product_Lookup` | Lookup to Products | Dynamic link to Products module |

### Text Fields (3)
| Field Name | API Name | Type | Length | Description |
|------------|----------|------|--------|-------------|
| Product Code (SKU) | `Product Code (SKU)` | Single Line Text | 100 chars | Internal SKU identifier (updated name) |
| Distributor Part Number | `Distributor Part Number` | Single Line Text | 50 chars | Distributor stock number (no underscore) |
| Distributor | `Distributor` | Single Line Text | 50 chars | Name of distributor (RSR, Lipsey's, etc.) |
| Manufacturer | `Manufacturer` | Single Line Text | 100 chars | Product manufacturer/brand |

### Number Fields (2)
| Field Name | API Name | Type | Description |
|------------|----------|------|-------------|
| Unit Price | `Unit Price` | Currency | Price per individual item (no underscore) |
| Quantity | `Quantity` | Number | Number of items ordered |

### Boolean Fields (3)
| Field Name | API Name | Type | Description |
|------------|----------|------|-------------|
| FFL Required | `FFL Required` | Boolean | Whether item requires FFL transfer (no underscore) |
| Drop Ship Eligible | `Drop Ship Eligible` | Boolean | Can be drop-shipped from distributor (no underscore) |
| In House Only | `In House Only` | Boolean | Requires TGF in-house processing (no underscore) |

### Picklist Field (1)
| Field Name | API Name | Type | Options |
|------------|----------|------|---------|
| Product Category | `Product Category` | Single Select | 11 options: Handguns, Rifles, Shotguns, Ammunition, Magazines, Accessories, Optics, Parts & Components, Services, Holsters, Safes & Storage |

## Removed Fields

Per user updates, the following fields were **removed**:
- ~~Product Specifications~~ (textarea field removed)
- ~~Product Images~~ (JSON field removed)

## Summary - **10 Custom Fields** in Deal Subform

**Total Fields**: 1 Lookup + 4 Text + 2 Number + 3 Boolean + 1 Picklist = **11 fields**

**Updated Field Count**:
- **Lookup Field (1)**: Product_Lookup
- **Text Fields (4)**: Product Code (SKU), Distributor Part Number, Distributor, Manufacturer  
- **Number/Currency Fields (2)**: Unit Price, Quantity
- **Boolean Fields (3)**: FFL Required, Drop Ship Eligible, In House Only
- **Picklist Field (1)**: Product Category

## Products Module Requirements

The Products module must have:
- `Product_Code` field set as **unique** for SKU-based lookup
- `Product_Name` field for product names
- All the same custom fields as the Deal subform for data consistency

## Dynamic Deal Naming System

**Deal Names** now follow the final rule:
- **Single receiver**: `TGF-{OrderNo}-0`
- **Multiple receivers**: `TGF-{OrderNo}-{A,B,C...}Z`

**Examples**:
- Single In-House: `TGF-1000456-0`
- Multi-receiver: `TGF-1000455-AZ` and `TGF-1000455-BZ`

## Integration Flow

1. **Order Processing**: Generate 7-digit TGF order number
2. **Product Lookup**: For each line item SKU:
   - Search Products module for existing SKU
   - Create new Product if not found
   - Cache results to prevent duplicates
3. **Subform Creation**: Attach Product to Deal subform row
4. **Field Population**: Fill all descriptive fields in subform
5. **Deal Naming**: Apply A/B/C+Z naming for multi-receiver orders

This creates a fully normalized system where Products are centrally managed and Deals reference them through structured subforms with comprehensive tracking fields.