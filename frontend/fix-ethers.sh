#!/bin/bash

# Fix ethers version and rebuild
# This script ensures ethers v5 is installed and rebuilds the app

set -e

echo "🔧 Fixing ethers version issue..."
echo ""

cd "$(dirname "$0")"

echo "1️⃣  Removing old dependencies..."
rm -rf node_modules
rm -rf node_modules/.vite
rm -rf dist
rm -rf .vite

echo ""
echo "2️⃣  Installing dependencies (this will install ethers v5)..."
npm install

echo ""
echo "3️⃣  Verifying ethers version..."
ETHERS_VERSION=$(node -e "console.log(require('./node_modules/ethers/package.json').version)")
echo "   Installed ethers: v$ETHERS_VERSION"

if [[ $ETHERS_VERSION == 6.* ]]; then
  echo ""
  echo "❌ ERROR: ethers v6 was installed instead of v5!"
  echo "   This usually happens when package-lock.json has cached v6."
  echo ""
  echo "   Running explicit install of ethers v5..."
  npm install ethers@5.7.2 --save-exact
  
  ETHERS_VERSION=$(node -e "console.log(require('./node_modules/ethers/package.json').version)")
  echo "   New ethers version: v$ETHERS_VERSION"
fi

if [[ $ETHERS_VERSION != 5.* ]]; then
  echo ""
  echo "❌ FAILED: Could not install ethers v5"
  echo "   Please manually run: npm install ethers@5.7.2 --save-exact"
  exit 1
fi

echo ""
echo "✅ ethers v5.7.2 installed successfully!"

echo ""
echo "4️⃣  Building for production..."
npm run build

echo ""
echo "5️⃣  Testing production build..."
echo "   Starting preview server..."
echo "   Visit: http://localhost:4173"
echo "   Press Ctrl+C to stop"
echo ""

npm run preview

