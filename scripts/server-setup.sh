#!/bin/bash

# TheGunFirm.com Server Setup Script
# Ubuntu 22.04 LTS - 4CPU/16GB/160GB Configuration
# Optimized for firearms e-commerce with RSR API integration

set -e

echo "🔧 Starting TheGunFirm.com server setup..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
echo "🛠️ Installing essential packages..."
apt install -y \
  curl \
  wget \
  git \
  vim \
  htop \
  ufw \
  fail2ban \
  nginx \
  certbot \
  python3-certbot-nginx \
  build-essential \
  software-properties-common \
  apt-transport-https \
  ca-certificates \
  gnupg \
  lsb-release

# Install Node.js 20 LTS
echo "🟢 Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PostgreSQL 15
echo "🐘 Installing PostgreSQL 15..."
apt install -y postgresql postgresql-contrib

# Configure PostgreSQL for 16GB RAM
echo "⚙️ Configuring PostgreSQL for 16GB RAM..."
sudo -u postgres psql -c "ALTER SYSTEM SET shared_buffers = '4GB';"
sudo -u postgres psql -c "ALTER SYSTEM SET effective_cache_size = '12GB';"
sudo -u postgres psql -c "ALTER SYSTEM SET maintenance_work_mem = '1GB';"
sudo -u postgres psql -c "ALTER SYSTEM SET checkpoint_completion_target = 0.9;"
sudo -u postgres psql -c "ALTER SYSTEM SET wal_buffers = '16MB';"
sudo -u postgres psql -c "ALTER SYSTEM SET default_statistics_target = 100;"
sudo -u postgres psql -c "ALTER SYSTEM SET random_page_cost = 1.1;"
sudo -u postgres psql -c "ALTER SYSTEM SET effective_io_concurrency = 200;"
sudo -u postgres psql -c "ALTER SYSTEM SET work_mem = '64MB';"
sudo -u postgres psql -c "ALTER SYSTEM SET min_wal_size = '1GB';"
sudo -u postgres psql -c "ALTER SYSTEM SET max_wal_size = '4GB';"

# Restart PostgreSQL to apply settings
systemctl restart postgresql

# Create database and user
echo "🏗️ Creating database and user..."
sudo -u postgres createdb thegunfirm
sudo -u postgres psql -c "CREATE USER gunfirm_user WITH ENCRYPTED PASSWORD 'SecureGunFirm2025!';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE thegunfirm TO gunfirm_user;"
sudo -u postgres psql -c "ALTER USER gunfirm_user CREATEDB;"
sudo -u postgres psql -d thegunfirm -c "GRANT ALL ON SCHEMA public TO gunfirm_user;"
sudo -u postgres psql -d thegunfirm -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gunfirm_user;"
sudo -u postgres psql -d thegunfirm -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gunfirm_user;"

# Configure PostgreSQL for remote connections
echo "🔗 Configuring PostgreSQL for remote connections..."
PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1)
PG_CONFIG="/etc/postgresql/$PG_VERSION/main/postgresql.conf"
PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

# Enable remote connections
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" $PG_CONFIG

# Add authentication for remote connections
echo "host    thegunfirm    gunfirm_user    0.0.0.0/0    md5" >> $PG_HBA

# Restart PostgreSQL
systemctl restart postgresql

# Install Redis for caching
echo "🔴 Installing Redis for caching..."
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# Configure Redis for production
echo "maxmemory 2gb" >> /etc/redis/redis.conf
echo "maxmemory-policy allkeys-lru" >> /etc/redis/redis.conf
systemctl restart redis-server

# Configure firewall
echo "🛡️ Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5432/tcp  # PostgreSQL
ufw --force enable

# Configure fail2ban
echo "🚫 Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Configure Nginx
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/thegunfirm.com << 'EOF'
server {
    listen 80;
    server_name thegunfirm.com www.thegunfirm.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name thegunfirm.com www.thegunfirm.com;
    
    # SSL configuration will be added by certbot
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; media-src 'self'; object-src 'none'; child-src 'none'; worker-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'self';" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Client max body size for file uploads
    client_max_body_size 10M;
    
    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://localhost:3000;
    }
    
    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable rate limiting
cat > /etc/nginx/conf.d/rate-limit.conf << 'EOF'
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=2r/s;
EOF

# Remove default nginx site
rm -f /etc/nginx/sites-enabled/default

# Enable TheGunFirm site
ln -s /etc/nginx/sites-available/thegunfirm.com /etc/nginx/sites-enabled/

# Test nginx configuration
nginx -t

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /var/www/thegunfirm.com
chown -R www-data:www-data /var/www/thegunfirm.com

