#!/bin/bash

# Deploy RSR Proxy to Hetzner Server
# This script sets up the RSR proxy server to serve the full 29k product catalog

echo "🚀 Deploying RSR Proxy to Hetzner Server..."

# Set your actual server details
HETZNER_SERVER="your-hetzner-server"
SERVER_USER="root"
RSR_USERNAME="${RSR_USERNAME:-6388880}"
RSR_PASSWORD="${RSR_PASSWORD:-your_password}"
RSR_POS="${RSR_POS:-I}"

echo "📋 Server: $HETZNER_SERVER"
echo "📋 RSR Username: ${RSR_USERNAME:0:3}***"

# Copy the proxy script to server
echo "📁 Copying RSR proxy script to server..."
scp scripts/hetzner-rsr-proxy.js $SERVER_USER@$HETZNER_SERVER:/var/www/rsr-proxy.js

# Connect to server and deploy
ssh $SERVER_USER@$HETZNER_SERVER << EOF
echo "🔧 Setting up RSR proxy on Hetzner..."

# Install Node.js dependencies if needed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install required packages
echo "📦 Installing dependencies..."
cd /var/www
npm init -y 2>/dev/null || true
npm install express axios xml2js cors

# Set environment variables
echo "🔑 Setting RSR credentials..."
export RSR_USERNAME="$RSR_USERNAME"
export RSR_PASSWORD="$RSR_PASSWORD"
export RSR_POS="$RSR_POS"

# Add to .bashrc for persistence
echo "export RSR_USERNAME=\"$RSR_USERNAME\"" >> ~/.bashrc
echo "export RSR_PASSWORD=\"$RSR_PASSWORD\"" >> ~/.bashrc
echo "export RSR_POS=\"$RSR_POS\"" >> ~/.bashrc

# Create systemd service for auto-restart
cat > /etc/systemd/system/rsr-proxy.service << 'EOL'
[Unit]
Description=RSR Proxy Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www
Environment=RSR_USERNAME=$RSR_USERNAME
Environment=RSR_PASSWORD=$RSR_PASSWORD
Environment=RSR_POS=$RSR_POS
ExecStart=/usr/bin/node rsr-proxy.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOL

# Enable and start the service
systemctl enable rsr-proxy
systemctl start rsr-proxy

# Check status
sleep 2
systemctl status rsr-proxy --no-pager

echo "✅ RSR Proxy deployed and running on port 3001"
echo "🔗 Test URL: http://$HETZNER_SERVER:3001/health"
echo "📡 Catalog URL: http://$HETZNER_SERVER:3001/api/rsr/catalog"

EOF

echo "🎉 Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set HETZNER_PROXY_URL in Replit: http://$HETZNER_SERVER:3001"
echo "2. Test the proxy: curl http://$HETZNER_SERVER:3001/health"
echo "3. Run RSR sync in Replit to load 29k products"
echo ""
echo "🔧 Manage the service:"
echo "   systemctl status rsr-proxy"
echo "   systemctl restart rsr-proxy"
echo "   journalctl -u rsr-proxy -f"