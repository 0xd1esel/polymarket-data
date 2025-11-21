# 🚀 Start The Maximizer v2.0 Web App

## Quick Start

```bash
cd webapp
npm run dev
```

Then open: **http://localhost:3000**

## What You'll See

### 1. Main Screen
- Large title: **"the maximizer v2.0"**
- Input field: "Enter Polymarket Slug"
- Fetch button (gradient purple)

### 2. Processing
- Loading spinner
- Status message: "Fetching market data..."
- File downloads automatically when ready

### 3. Thank You Screen
- "Thank you for downloading!"
- Celebration GIF
- "Fetch Another" button to start over

## Example Slugs to Try

```
nfl-dal-lv-2025-11-17
will-trump-win-2024
btc-100k-2024
```

## Tech Stack

- ⚛️ **Next.js 14** - React framework
- 🎨 **Tailwind CSS** - Styling
- 📘 **TypeScript** - Type safety
- 📊 **ExcelJS** - Excel generation

## Production Build

```bash
cd webapp
npm run build
npm start
```

## Deployment to Vercel

### Quick Deploy

```bash
cd webapp
npx vercel
```

Follow the prompts:
1. Set up and deploy? **Y**
2. Which scope? (select your account)
3. Link to existing project? **N**
4. Project name? (press enter for default)
5. Directory? `./` (press enter)
6. Override settings? **N**

Your app will be live at: `https://your-project.vercel.app`

### Configuration

The app is **fully optimized for Vercel**:
- ✅ Serverless-ready (no file system dependencies)
- ✅ In-memory Excel generation
- ✅ Direct file streaming
- ✅ 60-second max execution time
- ✅ `/tmp` caching for performance

### Free Tier Limits

Vercel Free tier has 10s execution limit. To use:
1. Edit `vercel.json`
2. Change `maxDuration` from `60` to `10`
3. Most markets complete in under 10 seconds

---

**Enjoy analyzing Polymarket data! 📈**

