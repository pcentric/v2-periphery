#!/bin/bash

# Uniswap V2 Frontend - Production Build Script
# This script ensures clean installation and build

set -e  # Exit on error

echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf node_modules/.vite
rm -rf .vite

echo ""
echo "📦 Installing dependencies with ethers v5..."
npm install

echo ""
echo "🔍 Verifying ethers version..."
ETHERS_VERSION=$(node -e "console.log(require('./node_modules/ethers/package.json').version)")
echo "Installed ethers version: $ETHERS_VERSION"

if [[ $ETHERS_VERSION != 5.* ]]; then
  echo "⚠️  WARNING: Expected ethers v5 but found v$ETHERS_VERSION"
  echo "Run: npm install ethers@5.7.2"
  exit 1
fi

echo ""
echo "🏗️  Building for production..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Test locally:     npm run preview"
echo "  2. Deploy to Vercel: vercel --prod"
echo "  3. Or deploy to:     netlify deploy --prod"
echo ""
echo "🔗 Build output: ./dist/"
echo ""

