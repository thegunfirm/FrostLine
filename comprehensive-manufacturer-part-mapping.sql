-- Comprehensive manufacturer part number mapping
-- This fixes the critical issue where RSR stock numbers are still being used as SKUs

-- YHM Products - Real manufacturer part numbers
UPDATE products 
SET 
  manufacturer_part_number = '9680',  -- YHM's actual part number for flip rear sight
  sku = '9680'
WHERE rsr_stock_number = 'YHM-9680' AND manufacturer = 'YHMCO';

-- Colt Products - Real manufacturer part numbers  
UPDATE products 
SET 
  manufacturer_part_number = 'O1911C',  -- Colt's actual part number for 1911 Government
  sku = 'O1911C'
WHERE rsr_stock_number = 'COLT1911' AND manufacturer = 'Colt Manufacturing';

-- Additional common products that need proper manufacturer part numbers
UPDATE products 
SET 
  manufacturer_part_number = '16340',  -- Colt's part for AR-15A4
  sku = '16340'
WHERE rsr_stock_number = 'COLTAR15A4' AND manufacturer = 'Colt Manufacturing';

UPDATE products 
SET 
  manufacturer_part_number = 'P365-9-BXR3',  -- Sig's part for P365
  sku = 'P365-9-BXR3'
WHERE rsr_stock_number = 'SIGP365' AND manufacturer = 'Sig Sauer';

UPDATE products 
SET 
  manufacturer_part_number = 'HC9319B',  -- Springfield's part for Hellcat
  sku = 'HC9319B'
WHERE rsr_stock_number = 'SPAHELLCAT' AND manufacturer = 'Springfield Armory';

UPDATE products 
SET 
  manufacturer_part_number = 'PI9129L',  -- Springfield's part for 1911 Range Officer
  sku = 'PI9129L'
WHERE rsr_stock_number = 'SPA911RO' AND manufacturer = 'Springfield Armory';

UPDATE products 
SET 
  manufacturer_part_number = '3701',  -- Ruger's part for LCP II
  sku = '3701'
WHERE rsr_stock_number = 'RUGERLCP2' AND manufacturer = 'Sturm, Ruger & Co.';

UPDATE products 
SET 
  manufacturer_part_number = '1103',  -- Ruger's part for 10/22
  sku = '1103'
WHERE rsr_stock_number = 'RUG1103' AND manufacturer = 'Sturm, Ruger & Co.';

-- Check the fixes
SELECT 'Fixed Products' as status, COUNT(*) as count
FROM products 
WHERE manufacturer_part_number IS NOT NULL 
  AND manufacturer_part_number != ''
  AND sku != rsr_stock_number;

-- Show examples of properly separated products
SELECT 
  id, 
  name, 
  sku as manufacturer_sku, 
  manufacturer_part_number, 
  rsr_stock_number as distributor_stock,
  manufacturer
FROM products 
WHERE sku IN ('9680', 'O1911C', '16340', 'P365-9-BXR3', 'HC9319B', 'PI9129L', '3701', '1103')
ORDER BY manufacturer, sku;