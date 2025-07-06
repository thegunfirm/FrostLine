# Deploy RSR Inventory Sync to Hetzner Server

This will start loading products from the RSR API directly into your Hetzner database.

## On Your Hetzner Server:

```bash
# Install required packages
cd /var/www
npm install pg axios xml2js

# Create the sync script
nano rsr-inventory-sync.js
```

Copy the content from `scripts/hetzner-rsr-sync.js`, then:

```bash
# Run the initial sync
node rsr-inventory-sync.js
```

This will:
1. Connect to your PostgreSQL database
2. Call the RSR API directly (no network restrictions)
3. Clear existing RSR products 
4. Load thousands of authentic firearms and accessories
5. Calculate Bronze/Gold/Platinum tier pricing
6. Insert all products with proper categorization

## Expected Output:
```
Connected to PostgreSQL database
Calling RSR API for full inventory...
Received 15,000+ products from RSR
Processing 15,000+ products...
Inserted 100 products...
Inserted 200 products...
...
✅ RSR Inventory Sync Complete!
📊 Total products inserted: 15,247
🔄 Sync completed at: 2025-07-06T04:42:15.123Z
```

## Set Up Automatic Daily Sync:

```bash
# Create cron job for daily sync at 2 AM
echo "0 2 * * * cd /var/www && node rsr-inventory-sync.js >> /var/log/rsr-sync.log 2>&1" | crontab -
```

Your TheGunFirm.com database will now be populated with the complete RSR catalog!