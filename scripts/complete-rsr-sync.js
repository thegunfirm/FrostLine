#!/usr/bin/env node

/**
 * Complete RSR Proxy Server with Actual Credentials
 * Run this on your Hetzner server to serve full 29k RSR catalog
 */

const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Your actual RSR credentials
const RSR_USERNAME = process.env.RSR_USERNAME || "6388880";
const RSR_PASSWORD = process.env.RSR_PASSWORD;
const RSR_POS = process.env.RSR_POS || "I";

if (!RSR_PASSWORD) {
  console.error('❌ RSR_PASSWORD environment variable is required');
  console.log('Set it with: export RSR_PASSWORD="your_password"');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

console.log('🚀 Starting RSR Proxy Server on Hetzner...');
console.log(`📋 RSR Username: ${RSR_USERNAME}`);
console.log(`📋 RSR POS Type: ${RSR_POS}`);
console.log('🔑 RSR Password: ✓ Configured');

/**
 * Build SOAP envelope for RSR API calls
 */
function buildSOAPEnvelope(body) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    ${body}
  </soap12:Body>
</soap12:Envelope>`;
}

/**
 * Get authentication headers for RSR API
 */
function getAuthHeaders() {
  return {
    'Content-Type': 'application/soap+xml; charset=utf-8',
    'Authorization': `Basic ${Buffer.from(`${RSR_USERNAME}:${RSR_PASSWORD}`).toString('base64')}`
  };
}

/**
 * Parse XML response from RSR
 */
async function parseXML(xmlData) {
  const parser = new xml2js.Parser({ explicitArray: true });
  return new Promise((resolve, reject) => {
    parser.parseString(xmlData, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

/**
 * Map RSR product data to our format
 */
function mapRSRProduct(rsrItem) {
  return {
    stockNo: rsrItem.stockNo?.[0] || '',
    upc: rsrItem.upc?.[0] || '',
    description: rsrItem.description?.[0] || '',
    dept: rsrItem.dept?.[0] || '',
    manufacturer: rsrItem.manufacturer?.[0] || '',
    retailPrice: parseFloat(rsrItem.retailPrice?.[0] || '0'),
    rsrPrice: parseFloat(rsrItem.rsrPrice?.[0] || '0'),
    weight: parseFloat(rsrItem.weight?.[0] || '0'),
    quantity: parseInt(rsrItem.quantity?.[0] || '0'),
    model: rsrItem.model?.[0] || '',
    mfgPartNumber: rsrItem.mfgPartNumber?.[0] || '',
    categoryDesc: rsrItem.categoryDesc?.[0] || '',
    subCategory: rsrItem.subCategory?.[0] || '',
    imageURL: rsrItem.imageURL?.[0] || '',
    allocated: rsrItem.allocated?.[0] || '',
    accessories: rsrItem.accessories?.[0] || '',
    newItem: rsrItem.newItem?.[0] === 'True',
    promo: rsrItem.promo?.[0] || '',
    expandedData: null
  };
}

/**
 * Fetch full RSR catalog using authentic credentials
 */
async function fetchRSRCatalog() {
  console.log('📦 Fetching full RSR catalog from api.rsrgroup.com...');
  
  const soapBody = `
    <GetCatalogData xmlns="http://tempuri.org/">
      <username>${RSR_USERNAME}</username>
      <password>${RSR_PASSWORD}</password>
      <posType>${RSR_POS}</posType>
    </GetCatalogData>`;

  try {
    const response = await axios.post(
      'https://api.rsrgroup.com/rsrwebservice.asmx',
      buildSOAPEnvelope(soapBody),
      {
        headers: getAuthHeaders(),
        timeout: 120000, // 2 minutes for full catalog
        validateStatus: () => true
      }
    );

    console.log(`RSR API Response Status: ${response.status}`);
    console.log(`RSR API Response Length: ${response.data?.length || 0} bytes`);

    if (response.status !== 200) {
      throw new Error(`RSR API returned status ${response.status}: ${response.statusText}`);
    }

    const result = await parseXML(response.data);
    
    // Try multiple XML structures
    let catalogData = null;
    const possiblePaths = [
      result?.['soap12:Envelope']?.[0]?.['soap12:Body']?.[0]?.['GetCatalogDataResponse']?.[0]?.['GetCatalogDataResult']?.[0],
      result?.['soap:Envelope']?.[0]?.['soap:Body']?.[0]?.['GetCatalogDataResponse']?.[0]?.['GetCatalogDataResult']?.[0],
      result?.['Envelope']?.[0]?.['Body']?.[0]?.['GetCatalogDataResponse']?.[0]?.['GetCatalogDataResult']?.[0],
      result?.['GetCatalogDataResponse']?.[0]?.['GetCatalogDataResult']?.[0],
      result?.['CatalogData']?.[0],
      result
    ];

    for (const path of possiblePaths) {
      if (path && (path.CatalogItem || path.Item || path.Product)) {
        catalogData = path;
        console.log(`✅ Found catalog structure with ${Object.keys(path).length} keys`);
        break;
      }
    }

    if (catalogData) {
      const items = catalogData.CatalogItem || catalogData.Item || catalogData.Product || [];
      console.log(`📦 Successfully retrieved ${items.length} products from RSR`);
      return items.map(mapRSRProduct);
    }

    console.log('⚠️ No catalog data found in response structure');
    console.log('Response structure:', Object.keys(result));
    throw new Error('No catalog data found in RSR response');

  } catch (error) {
    console.error('❌ RSR API Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data Preview:', error.response.data?.toString().substring(0, 500));
    }
    throw error;
  }
}

/**
 * Proxy endpoint to serve RSR catalog to Replit
 */
app.get('/api/rsr/catalog', async (req, res) => {
  try {
    console.log('🔄 Replit requesting RSR catalog via proxy...');
    const startTime = Date.now();
    
    const catalog = await fetchRSRCatalog();
    
    const duration = Date.now() - startTime;
    console.log(`✅ Served ${catalog.length} products to Replit in ${duration}ms`);
    
    res.json({
      success: true,
      products: catalog,
      count: catalog.length,
      source: 'RSR API via Hetzner proxy',
      duration: duration,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'RSR Proxy',
    server: 'Hetzner',
    credentials: {
      username: RSR_USERNAME,
      password: '✓ Configured',
      pos: RSR_POS
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Test RSR connection endpoint
 */
app.get('/api/rsr/test', async (req, res) => {
  try {
    console.log('🧪 Testing RSR connection...');
    const catalog = await fetchRSRCatalog();
    
    res.json({
      success: true,
      message: 'RSR connection successful',
      productCount: catalog.length,
      sampleProducts: catalog.slice(0, 5).map(p => ({
        stockNo: p.stockNo,
        description: p.description,
        manufacturer: p.manufacturer,
        price: p.rsrPrice
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start the proxy server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 RSR Proxy Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Ready to serve RSR catalog to Replit`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/rsr/test`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 RSR Proxy shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 RSR Proxy shutting down gracefully...');
  process.exit(0);
});