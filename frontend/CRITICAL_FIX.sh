#!/bin/bash

# CRITICAL FIX for Production Errors
# This fixes the "ethers.providers.Web3Provider is undefined" error

set -e

echo "🚨 CRITICAL FIX SCRIPT"
echo "======================"
echo ""
echo "This will fix the ethers v6 → v5 issue causing production errors"
echo ""

cd "$(dirname "$0")"

echo "📍 Current directory: $(pwd)"
echo ""

# Step 1: Backup package-lock.json
if [ -f "package-lock.json" ]; then
  echo "💾 Backing up package-lock.json..."
  cp package-lock.json package-lock.json.backup
fi

# Step 2: Remove ALL node_modules and caches
echo ""
echo "🧹 Step 1/6: Cleaning old installations..."
rm -rf node_modules
rm -rf .vite
rm -rf node_modules/.vite
rm -rf dist
echo "   ✅ Cleaned"

# Step 3: Remove package-lock.json (to avoid cached v6)
echo ""
echo "🗑️  Step 2/6: Removing package-lock.json (to avoid cached ethers v6)..."
rm -f package-lock.json
echo "   ✅ Removed"

# Step 4: Install ethers v5 first
echo ""
echo "📦 Step 3/6: Installing ethers v5.7.2 explicitly..."
npm install ethers@5.7.2 --save-exact
echo "   ✅ ethers v5.7.2 installed"

# Step 5: Install all other dependencies
echo ""
echo "📦 Step 4/6: Installing all dependencies..."
npm install
echo "   ✅ Dependencies installed"

# Step 6: Verify ethers version
echo ""
echo "🔍 Step 5/6: Verifying ethers version..."
ETHERS_VERSION=$(node -e "console.log(require('./node_modules/ethers/package.json').version)")
echo "   Installed version: $ETHERS_VERSION"

if [[ $ETHERS_VERSION != 5.* ]]; then
  echo ""
  echo "❌ ERROR: ethers v6 is still installed!"
  echo "   This should not happen. Manual intervention required."
  echo ""
  echo "   Please run manually:"
  echo "   1. rm -rf node_modules package-lock.json"
  echo "   2. npm install ethers@5.7.2 --save-exact"
  echo "   3. npm install"
  exit 1
fi

echo "   ✅ ethers v5 confirmed!"

# Step 7: Build for production
echo ""
echo "🏗️  Step 6/6: Building for production..."
npm run build
echo "   ✅ Build complete!"

# Done
echo ""
echo "═══════════════════════════════════════════"
echo "✅ FIX COMPLETE!"
echo "═══════════════════════════════════════════"
echo ""
echo "📊 Summary:"
echo "   - ethers v5.7.2 installed"
echo "   - All dependencies updated"
echo "   - Production build ready"
echo ""
echo "🧪 Next steps:"
echo "   1. Test locally:  npm run preview"
echo "   2. Visit: http://localhost:4173"
echo "   3. Check console for errors"
echo "   4. If working, deploy: vercel --prod"
echo ""
echo "🔍 What to check:"
echo "   ✅ No 'ethers.providers' errors"
echo "   ✅ No impersonator errors"
echo "   ✅ Wallet connects successfully"
echo "   ✅ Tokens load and balances fetch"
echo ""

