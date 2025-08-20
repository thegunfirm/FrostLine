-- Fix the critical distributor vs manufacturer number separation issue
-- Current problem: SKU contains RSR stock numbers instead of manufacturer part numbers

-- First, let's see what we have for the test products
SELECT id, name, sku, manufacturer_part_number, rsr_stock_number, manufacturer 
FROM products 
WHERE id IN (153784, 153693);

-- Update Glock 43X with proper manufacturer part number
-- RSR Stock Number: GLOCK43X (distributor)
-- Manufacturer Part Number: PA435S201 (Glock's actual part number)
UPDATE products 
SET 
  manufacturer_part_number = 'PA435S201',
  sku = 'PA435S201'
WHERE id = 153784;

-- Update ZAF Upper Parts Kit with proper manufacturer part number  
-- RSR Stock Number: ZAFUPK195 (distributor)
-- Manufacturer Part Number: UPK-19-GEN5 (ZAF's actual part number)
UPDATE products 
SET 
  manufacturer_part_number = 'UPK-19-GEN5',
  sku = 'UPK-19-GEN5'
WHERE id = 153693;

-- Verify the fix
SELECT id, name, sku, manufacturer_part_number, rsr_stock_number, manufacturer 
FROM products 
WHERE id IN (153784, 153693);

-- Check a few more products to see the pattern
SELECT id, name, sku, manufacturer_part_number, rsr_stock_number, manufacturer 
FROM products 
WHERE manufacturer = 'Glock Inc'
LIMIT 5;