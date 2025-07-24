#!/bin/bash

# TheGunFirm.com Git Setup Script
# Run this script to initialize Git version control and set up collaboration workflow

echo "🔧 Setting up Git for TheGunFirm.com..."

# Check if git is already initialized
if [ -d ".git" ]; then
    echo "✅ Git repository already exists"
else
    echo "📝 Initializing new Git repository..."
    git init
fi

# Add all files to staging
echo "📦 Adding project files to Git..."
git add .

# Create initial commit with comprehensive message
echo "💾 Creating initial commit..."
git commit -m "feat: initial TheGunFirm.com with complete RSR integration

✅ COMPLETED FEATURES:
- Complete RSR integration with 29,836+ authentic products
- Three-tier pricing system (Bronze/Gold/Platinum) 
- Advanced Algolia search with manufacturer/caliber ranking
- Comprehensive category management and filtering
- Admin CMS interfaces for pricing, sync, and settings
- RSR image system with authentication
- Cross-category product suggestions
- Product detail pages with tier pricing
- Real-time inventory sync with RSR distributor

🏗️ ARCHITECTURE:
- React + TypeScript frontend with Wouter routing
- Node.js Express backend with PostgreSQL/Drizzle ORM
- Algolia search integration with 29K+ indexed products
- Neon serverless database with authentic RSR data
- Multi-tier membership system with dynamic pricing

📊 SCALE:
- 29,836 authentic RSR products across all categories
- Complete manufacturer and caliber filtering
- Real-time search with stock prioritization
- Comprehensive admin tools and monitoring

🔄 READY FOR:
- Shopping cart implementation
- Payment processing with Authorize.Net
- FreeAmericanPeople.com subscription platform
- Production deployment to Hetzner"

echo ""
echo "🎉 Git setup complete!"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Create GitHub repository: https://github.com/new"
echo "2. Add remote origin:"
echo "   git remote add origin https://github.com/yourusername/thegunfirm.git"
echo "3. Push to GitHub:"
echo "   git push -u origin main"
echo ""
echo "🤝 FOR COLLABORATION:"
echo "1. Create feature branches: git checkout -b feature/shopping-cart"
echo "2. Regular commits: git commit -m 'feat: description'"
echo "3. Push branches: git push origin feature/branch-name"
echo "4. Create pull requests on GitHub for code review"
echo ""
echo "🔄 FOR ROLLBACK SAFETY:"
echo "- View commits: git log --oneline"
echo "- Rollback: git reset --hard [commit-hash]"
echo "- Create checkpoint: git tag v1.0-stable"
echo ""
echo "✅ Your project is now version controlled and collaboration-ready!"