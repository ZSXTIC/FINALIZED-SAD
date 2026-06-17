# Vercel Deployment Guide

## 🚀 Ready to Deploy!

Your website is now fully configured for Vercel deployment. All configuration files have been created and optimized.

## 📋 What's Been Configured

✅ **vercel.json** - Vercel configuration with proper routing  
✅ **api/index.js** - Serverless function for Vercel  
✅ **package.json** - Updated with build scripts  
✅ **.env.example** - Environment variables template  

## 🛠️ Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Configure for Vercel deployment"
git push origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the configuration

### 3. Configure Environment Variables
In Vercel dashboard → Settings → Environment Variables:

**Required Variables:**
```
SERVICE_MODE=supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
DESIGN_BUCKET=designs
NODE_ENV=production
```

### 4. Deploy!
Click "Deploy" - your site will be live in minutes!

## 🔧 Configuration Details

- **Serverless Function**: `api/index.js` handles all requests
- **Static Files**: All frontend assets served statically
- **SPA Routing**: Proper fallback to index.html
- **Environment Config**: Runtime configuration injected via `/runtime-config.js`

## 🌐 After Deployment

Your site will be available at:
- Primary: `your-project-name.vercel.app`
- Custom domain: Configure in Vercel settings

## 🧪 Testing

- Test all pages load correctly
- Verify API connections to Supabase
- Test admin and user functionality
- Check image uploads work

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Ensure Supabase CORS allows your domain

---

**🎉 Your website is ready for global deployment!**
