# Vercel Setup for AI Visibility Engine

## If you see "Create project" / dashboard instead of the audit form

Your Vercel project is deploying the wrong app. Fix it in 3 steps:

### 1. Open Vercel Project Settings

Go to [vercel.com/dashboard](https://vercel.com/dashboard) → select your project.

### 2. Set Root Directory

- **Settings** → **Build & Development Settings**
- Click **Edit** next to **Root Directory**
- Enter: **`aiso-instrument-main`**
- Save

### 3. Redeploy

- **Deployments** → click **...** on latest → **Redeploy**

---

## Local development

Use `vercel dev`, not `npm run dev`. The latter runs only the frontend and API calls will fail.

**Option A - From parent folder:**
```bash
cd C:\Users\zeb\Desktop\aiso-instrument-main
vercel dev
```

**Option B - From app folder:**
```bash
cd C:\Users\zeb\Desktop\aiso-instrument-main\aiso-instrument-main
vercel dev
```

Ensure Root Directory in Vercel project settings is set to `aiso-instrument-main`.
