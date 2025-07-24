# TheGunFirm.com Deployment Guide

## Current Development State

### Completed Features (10 days of development)
- ✅ Complete RSR integration with 29,836+ authentic products
- ✅ Three-tier pricing system (Bronze/Gold/Platinum)
- ✅ Advanced Algolia search with manufacturer/caliber ranking
- ✅ Comprehensive admin CMS interfaces
- ✅ RSR image system with authentication
- ✅ Cross-category product suggestions
- ✅ Real-time inventory synchronization

### Remaining Development (18-25 days estimated)
- 🔄 Shopping cart and checkout system
- 🔄 Authorize.Net payment processing
- 🔄 FreeAmericanPeople.com subscription platform
- 🔄 Cross-platform authentication API
- 🔄 Comprehensive testing and QA

## Development Workflow

### Environment Setup
```bash
# 1. Clone repository
git clone https://github.com/yourusername/thegunfirm.git
cd thegunfirm

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Add your API keys: DATABASE_URL, ALGOLIA_*, RSR_*, etc.

# 4. Start development server
npm run dev
```

### Branching Strategy
```bash
# Main branch: stable, production-ready code
main

# Feature branches: new development
feature/shopping-cart
feature/payment-processing  
feature/subscription-platform
feature/user-authentication

# Hotfix branches: urgent production fixes
hotfix/pricing-calculation
hotfix/search-performance
```

### Commit Convention
```bash
# Format: type(scope): description
feat(cart): add shopping cart state management
fix(search): resolve Algolia filter conflicts
docs(readme): update deployment instructions
refactor(pricing): optimize tier calculation logic
test(auth): add subscription validation tests
```

## Production Deployment

### Infrastructure (Hetzner)
- **Server**: Hetzner Cloud or Dedicated
- **Database**: PostgreSQL with connection pooling
- **CDN**: For static assets and images
- **SSL**: Let's Encrypt or commercial certificate
- **Backup**: Daily automated backups

### Environment Variables (Production)
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/thegunfirm_prod

# Search
ALGOLIA_APP_ID=your_app_id
ALGOLIA_API_KEY=your_api_key
ALGOLIA_ADMIN_API_KEY=your_admin_key

# RSR Integration
RSR_USERNAME=60742
RSR_PASSWORD=your_password
RSR_POS=your_pos_code

# Payment Processing
AUTHORIZE_NET_API_LOGIN_ID=your_login_id
AUTHORIZE_NET_TRANSACTION_KEY=your_transaction_key
AUTHORIZE_NET_ENVIRONMENT=production

# Email & Notifications
SMTP_HOST=your_smtp_host
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass

# Security
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
```

### Deployment Steps
```bash
# 1. Build application
npm run build

# 2. Run database migrations
npm run db:push

# 3. Sync RSR inventory
npm run sync:rsr

# 4. Index products in Algolia
npm run sync:algolia

# 5. Start production server
NODE_ENV=production npm start
```

## Monitoring & Maintenance

### Health Checks
- **Database**: Connection and query performance
- **RSR API**: Daily sync status and connectivity
- **Algolia**: Search index health and query performance
- **Payment**: Authorize.Net transaction processing
- **Images**: RSR image service availability

### Backup Strategy
- **Database**: Daily full backup + hourly incremental
- **Files**: Weekly backup of uploaded content
- **Configuration**: Version-controlled environment configs
- **Code**: Git repository with tagged releases

### Performance Monitoring
- **Response Times**: API endpoints < 500ms
- **Search**: Algolia queries < 100ms
- **Database**: Query optimization and indexing
- **Memory**: Node.js heap usage monitoring
- **Storage**: Disk usage and cleanup procedures

## Security Considerations

### Data Protection
- **Encryption**: All sensitive data encrypted at rest
- **API Keys**: Stored in secure environment variables
- **Database**: Connection encryption and access controls
- **Session**: Secure session management with expiration

### Compliance
- **FFL**: Federal Firearms License validation
- **State Laws**: Regional shipping restrictions
- **Tax**: Sales tax calculation and reporting
- **Privacy**: User data protection and GDPR compliance

## Rollback Procedures

### Quick Rollback
```bash
# 1. Identify last stable commit
git log --oneline

# 2. Rollback to previous version
git reset --hard [stable-commit-hash]

# 3. Rebuild and redeploy
npm run build && npm run deploy
```

### Database Rollback
```bash
# 1. Stop application
systemctl stop thegunfirm

# 2. Restore database from backup
pg_restore -d thegunfirm_prod backup_file.sql

# 3. Restart application
systemctl start thegunfirm
```

## Collaboration Guidelines

### Code Review Process
1. Create feature branch from main
2. Implement feature with comprehensive tests
3. Create pull request with detailed description
4. Code review by team member
5. Merge after approval and CI/CD success

### Database Changes
1. Create migration scripts for schema changes
2. Test migrations on staging environment
3. Document all database modifications
4. Coordinate with team before production deployment

### Emergency Contacts
- **Technical Lead**: Primary development contact
- **DevOps**: Infrastructure and deployment issues
- **RSR Support**: Distributor API and data issues
- **Payment Support**: Authorize.Net integration issues

## Future Scaling Considerations

### Performance Optimization
- **Caching**: Redis for session and query caching
- **CDN**: Global content delivery network
- **Load Balancing**: Multiple application instances
- **Database**: Read replicas and connection pooling

### Feature Expansion
- **Multi-Distributor**: Additional supplier integrations
- **AI Search**: Internal search engine development
- **Mobile App**: React Native or PWA implementation
- **Analytics**: Comprehensive business intelligence