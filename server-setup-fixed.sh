#!/bin/bash

# TheGunFirm.com Server Setup Script
# Ubuntu 22.04 LTS - 4CPU/16GB/160GB Configuration
# Optimized for firearms e-commerce with RSR API integration

set -e

echo "Starting TheGunFirm.com server setup..."

# Update system
echo "Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
echo "Installing essential packages..."
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
echo "Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PostgreSQL 15
echo "Installing PostgreSQL 15..."
apt install -y postgresql postgresql-contrib

# Configure PostgreSQL for 16GB RAM
echo "Configuring PostgreSQL for 16GB RAM..."
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
echo "Creating database and user..."
sudo -u postgres createdb thegunfirm
sudo -u postgres psql -c "CREATE USER gunfirm_user WITH ENCRYPTED PASSWORD 'SecureGunFirm2025!';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE thegunfirm TO gunfirm_user;"
sudo -u postgres psql -c "ALTER USER gunfirm_user CREATEDB;"
sudo -u postgres psql -d thegunfirm -c "GRANT ALL ON SCHEMA public TO gunfirm_user;"
sudo -u postgres psql -d thegunfirm -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gunfirm_user;"
sudo -u postgres psql -d thegunfirm -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gunfirm_user;"

# Configure PostgreSQL for remote connections
echo "Configuring PostgreSQL for remote connections..."
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
echo "Installing Redis for caching..."
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# Configure Redis for production
echo "maxmemory 2gb" >> /etc/redis/redis.conf
echo "maxmemory-policy allkeys-lru" >> /etc/redis/redis.conf
systemctl restart redis-server

# Configure firewall
echo "Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5432/tcp
ufw --force enable

# Configure fail2ban
echo "Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Install PM2 for process management
echo "Installing PM2 for process management..."
npm install -g pm2

# Create application directory
echo "Creating application directory..."
mkdir -p /var/www/thegunfirm.com
chown -R www-data:www-data /var/www/thegunfirm.com

# Create log directory
mkdir -p /var/log/thegunfirm
chown -R www-data:www-data /var/log/thegunfirm

# Create backup script
echo "Creating backup script..."
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

# Display completion message
echo "Server setup completed successfully!"
echo ""
echo "Server Configuration:"
echo "  • OS: Ubuntu 22.04 LTS"
echo "  • PostgreSQL: Ready with optimized settings"
echo "  • Redis: Configured for caching"
echo "  • Node.js: 20 LTS installed"
echo "  • PM2: Process manager ready"
echo "  • Firewall: UFW configured"
echo "  • Fail2ban: Intrusion prevention active"
echo "  • Backups: Daily automatic backups"
echo ""
echo "Database Connection:"
echo "  DATABASE_URL=postgresql://gunfirm_user:SecureGunFirm2025!@5.78.137.95:5432/thegunfirm"
echo ""
echo "Your server is ready for TheGunFirm.com!"