#!/bin/bash

# oneshotcoding Railway Deployment Script
# =======================================

set -e

echo "🚀 oneshotcoding Railway Deployment"
echo "===================================="
echo ""

# Check if railway is installed
if ! command -v railway &> /dev/null && ! npx railway --version &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if logged in
if ! npx railway whoami &> /dev/null; then
    echo "📝 Please login to Railway:"
    npx railway login
fi

echo ""
echo "✅ Logged in as: $(npx railway whoami)"
echo ""

# Create new project
echo "📦 Creating Railway project..."
npx railway init --name oneshotcoding

echo ""
echo "🗄️  Adding PostgreSQL database..."
npx railway add --plugin postgresql

echo ""
echo "⏳ Waiting for database to be ready..."
sleep 5

# Get database URL
echo ""
echo "📋 Getting database connection string..."
DB_URL=$(npx railway variables get DATABASE_URL 2>/dev/null || echo "")

if [ -z "$DB_URL" ]; then
    echo "⚠️  DATABASE_URL not found. Please add PostgreSQL manually in Railway dashboard."
else
    echo "✅ Database URL configured"
fi

echo ""
echo "🔧 Setting up environment variables..."
echo "   You'll need to set these in Railway dashboard:"
echo ""
echo "   API Service:"
echo "   - JWT_SECRET: (generate with: openssl rand -base64 32)"
echo "   - GITHUB_CLIENT_ID: your-github-client-id"
echo "   - GITHUB_CLIENT_SECRET: your-github-client-secret"
echo "   - GITHUB_CALLBACK_URL: https://oneshotcoding-production.up.railway.app/auth/github/callback"
echo "   - FRONTEND_URL: https://oneshotcoding.io"
echo "   - S3_ENDPOINT: https://s3.amazonaws.com"
echo "   - S3_ACCESS_KEY: your-aws-access-key"
echo "   - S3_SECRET_KEY: your-aws-secret-key"
echo "   - S3_BUCKET: your-bucket-name"
echo "   - S3_REGION: us-east-1"
echo ""
echo "   Web Service:"
echo "   - NEXT_PUBLIC_API_URL: https://oneshotcoding-production.up.railway.app"
echo "   - NEXT_PUBLIC_AUTH_URL: https://oneshotcoding-production.up.railway.app"
echo ""

echo "📚 Next steps:"
echo "1. Open Railway dashboard: npx railway open"
echo "2. Add two services manually:"
echo "   - API: Point to apps/api directory"
echo "   - Web: Point to apps/web directory"
echo "3. Set environment variables for each service"
echo "4. Deploy!"
echo ""
echo "🎉 Setup complete!"
