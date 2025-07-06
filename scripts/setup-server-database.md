# Server Database Setup Guide

This guide will help you set up PostgreSQL on your server and migrate the database connection.

## Option 1: PostgreSQL on Your Server

### 1. Install PostgreSQL on Your Server
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database and User
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE thegunfirm;
CREATE USER gunfirm_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE thegunfirm TO gunfirm_user;
GRANT ALL ON SCHEMA public TO gunfirm_user;
\q
```

### 3. Configure PostgreSQL for Remote Connections
Edit `/etc/postgresql/{version}/main/postgresql.conf`:
```conf
listen_addresses = '*'
```

Edit `/etc/postgresql/{version}/main/pg_hba.conf`:
```conf
# Add this line (adjust IP range as needed)
host    thegunfirm    gunfirm_user    0.0.0.0/0    md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 4. Update Replit Environment
In Replit, update your `DATABASE_URL` environment variable:
```
postgresql://gunfirm_user:your_secure_password@your-server-ip:5432/thegunfirm
```

### 5. Run Database Migration
Once connected, run the migration:
```bash
npm run db:push
```

## Option 2: Cloud Database (Recommended)

### PostgreSQL Cloud Providers:
- **DigitalOcean Managed Database**: $15/month, includes automatic backups
- **AWS RDS**: Pay-as-you-go, highly scalable
- **Google Cloud SQL**: Competitive pricing with good performance
- **Supabase**: PostgreSQL with additional features, generous free tier

### Benefits of Cloud Database:
- Automatic backups and point-in-time recovery
- High availability and failover
- Automatic security updates
- SSL/TLS encryption by default
- Easier scaling

## Network Benefits

Once your database is on your server (or cloud), the application will have:

✅ **Full RSR API Access** - No network restrictions
✅ **Live Inventory Sync** - Real-time product updates
✅ **Complete Catalog** - Hundreds of authentic products
✅ **Production Performance** - Better latency and reliability

## Current Schema Migration

The system will automatically detect your server database and:
1. Use standard PostgreSQL driver instead of Neon
2. Apply all existing table schemas
3. Preserve your current authentic RSR products
4. Enable full API functionality

## Security Considerations

- Use strong passwords for database user
- Enable SSL connections in production
- Restrict database access to specific IP addresses
- Keep PostgreSQL updated
- Regular backups (automated with cloud providers)

## Test Connection

Once configured, the system will show:
```
🐘 Connected to standard PostgreSQL server
```

And RSR API will work without restrictions, enabling:
- Live product catalog sync
- Real-time inventory updates
- Full search and filtering capabilities
- Automatic daily synchronization