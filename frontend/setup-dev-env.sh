#!/bin/bash

# Safe Token Swap - Development Environment Setup
# This script sets up mock data to avoid CORS issues during development

echo "🔧 Setting up Safe Token Swap for development..."
echo ""

# Create .env file with mock data enabled
cat > .env << EOF
# Safe Token Swap - Development Configuration
# Created by setup-dev-env.sh

# Use mock data for development (no API key needed)
VITE_USE_MOCK_POOLS=true

# For production, get a free API key from https://thegraph.com/studio/
# and uncomment the line below:
# VITE_GRAPH_API_KEY=your_api_key_here
EOF

echo "✅ Created .env file with mock data enabled"
echo ""
echo "📝 Configuration:"
echo "   - Mock pools: ENABLED"
echo "   - This uses fake data for testing the UI"
echo "   - Perfect for development without API keys"
echo ""
echo "🚀 Next steps:"
echo "   1. Run: npm run dev"
echo "   2. Open: http://localhost:5173"
echo "   3. Test the swap interface with mock data"
echo ""
echo "📖 For production setup, see: CORS_FIX_GUIDE.md"
echo ""
echo "✨ Done! Ready to start development."