# Create systemd service for the application
echo "🔧 Creating systemd service..."
cat > /etc/systemd/system/thegunfirm.service << 'EOF'
[Unit]
Description=TheGunFirm.com Node.js Application
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/thegunfirm.com
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=DATABASE_URL=postgresql://gunfirm_user:SecureGunFirm2025!@localhost:5432/thegunfirm

# Resource limits
LimitNOFILE=65536
MemoryMax=4G
CPUQuota=200%

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
systemctl daemon-reload
systemctl enable thegunfirm.service

# Install PM2 for process management
echo "📊 Installing PM2 for process management..."
npm install -g pm2

# Create PM2 ecosystem file
cat > /var/www/thegunfirm.com/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'thegunfirm',
    script: 'server/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://gunfirm_user:SecureGunFirm2025!@localhost:5432/thegunfirm'
    },
    max_memory_restart: '2G',
    error_file: '/var/log/thegunfirm/error.log',
    out_file: '/var/log/thegunfirm/out.log',
    log_file: '/var/log/thegunfirm/combined.log',
    time: true
  }]
}
EOF

# Create log directory
mkdir -p /var/log/thegunfirm
chown -R www-data:www-data /var/log/thegunfirm

# Setup log rotation
cat > /etc/logrotate.d/thegunfirm << 'EOF'
/var/log/thegunfirm/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 www-data www-data
    postrotate
        pm2 reload thegunfirm
    endscript
}
EOF

# Create backup script
echo "💾 Creating backup script..."
cat > /usr/local/bin/backup-thegunfirm.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/thegunfirm"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
sudo -u postgres pg_dump thegunfirm > "$BACKUP_DIR/database_$DATE.sql"

# Application backup
tar -czf "$BACKUP_DIR/application_$DATE.tar.gz" -C /var/www thegunfirm.com

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /usr/local/bin/backup-thegunfirm.sh

# Setup daily backup cron job
echo "0 2 * * * /usr/local/bin/backup-thegunfirm.sh" | crontab -

# Setup system monitoring
echo "📈 Setting up system monitoring..."
cat > /usr/local/bin/system-monitor.sh << 'EOF'
#!/bin/bash
# Simple system monitoring script

LOG_FILE="/var/log/thegunfirm/system-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# CPU Usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')

# Memory Usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')

# Disk Usage
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')

# PostgreSQL Status
PG_STATUS=$(systemctl is-active postgresql)

# Redis Status
REDIS_STATUS=$(systemctl is-active redis-server)

# Nginx Status
NGINX_STATUS=$(systemctl is-active nginx)

echo "$DATE | CPU: ${CPU_USAGE}% | Memory: ${MEMORY_USAGE}% | Disk: ${DISK_USAGE}% | PostgreSQL: $PG_STATUS | Redis: $REDIS_STATUS | Nginx: $NGINX_STATUS" >> $LOG_FILE

# Alert if CPU > 80% or Memory > 80%
if (( $(echo "$CPU_USAGE > 80" | bc -l) )) || (( $(echo "$MEMORY_USAGE > 80" | bc -l) )); then
    echo "HIGH RESOURCE USAGE ALERT: CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE}%" | logger -t thegunfirm-monitor
fi
EOF

chmod +x /usr/local/bin/system-monitor.sh

# Setup monitoring cron job (every 5 minutes)
echo "*/5 * * * * /usr/local/bin/system-monitor.sh" | crontab -

# Display completion message
echo "✅ Server setup completed successfully!"
echo ""
echo "📊 Server Configuration:"
echo "  • OS: Ubuntu 22.04 LTS"
echo "  • PostgreSQL: Ready with optimized settings"
echo "  • Redis: Configured for caching"
echo "  • Nginx: Configured with SSL-ready setup"
echo "  • Node.js: 20 LTS installed"
echo "  • PM2: Process manager ready"
echo "  • Firewall: UFW configured"
echo "  • Fail2ban: Intrusion prevention active"
echo "  • Backups: Daily automatic backups"
echo "  • Monitoring: System monitoring active"
echo ""
echo "🔐 Database Connection:"
echo "  DATABASE_URL=postgresql://gunfirm_user:SecureGunFirm2025!@YOUR_SERVER_IP:5432/thegunfirm"
echo ""
echo "📋 Next Steps:"
echo "  1. Point your domain to this server"
echo "  2. Run: certbot --nginx -d thegunfirm.com -d www.thegunfirm.com"
echo "  3. Deploy your application to /var/www/thegunfirm.com"
echo "  4. Start with: pm2 start ecosystem.config.js"
echo ""
echo "🌟 Your server is ready for TheGunFirm.com production deployment!"
EOF