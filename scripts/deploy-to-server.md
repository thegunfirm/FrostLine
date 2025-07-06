# Deploy TheGunFirm.com to Your Server (5.78.137.95)

## Step 1: Setup Your Server

SSH into your server and run the setup script:

```bash
ssh root@5.78.137.95
wget https://raw.githubusercontent.com/your-repo/thegunfirm/main/scripts/server-setup.sh
chmod +x server-setup.sh
./server-setup.sh
```

Or copy the script content manually and run it.

## Step 2: Update Replit Environment

In Replit, update your environment variable:

```env
DATABASE_URL=postgresql://gunfirm_user:SecureGunFirm2025!@5.78.137.95:5432/thegunfirm
```

## Step 3: Test Database Connection

Run this in Replit to verify the connection:

```bash
npm run db:push
```

You should see:
```
🐘 Connected to standard PostgreSQL server (development)
✅ Database connection verified
```

## Step 4: Deploy Application to Server

```bash
# 1. Build the application locally
npm run build

# 2. Create deployment package
tar -czf thegunfirm-deploy.tar.gz dist/ server/ shared/ package.json package-lock.json

# 3. Copy to server
scp thegunfirm-deploy.tar.gz root@5.78.137.95:/var/www/

# 4. SSH to server and deploy
ssh root@5.78.137.95
cd /var/www
tar -xzf thegunfirm-deploy.tar.gz -C thegunfirm.com/
cd thegunfirm.com
npm install --production
pm2 start ecosystem.config.js
```

## Step 5: Configure Domain & SSL

```bash
# Point your domain to 5.78.137.95 first, then:
certbot --nginx -d thegunfirm.com -d www.thegunfirm.com
```

## Step 6: Verify Full RSR API Access

Once deployed, test RSR integration:

```bash
# On server, check logs
pm2 logs thegunfirm

# Should show successful RSR API connections without DNS errors
```

## Benefits After Migration

✅ **Full RSR API Access** - No more network restrictions
✅ **Live Inventory Sync** - Real-time product updates  
✅ **Complete Catalog** - Hundreds of authentic products
✅ **Better Performance** - Dedicated server resources
✅ **Production Ready** - SSL, backups, monitoring included

## Monitoring Commands

```bash
# Check application status
pm2 status

# View real-time logs
pm2 logs --lines 100

# Monitor system resources
htop

# Check database status
sudo systemctl status postgresql

# View system monitoring
tail -f /var/log/thegunfirm/system-monitor.log
```

## Database Connection String

For production use:
```
postgresql://gunfirm_user:SecureGunFirm2025!@5.78.137.95:5432/thegunfirm
```

Your server is configured with:
- Firewall allowing only necessary ports
- Daily backups to `/var/backups/thegunfirm/`
- System monitoring every 5 minutes
- SSL-ready Nginx configuration
- Production-optimized PostgreSQL settings
- Redis caching for performance
- PM2 process management with clustering