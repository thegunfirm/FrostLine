const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');

const app = express();
const PORT = 3001;

// Create HTTPS agent that ignores SSL certificate issues
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// RSR API proxy endpoints
app.post('/api/rsr/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <GetRSRInventory xmlns="http://www.rsrgroup.com/webservices">
      <Username>63824</Username>
      <Password>RunTheGunZ623!</Password>
    </GetRSRInventory>
  </soap:Body>
</soap:Envelope>`;

    console.log('Making RSR API call...');
    
    const response = await axios.post(
      'https://api.rsrgroup.com/RSRWebServices/rsrwebservice.asmx',
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'SOAPAction': 'http://www.rsrgroup.com/webservices/GetRSRInventory',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        httpsAgent: httpsAgent,
        timeout: 30000
      }
    );

    console.log('RSR API success via server proxy');
    res.json({ 
      success: true, 
      message: 'RSR API working through server',
      dataLength: response.data ? response.data.length : 0
    });
  } catch (error) {
    console.error('RSR API Error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      code: error.code || 'Unknown'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'RSR API Proxy' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`RSR API Proxy running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});