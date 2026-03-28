#!/bin/bash
# Setup script for ENSAM Student OS deployment

echo "🚀 ENSAM Student OS - Deployment Setup"
echo "========================================"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v)"

# Install dependencies
echo ""
echo "📦 Installing backend dependencies..."
npm install

echo ""
echo "📦 Installing frontend dependencies..."
cd web && npm install && cd ..

# Generate Prisma client
echo ""
echo "🗄️ Generating Prisma client..."
npx prisma generate

# Check environment
echo ""
echo "🔍 Checking environment variables..."
if [ -f .env ]; then
    echo "✅ .env file found"
    
    # Check required vars
    if grep -q "DATABASE_URL" .env; then
        echo "✅ DATABASE_URL configured"
    else
        echo "⚠️  DATABASE_URL not found in .env"
    fi
    
    if grep -q "CREDENTIALS_MASTER_KEY" .env; then
        echo "✅ CREDENTIALS_MASTER_KEY configured"
    else
        echo "⚠️  CREDENTIALS_MASTER_KEY not found in .env"
    fi
else
    echo "⚠️  .env file not found"
    echo "   Copy .env.example to .env and configure your variables"
fi

echo ""
echo "========================================"
echo "Setup complete! Next steps:"
echo ""
echo "1. Configure environment variables in .env"
echo "2. Run database migrations: npx prisma migrate dev"
echo "3. Start development: npm run dev (backend) + cd web && npm run dev (frontend)"
echo "4. Deploy with: ./deploy.sh"
echo ""
echo "📖 See DEPLOYMENT.md for full instructions"
