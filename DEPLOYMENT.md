# ENSAM Student OS - Deployment Guide

## 🚀 Live URLs

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | `https://ensam-student-os.vercel.app` |
| Backend API | Railway | `https://ensam-student-os-api.up.railway.app` |
| Database | Railway PostgreSQL | Internal only |

## 📋 Prerequisites

- [Railway](https://railway.app) account (free tier available)
- [Vercel](https://vercel.com) account (free tier available)
- Node.js 18+ installed locally

## 🔧 Backend Deployment (Railway)

### Option 1: Railway CLI (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create project
railway init

# Add PostgreSQL database
railway add --database postgresql

# Deploy
railway up
```

### Option 2: Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add PostgreSQL service: Click "New" → "Database" → "Add PostgreSQL"
5. Set environment variables (see below)
6. Deploy

### Environment Variables (Backend)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `CREDENTIALS_MASTER_KEY` | 32+ char encryption key | `your-super-secret-master-key-min-32-chars` |
| `NODE_ENV` | Environment mode | `production` |

**Note:** Railway auto-generates `DATABASE_URL` when you add PostgreSQL.

### Health Check

After deployment, verify the API:
```bash
curl https://your-app-url.railway.app/health
# Expected: {"status":"ok"}
```

## 🎨 Frontend Deployment (Vercel)

### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to web folder
cd web

# Deploy
vercel --prod
```

### Option 2: Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `web`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist` (or `.next`)
5. Add environment variables (see below)
6. Deploy

### Environment Variables (Frontend)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://ensam-student-os-api.up.railway.app` |

## 🗄️ Database Setup

### Prisma Migration

After first deploy, run migrations:

```bash
# Local development
npx prisma migrate dev

# Production (via Railway CLI)
railway run npx prisma migrate deploy
```

## 🔒 Security Checklist

- [ ] `CREDENTIALS_MASTER_KEY` is 32+ characters and stored securely
- [ ] `DATABASE_URL` uses SSL in production
- [ ] Frontend API URL uses HTTPS
- [ ] CORS is configured for production domains
- [ ] No credentials in code or logs

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/credentials` | Store encrypted credentials |
| GET | `/api/credentials/:userId` | Check if credentials exist |
| DELETE | `/api/credentials/:userId` | Delete credentials |
| POST | `/api/timetable/sync` | Sync timetable from LISE |
| GET | `/api/timetable?userId=xxx` | Get stored timetable slots |

## 🛠️ Troubleshooting

### Database Connection Issues
```bash
# Check Prisma connection
railway run npx prisma db pull
```

### Credentials Encryption Error
- Verify `CREDENTIALS_MASTER_KEY` is set and 32+ characters
- Regenerate if needed: `openssl rand -base64 32`

### Frontend Can't Connect to API
- Check `NEXT_PUBLIC_API_URL` is set correctly
- Ensure CORS allows the Vercel domain
- Verify API health endpoint responds

## 🔄 Updates & Redeploy

### Backend (Railway)
```bash
# Auto-deploy on git push (if configured)
git push origin main

# Or manual deploy
railway up
```

### Frontend (Vercel)
```bash
# Auto-deploy on git push

# Or manual
vercel --prod
```

## 📊 Monitoring

- **Railway Dashboard:** View logs, metrics, and resource usage
- **Vercel Analytics:** Performance and usage stats (enable in project settings)

---

**Last Updated:** March 2026  
**Maintainer:** ENSAM Student OS Team
