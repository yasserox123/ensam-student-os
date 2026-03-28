#!/bin/bash
# Deploy script for ENSAM Student OS

echo "🚀 Deploying ENSAM Student OS"
echo "==============================="

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Deploy backend
echo ""
echo "📦 Deploying Backend to Railway..."
railway up

# Check if Railway deploy succeeded
if [ $? -eq 0 ]; then
    echo "✅ Backend deployed successfully!"
    echo "🔗 Railway URL: $(railway status | grep "URL" | awk '{print $2}')"
else
    echo "❌ Backend deployment failed"
    exit 1
fi

# Deploy frontend
echo ""
echo "🎨 Deploying Frontend to Vercel..."
cd web
vercel --prod

# Check if Vercel deploy succeeded
if [ $? -eq 0 ]; then
    echo "✅ Frontend deployed successfully!"
else
    echo "❌ Frontend deployment failed"
    exit 1
fi

cd ..

echo ""
echo "==============================="
echo "✅ Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Update environment variables if needed"
echo "2. Run database migrations: railway run npx prisma migrate deploy"
echo "3. Test the live application"
echo ""
