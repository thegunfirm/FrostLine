# RSR API Proxy Setup for Your Server

This creates an RSR API proxy on your server that Replit can call to bypass network restrictions.

## 1. Create RSR Proxy Service on Your Server

SSH to your server and create this file:

```bash
nano /var/www/rsr-proxy.js
```

Copy this content:

```javascript
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3001;

// Enable CORS for Replit
app.use(cors({
  origin: ['https://your-replit-url.replit.dev', 'http://localhost:5000'],
  credentials: true
}));

app.use(express.json());

// RSR API credentials (use your actual credentials)
const RSR_CONFIG = {
  username: process.env.RSR_USERNAME || 'your_rsr_username',
  password: process.env.RSR_PASSWORD || 'your_rsr_password',
  standardUsername: process.env.RSR_STANDARD_USERNAME || 'your_standard_username',
  standardPassword: process.env.RSR_STANDARD_PASSWORD || 'your_standard_password'
};

// RSR API proxy endpoints
app.post('/api/rsr/inventory', async (req, res) => {
  try {
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <GetRSRInventory xmlns="http://www.rsrgroup.com/webservices">
      <Username>${RSR_CONFIG.username}</Username>
      <Password>${RSR_CONFIG.password}</Password>
    </GetRSRInventory>
  </soap:Body>
</soap:Envelope>`;

    const response = await axios.post(
      'https://api.rsrgroup.com/RSRWebServices/rsrwebservice.asmx',
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'SOAPAction': 'http://www.rsrgroup.com/webservices/GetRSRInventory'
        },
        timeout: 30000
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('RSR API Error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      code: error.code 
    });
  }
});

app.post('/api/rsr/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <GetRSRInventory xmlns="http://www.rsrgroup.com/webservices">
      <Username>${RSR_CONFIG.username}</Username>
      <Password>${RSR_CONFIG.password}</Password>
      <SearchQuery>${query}</SearchQuery>
    </GetRSRInventory>
  </soap:Body>
</soap:Envelope>`;

    const response = await axios.post(
      'https://api.rsrgroup.com/RSRWebServices/rsrwebservice.asmx',
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'SOAPAction': 'http://www.rsrgroup.com/webservices/GetRSRInventory'
        },
        timeout: 30000
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('RSR Search Error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'RSR API Proxy' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`RSR API Proxy running on port ${PORT}`);
});
```

## 2. Install Dependencies

```bash
cd /var/www
npm init -y
npm install express cors axios
```

## 3. Create Systemd Service

```bash
sudo nano /etc/systemd/system/rsr-proxy.service
```

Content:
```ini
[Unit]
Description=RSR API Proxy
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www
ExecStart=/usr/bin/node rsr-proxy.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=RSR_USERNAME=your_rsr_username
Environment=RSR_PASSWORD=your_rsr_password
Environment=RSR_STANDARD_USERNAME=your_standard_username
Environment=RSR_STANDARD_PASSWORD=your_standard_password

[Install]
WantedBy=multi-user.target
```

## 4. Start the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable rsr-proxy.service
sudo systemctl start rsr-proxy.service
sudo systemctl status rsr-proxy.service
```

## 5. Configure Firewall

```bash
sudo ufw allow 3001/tcp
```

## 6. Test the Proxy

```bash
curl -X GET http://localhost:3001/health
curl -X POST http://5.78.137.95:3001/api/rsr/search -H "Content-Type: application/json" -d '{"query":"glock"}'
```

Now Replit can call your server at `http://5.78.137.95:3001/api/rsr/*` to access the RSR API through your server.