# The Maximizer v2.0 - Next.js Web App

A beautiful, modern React web application built with Next.js and Tailwind CSS for fetching and analyzing Polymarket data.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production

```bash
npm run build
npm start
```

## ✨ Features

- **Modern React UI**: Built with Next.js 14 and React 18
- **Beautiful Design**: Tailwind CSS with gradient backgrounds and smooth animations
- **Real-time Updates**: Live progress tracking during data fetch
- **TypeScript**: Fully typed for better developer experience
- **API Routes**: Server-side processing with Next.js API routes
- **Excel Export**: Professional workbooks with multiple sheets
- **Binary Market Grouping**: Intelligent grouping of Over/Under and team markets
- **Net Action Analysis**: Clear visibility into directional bets

## 🎯 How It Works

1. **Enter a Polymarket slug** (e.g., `nfl-dal-lv-2025-11-17`)
2. **Click "Fetch"** - The app fetches market data, processes fills, and generates Excel
3. **Automatic Download** - File downloads immediately when ready
4. **Thank you screen** - Celebration GIF and option to fetch another market

### Architecture

**Vercel-Optimized**:
- Single API endpoint (`/api/fetch`) that processes and returns the Excel file directly
- No filesystem dependencies - everything is generated in memory
- Uses `/tmp` for caching (ephemeral but works for single request)
- Streams Excel file directly to the client
- Max 60s execution time (configurable in `vercel.json`)

## 📁 Project Structure

```
webapp/
├── app/
│   ├── api/
│   │   ├── fetch/route.ts       # Job creation endpoint
│   │   ├── status/[jobId]/route.ts  # Status polling
│   │   └── download/[filename]/route.ts  # File download
│   ├── globals.css              # Tailwind CSS styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main page component
├── lib/
│   ├── gammaClient.ts           # Gamma API client
│   ├── subgraphClient.ts        # GraphQL client
│   ├── dataProcessor.ts         # Data processing
│   ├── excelExporter.ts         # Excel generation
│   ├── csvExporter.ts           # CSV export
│   ├── cacheManager.ts          # Caching logic
│   ├── config.ts                # Configuration
│   └── types.ts                 # TypeScript types
├── public/                      # Static assets
├── next.config.js               # Next.js config
├── tailwind.config.ts           # Tailwind config
└── tsconfig.json                # TypeScript config
```

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Data Fetching**: Axios with retry logic
- **GraphQL**: graphql-request
- **Excel Export**: ExcelJS
- **Date Handling**: date-fns

## 🔧 Configuration

The app uses configuration from `lib/config.ts`:
- API endpoints (Gamma API, Subgraph)
- Cache and output directories
- Timezone settings (PST/PDT)

## 📊 Excel Output

Generated Excel files include:
- **Summary Sheet**: Aggregated statistics (27 grouped binary markets)
- **Individual Sheets**: One per market with Net Action column
- **Comprehensive Notes**: Data explanation and interpretation guide

### Net Action Column

Shows the true directional bet:
- `BUY Over` → **Over**
- `SELL Over` → **Under**
- `BUY Cowboys` → **Cowboys**
- `SELL Cowboys` → **Raiders**

## 🚀 Deployment

### Vercel (Recommended & Optimized)

**One-Click Deploy:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/polymarket-data)

**Or via CLI:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd webapp
vercel
```

**Configuration:**
- The app is fully optimized for Vercel's serverless architecture
- No file system storage needed
- Excel files generated in memory and streamed directly
- Cache stored in `/tmp` (ephemeral, per-request)
- Execution time: 60s max (configurable in `vercel.json`)

**Vercel Free Tier:**
- Change `maxDuration` to `10` in `vercel.json` for free tier
- Most markets process in under 10 seconds

### Other Platforms

The app uses standard Next.js features and can be deployed to:
- **Netlify** - Supports Next.js out of the box
- **AWS Amplify** - Full Next.js support
- **Railway** - One-command deployment
- **Fly.io** - Docker-based deployment
- **Self-hosted** - Use `npm run build && npm start`

**Note**: For non-Vercel platforms, you may need to adjust the `maxDuration` export in `app/api/fetch/route.ts`

## 📝 Environment Variables

No environment variables required! All configuration is built-in.

## 🔄 Data Flow

1. User enters slug → POST `/api/fetch`
2. Server creates job and returns jobId
3. Client polls GET `/api/status/[jobId]` every second
4. Server processes data asynchronously
5. When complete, client navigates to download view
6. User clicks download → GET `/api/download/[filename]`
7. File downloads to user's computer
8. Thank you screen with celebration!

## 🎁 Features in Detail

### Smart Caching
- Cached API responses for faster subsequent requests
- Cache stored in `../cache/` directory
- Automatic cache management

### Binary Market Grouping
- Over/Under markets combined
- Team-based markets (Cowboys vs Raiders) combined
- Summary statistics aggregated across both outcomes

### Real-time Progress
- "Fetching market data..."
- "Fetching fills for N tokens..."
- "Processing and generating Excel..."
- "Done!"

### Error Handling
- Invalid slug detection
- Network error handling
- Graceful failure messages

## 📖 License

MIT

---

Built with ❤️ using Next.js and Tailwind CSS

