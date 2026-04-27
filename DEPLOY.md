# Anglotec AI Masterclass

## Cloudflare Pages Deployment Guide

### Step 1: Push to GitHub (2 minutes)

Run these commands in your terminal (replace `YOUR-GITHUB-USERNAME` with your actual GitHub username):

```bash
# 1. Add the GitHub remote
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/anglotec-ai-masterclass.git

# 2. Push the code
git push -u origin main
```

If you don't have a repo yet:
1. Go to https://github.com/new
2. Name it `anglotec-ai-masterclass`
3. Make it **Public**
4. Click **Create repository**
5. Then run the two commands above

---

### Step 2: Connect Cloudflare Pages (3 minutes)

1. Go to **https://dash.cloudflare.com**
2. Sign in
3. In the left sidebar, click **"Pages"**
4. Click **"Create a project"**
5. Click **"Connect to Git"**
6. Select your GitHub account → select the `anglotec-ai-masterclass` repo
7. Click **"Begin setup"**
8. Configure:
   - **Project name:** `anglotec-ai` (or whatever you want)
   - **Production branch:** `main`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist/public`
9. Click **"Save and Deploy"**

Cloudflare will build and deploy automatically. Takes ~2 minutes.

---

### Step 3: Add Your Custom Domain (2 minutes)

1. In your Cloudflare Pages project, click **"Custom domains"**
2. Click **"Set up a custom domain"**
3. Enter your domain (e.g., `anglotecai.com`)
4. Click **"Continue"**
5. Cloudflare will show you DNS records to add
6. Go to **IONOS** → **DNS settings** → add the CNAME record Cloudflare gives you
7. SSL certificate auto-provisions (free)

---

### Step 4: Update Supabase Redirect URL

1. Go to **https://supabase.com/dashboard**
2. Click your project → **Authentication** → **URL Configuration**
3. Set **Site URL** to your custom domain: `https://anglotecai.com`
4. Add `https://anglotecai.com/**` to **Redirect URLs**
5. Click **Save**

This ensures email verification links and password reset links work on your custom domain.

---

### What You'll Have

| Feature | Result |
|---------|--------|
| Domain | `https://anglotecai.com` (your own) |
| Auth | Real Supabase cloud accounts |
| Email verification | Real emails sent |
| SSL | Free auto-renewing certificate |
| CDN | 300+ global locations |
| Cost | **$0** |

---

### Supabase Credentials (already configured in `.env`)

```
VITE_SUPABASE_URL=https://rluiarorxttctkeozmpv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsdWlhcm9yeHR0Y3RrZW96bXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyODk5NDksImV4cCI6MjA5Mjg2NTk0OX0.f5W9PZuPxmoQM8dD4FKGiyZ0n8WGereu4LGyBiFseY4
```

Database tables already created in Supabase. Ready for users worldwide.
