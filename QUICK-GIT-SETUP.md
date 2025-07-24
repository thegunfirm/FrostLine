# Quick Git Setup - Manual Commands

Run these commands one by one in the console terminal:

## Step 1: Check Git Status
```bash
git status
```

## Step 2: Add All Files
```bash
git add .
```

## Step 3: Create Initial Commit
```bash
git commit -m "feat: initial TheGunFirm.com with complete RSR integration

- 29,836+ authentic RSR products with tier pricing
- Advanced Algolia search with manufacturer/caliber ranking  
- Comprehensive admin CMS interfaces
- RSR image system and cross-category suggestions
- Real-time inventory sync with RSR distributor"
```

## Step 4: Create GitHub Repository
1. Go to https://github.com/new
2. Name: `thegunfirm`
3. Set to Private
4. Don't initialize with README (we already have content)
5. Click "Create repository"

## Step 5: Connect to GitHub
```bash
git remote add origin https://github.com/YOURUSERNAME/thegunfirm.git
```
(Replace YOURUSERNAME with your actual GitHub username)

## Step 6: Push to GitHub
```bash
git push -u origin main
```

## Done!
Your project is now backed up on GitHub and ready for collaboration.

## For Future Changes:
```bash
git add .
git commit -m "feat: description of changes"
git push
```