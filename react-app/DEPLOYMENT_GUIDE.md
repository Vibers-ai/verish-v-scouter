# Production Deployment Guide (Vercel)

## Security Notes

### About Supabase Keys
- **ANON Key**: The key in `.env` is safe for production use
  - It's designed to be public and exposed in client-side code
  - Only provides access based on Row Level Security (RLS) policies
  - Cannot bypass security rules

- **SERVICE_ROLE Key**: Never expose this in frontend code!
  - Keep it only in backend/server-side applications
  - It bypasses all RLS policies

## Pre-Deployment Checklist

### 1. Ensure Row Level Security (RLS) is Enabled
```sql
-- Check if RLS is enabled on your tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Enable RLS on influencers table if not already enabled
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;

-- Create appropriate policies for public access
CREATE POLICY "Enable read access for all users" ON influencers
    FOR SELECT USING (true);

-- For write operations, you might want authenticated users only
CREATE POLICY "Enable insert for authenticated users only" ON influencers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### 2. Build for Production
```bash
cd react-app
npm run build
```

This creates an optimized production build in the `dist` folder.

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI (Recommended)

#### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

#### Step 2: Build the Project
```bash
cd react-app
npm run build
```

#### Step 3: Deploy
```bash
vercel
```

Follow the prompts:
- Set up and deploy: `Y`
- Which scope: Select your account
- Link to existing project? `N` (first time) or `Y` (updates)
- Project name: `verish-app` (or your preferred name)
- Directory: `./dist`
- Want to modify settings? `N`

### Option 2: Deploy via GitHub Integration

1. **Push your code to GitHub**
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure:
     - Framework Preset: `Vite`
     - Root Directory: `react-app`
     - Build Command: `npm run build` or leave default
     - Output Directory: `dist`
     - Install Command: `npm install`

3. **Add Environment Variables in Vercel Dashboard**
   - Go to Project Settings → Environment Variables
   - Add:
     ```
     VITE_SUPABASE_URL = your_supabase_url
     VITE_SUPABASE_ANON_KEY = your_anon_key
     ```

### Option 3: Quick Deploy (One Command)

```bash
cd react-app
npx vercel --prod
```

## Environment Variables for Production

The build process will embed environment variables. For production:

1. Create `.env.production` file:
```env
VITE_SUPABASE_URL=https://kygjewfpclmjupygwbiw.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

2. Build with production env:
```bash
npm run build
```

## Additional Configuration for Vercel

### 1. Custom Domain (Optional)
- In Vercel Dashboard → Settings → Domains
- Add your custom domain (e.g., `app.verish.com`)
- Follow DNS configuration instructions

### 2. Environment Variables
- Set in Vercel Dashboard → Settings → Environment Variables
- Or use `.env.production` locally

### 3. Enable CORS in Supabase
- Go to Supabase Dashboard → Settings → API
- Add your Vercel domains:
  - `https://verish-app.vercel.app`
  - `https://your-custom-domain.com`
  - `http://localhost:5173` (for development)

### 4. Analytics & Monitoring
- Vercel provides built-in analytics
- Enable Web Vitals in Vercel Dashboard
- Monitor Supabase usage dashboard

## Vercel Configuration File

Create `vercel.json` in the react-app directory:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

This ensures:
- Correct build process
- SPA routing works (all routes go to index.html)
- Vite optimizations are applied

## Deployment Script for Vercel

Create `deploy.sh` in react-app directory:
```bash
#!/bin/bash
set -e

echo "🚀 Deploying to Vercel..."

# Ensure we're in the right directory
cd "$(dirname "$0")"

echo "📦 Building for production..."
npm run build

echo "☁️ Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

## Summary

Your Supabase ANON key is **safe to deploy** to production.

### Why Vercel?
- **Zero-config deployments** - Works out of the box with Vite
- **Automatic HTTPS** - SSL certificates included
- **Global CDN** - Fast loading worldwide
- **Preview deployments** - Every git push gets a preview URL
- **Easy rollbacks** - One-click to previous versions
- **Built-in analytics** - Web Vitals monitoring
- **Free tier** - Perfect for most projects

### Deployment Checklist
1. ✅ RLS enabled on Supabase tables
2. ✅ Environment variables set in Vercel
3. ✅ CORS configured in Supabase
4. ✅ vercel.json created for SPA routing
5. ✅ Never expose SERVICE_ROLE keys
6. ✅ Monitor usage in both Vercel and Supabase dashboards

### Quick Commands
```bash
# First deployment
cd react-app
vercel

# Update deployment
vercel --prod

# Check deployment status
vercel ls
```