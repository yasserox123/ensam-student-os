@echo off
REM Setup script for ENSAM Student OS deployment (Windows)

echo 🚀 ENSAM Student OS - Deployment Setup
echo ========================================

REM Check Node.js version
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js 18+
    exit /b 1
)

for /f "tokens=1 delims=v." %%a in ('node -v') do set NODE_MAJOR=%%a
if %NODE_MAJOR% LSS 18 (
    echo ❌ Node.js 18+ required
    exit /b 1
)

echo ✅ Node.js detected

REM Install dependencies
echo.
echo 📦 Installing backend dependencies...
call npm install

echo.
echo 📦 Installing frontend dependencies...
cd web
call npm install
cd ..

REM Generate Prisma client
echo.
echo 🗄️ Generating Prisma client...
call npx prisma generate

echo.
echo ========================================
echo Setup complete! Next steps:
echo.
echo 1. Configure environment variables in .env
echo 2. Run database migrations: npx prisma migrate dev
echo 3. Start development: npm start (backend) + cd web && npm run dev (frontend)
echo 4. Deploy to Railway/Vercel (see DEPLOYMENT.md)
echo.
echo 📖 See DEPLOYMENT.md for full instructions
pause
