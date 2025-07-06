const { Client } = require('pg');
const axios = require('axios');
const https = require('https');
const xml2js = require('xml2js');

// Database connection
const client = new Client({
  connectionString: 'postgresql://gunfirm_user:SecureGunFirm2025!@localhost:5432/thegunfirm'
});

// Create HTTPS agent that ignores SSL certificate issues
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// RSR API configuration
const RSR_CONFIG = {
  username: '63824',
  password: 'RunTheGunZ623!',
  baseUrl: 'https://api.rsrgroup.com/RSRWebServices/rsrwebservice.asmx'
};

// Alternative RSR endpoints to try
const RSR_ENDPOINTS = [
  'https://api.rsrgroup.com/RSRWebServices/rsrwebservice.asmx',
  'https://www.rsrgroup.com/RSRWebServices/rsrwebservice.asmx',
  'https://rsrgroup.com/RSRWebServices/rsrwebservice.asmx'
];

class RSRInventorySync {
  async connect() {
    await client.connect();
    console.log('Connected to PostgreSQL database');
  }

  async getRSRInventory() {
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <GetRSRInventory xmlns="http://www.rsrgroup.com/webservices">
      <Username>${RSR_CONFIG.username}</Username>
      <Password>${RSR_CONFIG.password}</Password>
    </GetRSRInventory>
  </soap:Body>
</soap:Envelope>`;

    console.log('Calling RSR API for full inventory...');
    
    // Try multiple endpoints due to DNS issues
    let lastError = null;
    for (const endpoint of RSR_ENDPOINTS) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await axios.post(endpoint, soapEnvelope, {
          headers: {
            'Content-Type': 'application/soap+xml; charset=utf-8',
            'SOAPAction': 'http://www.rsrgroup.com/webservices/GetRSRInventory',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/soap+xml, application/dime, multipart/related, text/*',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Authorization': `Basic ${Buffer.from(RSR_CONFIG.username + ':' + RSR_CONFIG.password).toString('base64')}`
          },
          httpsAgent: httpsAgent,
          timeout: 120000, // 2 minute timeout
          maxRedirects: 5, // Allow redirects
          validateStatus: function (status) {
            return status >= 200 && status < 400; // Accept redirects
          }
        });

        // Parse XML response
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);
        
        const inventoryData = result['soap:Envelope']['soap:Body']['GetRSRInventoryResponse']['GetRSRInventoryResult'];
        
        if (!inventoryData) {
          throw new Error('No inventory data received from RSR');
        }

        // Parse the actual inventory XML
        const inventoryResult = await parser.parseStringPromise(inventoryData);
        const products = inventoryResult.RSRInventory?.Product || [];
        
        console.log(`Success! Received ${Array.isArray(products) ? products.length : 1} products from RSR via ${endpoint}`);
        return Array.isArray(products) ? products : [products];
        
      } catch (error) {
        console.log(`Failed with ${endpoint}: ${error.message}`);
        lastError = error;
        continue;
      }
    }
    
    // If all endpoints failed, throw the last error
    throw new Error(`All RSR endpoints failed. Last error: ${lastError.message}`);
  }

  async clearExistingProducts() {
    console.log('Clearing existing products...');
    await client.query('DELETE FROM products WHERE distributor = $1', ['RSR']);
    console.log('Existing RSR products cleared');
  }

  transformRSRProduct(rsrProduct) {
    // Calculate tier pricing
    const basePrice = parseFloat(rsrProduct.RSRPrice || rsrProduct.Price || 0);
    const msrp = parseFloat(rsrProduct.RetailPrice || rsrProduct.MSRP || basePrice * 1.4);
    
    // Bronze: 20% markup, Gold: 15% markup, Platinum: 10% markup
    const bronzePrice = (basePrice * 1.20).toFixed(2);
    const goldPrice = (basePrice * 1.15).toFixed(2);
    const platinumPrice = (basePrice * 1.10).toFixed(2);

    // Map categories
    const categoryMap = {
      'Firearms': 'Firearms',
      'Handguns': 'Handguns', 
      'Rifles': 'Rifles',
      'Shotguns': 'Shotguns',
      'Ammunition': 'Ammunition',
      'Optics': 'Optics',
      'Accessories': 'Accessories'
    };

    return {
      name: rsrProduct.Description || rsrProduct.ItemDescription || 'Unknown Product',
      description: rsrProduct.FullDescription || rsrProduct.Description || null,
      category: categoryMap[rsrProduct.CategoryDesc] || 'Accessories',
      manufacturer: rsrProduct.MfgName || rsrProduct.Manufacturer || null,
      sku: rsrProduct.StockNo || rsrProduct.ItemNo || null,
      priceWholesale: basePrice.toFixed(2),
      priceMAP: rsrProduct.MAPPrice || null,
      priceMSRP: msrp.toFixed(2),
      priceBronze: bronzePrice,
      priceGold: goldPrice,
      pricePlatinum: platinumPrice,
      inStock: parseInt(rsrProduct.Quantity || 0) > 0,
      stockQuantity: parseInt(rsrProduct.Quantity || 0),
      distributor: 'RSR',
      requiresFFL: this.requiresFFL(rsrProduct),
      mustRouteThroughGunFirm: false,
      tags: this.generateTags(rsrProduct),
      images: null,
      returnPolicyDays: 30,
      isActive: true
    };
  }

  requiresFFL(product) {
    const category = (product.CategoryDesc || '').toLowerCase();
    const dept = (product.DepartmentDesc || '').toLowerCase();
    
    return category.includes('firearm') || 
           category.includes('handgun') || 
           category.includes('rifle') || 
           category.includes('shotgun') ||
           dept.includes('firearm');
  }

  generateTags(product) {
    const tags = [];
    
    if (product.CategoryDesc) tags.push(product.CategoryDesc);
    if (product.MfgName) tags.push(product.MfgName);
    if (product.DepartmentDesc) tags.push(product.DepartmentDesc);
    if (product.SubDepartmentDesc) tags.push(product.SubDepartmentDesc);
    
    return tags;
  }

  async insertProduct(product) {
    const query = `
      INSERT INTO products (
        name, description, category, manufacturer, sku,
        "priceWholesale", "priceMAP", "priceMSRP", "priceBronze", "priceGold", "pricePlatinum",
        "inStock", "stockQuantity", distributor, "requiresFFL", "mustRouteThroughGunFirm",
        tags, images, "returnPolicyDays", "isActive"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    `;

    const values = [
      product.name, product.description, product.category, product.manufacturer, product.sku,
      product.priceWholesale, product.priceMAP, product.priceMSRP, product.priceBronze, product.priceGold, product.pricePlatinum,
      product.inStock, product.stockQuantity, product.distributor, product.requiresFFL, product.mustRouteThroughGunFirm,
      JSON.stringify(product.tags), product.images, product.returnPolicyDays, product.isActive
    ];

    await client.query(query, values);
  }

  async syncInventory() {
    try {
      await this.connect();
      
      console.log('Starting RSR inventory sync...');
      const rsrProducts = await this.getRSRInventory();
      
      console.log(`Processing ${rsrProducts.length} products...`);
      
      // Clear existing products
      await this.clearExistingProducts();
      
      // Insert new products in batches
      let inserted = 0;
      const batchSize = 100;
      
      for (let i = 0; i < rsrProducts.length; i += batchSize) {
        const batch = rsrProducts.slice(i, i + batchSize);
        
        for (const rsrProduct of batch) {
          try {
            const product = this.transformRSRProduct(rsrProduct);
            await this.insertProduct(product);
            inserted++;
            
            if (inserted % 100 === 0) {
              console.log(`Inserted ${inserted} products...`);
            }
          } catch (error) {
            console.error(`Error inserting product ${rsrProduct.StockNo}:`, error.message);
          }
        }
      }
      
      console.log(`\nRSR Inventory Sync Complete!`);
      console.log(`Total products inserted: ${inserted}`);
      console.log(`Sync completed at: ${new Date().toISOString()}`);
      
    } catch (error) {
      console.error('RSR Inventory Sync Failed:', error.message);
      throw error;
    } finally {
      await client.end();
    }
  }
}

// Run the sync
const sync = new RSRInventorySync();
sync.syncInventory()
  .then(() => {
    console.log('RSR inventory sync completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('RSR inventory sync failed:', error);
    process.exit(1);
  });