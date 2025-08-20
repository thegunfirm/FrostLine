-- Fix remaining inventory items to properly separate distributor vs manufacturer numbers
-- This updates products that still have RSR stock numbers as SKUs

-- Update Glock 19 Gen 5 with proper manufacturer part number
UPDATE products 
SET 
  manufacturer_part_number = 'PA195S201',
  sku = 'PA195S201'
WHERE rsr_stock_number = 'GLOCK19GEN5' AND manufacturer = 'Glock Inc';

-- Add a few more real manufacturer part number mappings for common products
UPDATE products 
SET 
  manufacturer_part_number = 'PI8020LP',
  sku = 'PI8020LP'
WHERE rsr_stock_number = 'SPRINGFIELD1911' AND manufacturer = 'Springfield Armory';

UPDATE products 
SET 
  manufacturer_part_number = '11912',
  sku = '11912'
WHERE rsr_stock_number = 'SWMP9' AND manufacturer = 'Smith & Wesson';

-- Check our progress
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN manufacturer_part_number IS NOT NULL AND manufacturer_part_number != '' THEN 1 END) as with_mfg_part_number,
  COUNT(CASE WHEN sku = rsr_stock_number THEN 1 END) as still_using_rsr_as_sku
FROM products 
WHERE manufacturer IN ('Glock Inc', 'Springfield Armory', 'Smith & Wesson', 'ZAFPRE');

-- Show the fixed products
SELECT id, name, sku, manufacturer_part_number, rsr_stock_number, manufacturer 
FROM products 
WHERE id IN (153784, 153693, 153782)
ORDER BY id;