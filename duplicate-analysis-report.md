# RSR Duplicate Product Analysis Report

**Generated**: 2025-09-16 (Current Analysis)

## 📊 Executive Summary

**Critical Finding**: Massive product duplication confirmed in RSR inventory due to stock number changes over time.

- **27,478 UPC codes** have duplicate products
- **55,132 total products** involved in duplications  
- **27,654 products to archive** (duplicates)
- **27,478 products to keep** (canonical versions)

## 🎯 Duplication Pattern

| Duplicate Count | UPC Codes | Total Products | Products to Archive |
|----------------|-----------|----------------|---------------------|
| 2 duplicates   | 27,302    | 54,604         | 27,302              |
| 3 duplicates   | 176       | 528            | 352                 |
| **TOTALS**     | **27,478** | **55,132**     | **27,654**          |

## 📋 Sample Duplicates (Top 20)

| UPC Code | Duplicates | Product IDs | SKUs |
|----------|------------|-------------|------|
| 022188893205 | 3 | 177988,149342,145107 | SW13739,13739-1,13739 |
| 029465084745 | 3 | 161383,132173,131985 | FE308A,308A-1,308A |
| 011356570000 | 3 | 177704,149047,135656 | SV57000,57000-1,57000 |
| 022188868388 | 3 | 177883,149234,143895 | SW10212,10212-1,10212 |
| 022188898576 | 3 | 177996,149350,129447 | SW13811,13811-1,13811 |

*Pattern: RSR stock numbers evolved: `13739` → `13739-1` → `SW13739`*

## 🛡️ Cleanup Strategy

### Canonical Selection Criteria
**Keep**: Product with highest ID (most recently created)
**Archive**: All other products with same UPC code

### Archive Process
1. **Set `is_active = false`** - Hide from searches/frontend
2. **Set `stock_quantity = 0`** - Prevent sales
3. **Set `in_stock = false`** - Mark unavailable  
4. **Preserve all data** - Keep for audit trail
5. **Maintain SKU aliases** - Ensure old stock numbers still work

### Data Integrity Protection
- **Orders preserved** - No changes to historical orders
- **Cart updates** - Redirect cart items to canonical products
- **Search reindex** - Update Algolia to show only active products
- **URL redirects** - Old product URLs redirect to canonical versions

## 🔧 Implementation Requirements

1. **UPC-based deduplication** with reference-aware cleanup
2. **SKU alias preservation** for all archived products  
3. **Search index update** to remove archived products
4. **Unique index creation** on UPC to prevent future duplicates

## 🚨 Risks Mitigated

- **Import collision safety** - ✅ Already implemented
- **Non-deterministic UPC selection** - ✅ Fixed via canonical product logic
- **Quantity update failures** - ✅ Alias fallback system implemented
- **Data loss prevention** - ✅ Archive strategy preserves all data

## 🏁 Next Steps

1. **Execute UPC-based deduplication** with archive strategy  
2. **Create unique index** on `products.upc_code` to prevent future duplicates
3. **Reindex Algolia search** to reflect active products only
4. **Validate results** - Confirm ~27.5k active products remain

---
**Status**: ✅ Analysis Complete - Ready for cleanup execution