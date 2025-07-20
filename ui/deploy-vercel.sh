#!/bin/bash

# SocketMetrics Frontend Vercel Deployment Script

echo "🚀 Starting SocketMetrics Frontend Deployment to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the ui directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Check if build was successful
if [ ! -d "build" ]; then
    echo "❌ Build failed. Please check for errors."
    exit 1
fi

echo "✅ Build successful!"

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "🎉 Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Set environment variables in Vercel dashboard:"
echo "   - REACT_APP_API_URL=https://your-backend-url.com"
echo "   - REACT_APP_WS_URL=wss://your-backend-url.com"
echo "2. Deploy your backend to Railway/Render/Heroku"
echo "3. Test the application"
echo ""
echo "📚 See DEPLOYMENT.md for detailed instructions" 