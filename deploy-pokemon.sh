#!/bin/bash
# Deploy Pokemon Wiki to Vercel
# Usage: ./deploy-pokemon.sh [--prod]

set -e  # Exit on error

echo "🎮 Building Pokemon Wiki..."

# Build the wiki
npm run folder -- pokemon --build

echo "✅ Wiki built successfully!"
echo ""
echo "📦 Preparing deployment directory..."

# Create deployment directory
rm -rf deploy-pokemon
mkdir -p deploy-pokemon

# Copy the built wiki
cp pokemon/_build/wiki.html deploy-pokemon/index.html

# Create vercel.json for deployment
cat > deploy-pokemon/vercel.json << 'EOF'
{
  "version": 2,
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
EOF

echo "✅ Deployment directory prepared!"
echo ""
echo "🚀 Deploying to Vercel..."

# Change to deployment directory
cd deploy-pokemon

# Deploy to Vercel
if [ "$1" = "--prod" ]; then
  echo "📡 Deploying to production..."
  npx vercel --prod
else
  echo "📡 Deploying to preview..."
  npxvercel
fi

echo ""
echo "✨ Deployment complete!"
