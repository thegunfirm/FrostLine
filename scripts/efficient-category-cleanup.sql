-- Efficient Category Cleanup SQL
-- Moves all misplaced products to their proper categories in single operations

BEGIN;

-- First, backup current state
CREATE TABLE IF NOT EXISTS category_cleanup_backup_complete AS 
SELECT id, sku, name, category, requires_ffl, must_route_through_gun_firm 
FROM products 
WHERE category IN ('Handguns', 'Rifles', 'Shotguns');

-- Move ammunition products
UPDATE products
SET 
  category = 'Ammunition',
  requires_ffl = false,
  must_route_through_gun_firm = false
WHERE category IN ('Handguns', 'Rifles', 'Shotguns')
  AND (
    name ~* '\b(ammo|ammunition|FMJ|JHP|JSP|TMJ|HP|SP|RN)\b'
    OR (name ~* '\b\d+\s*(rd|rds|round|rounds|count|ct|box)\b' AND name ~* '\b\d+\s*(gr|grain)\b')
  );

-- Move magazine products
UPDATE products
SET 
  category = 'Magazines',
  requires_ffl = false,
  must_route_through_gun_firm = false
WHERE category IN ('Handguns', 'Rifles', 'Shotguns')
  AND name ~* '\bmagazine\b';

-- Move optics products
UPDATE products
SET 
  category = 'Optics',
  requires_ffl = false,
  must_route_through_gun_firm = false
WHERE category IN ('Handguns', 'Rifles', 'Shotguns')
  AND name ~* '\b(scope|optic|sight|red\s*dot|reflex|holographic|magnifier|binocular)\b'
  AND name !~* '\b(pistol|rifle|shotgun|revolver)\s+\d';

-- Move suppressor/silencer products to NFA
UPDATE products
SET 
  category = 'NFA Products',
  requires_ffl = true,
  must_route_through_gun_firm = true
WHERE category IN ('Handguns', 'Rifles', 'Shotguns')
  AND name ~* '\b(suppressor|silencer|can)\b'
  AND name !~* '\b(pistol|rifle|shotgun)\s+\d';

-- Move parts products
UPDATE products
SET 
  category = 'Parts',
  requires_ffl = false,
  must_route_through_gun_firm = false
WHERE category IN ('Handguns', 'Rifles', 'Shotguns')
  AND name ~* '\b(trigger|spring|pin|bolt\s+carrier|buffer|handguard|barrel|stock|rail|grip)\b'
  AND name !~* '\b(pistol|rifle|shotgun|revolver)\s+(\d+mm|\d+\s*(cal|gauge|acp|mag|special))'
  AND name !~* '\b(glock|sig|smith|ruger|colt|beretta|springfield|remington)\b.*\b(\d+mm|\d+\s*acp)';

-- Move all other accessories
UPDATE products
SET 
  category = 'Accessories',
  requires_ffl = false,
  must_route_through_gun_firm = false
WHERE category IN ('Handguns', 'Rifles', 'Shotguns')
  AND name ~* '\b(holster|case|cleaning|oil|solvent|brush|kit|rod|light|laser|sling|strap|bag|pouch|target|bipod|swivel|adapter|conversion|tool|plug|cap|cover|protector|wrench|gauge|bore\s+sight|snap\s+cap|dummy\s+round|speed\s+loader|brass|shell\s+holder|recoil\s+pad|butt\s+(pad|plate)|cheek\s+(rest|riser)|flash\s+(hider|suppressor)|muzzle\s+(brake|device)|compensator)\b'
  AND name !~* '\b(pistol|rifle|shotgun|revolver)\s+(\d+mm|\d+\s*(cal|gauge|acp|mag|special))';

-- Fix FFL status for actual firearms that remain
UPDATE products
SET 
  requires_ffl = true,
  must_route_through_gun_firm = true
WHERE category IN ('Handguns', 'Rifles', 'Shotguns')
  AND requires_ffl = false
  AND (
    -- Clear firearm patterns
    name ~* '\b(pistol|handgun|revolver|rifle|carbine|shotgun)\s+(\d+mm|\d+\s*(cal|gauge|acp|mag|special|sw|lr))'
    OR name ~* '\b(glock|sig|smith|wesson|ruger|colt|beretta|springfield|remington|mossberg)\b.*\b(\d+mm|\d+\s*(acp|mag|special|sw|lr)|\d+\s*ga)'
    OR name ~* '\b(ar-15|ar15|ar-10|ar10|ak-47|ak47|ak-74|ak74|sks|m1|m14|m16|m4)\b'
  );

-- Show results
SELECT 'Cleanup Complete' as status;

SELECT category, COUNT(*) as count,
       SUM(CASE WHEN requires_ffl THEN 1 ELSE 0 END) as with_ffl,
       SUM(CASE WHEN NOT requires_ffl THEN 1 ELSE 0 END) as without_ffl
FROM products
WHERE category IN ('Handguns', 'Rifles', 'Shotguns', 'Accessories', 'Parts', 'Optics', 'NFA Products', 'Ammunition', 'Magazines')
GROUP BY category
ORDER BY 
  CASE 
    WHEN category IN ('Handguns', 'Rifles', 'Shotguns') THEN 1
    ELSE 2
  END,
  category;

COMMIT;