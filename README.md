# The Maximizer v2.0

A beautiful web app for fetching and analyzing Polymarket data with comprehensive Excel exports.

## Features

- 🎯 **Simple Interface**: Enter a Polymarket slug and fetch complete market data
- 📊 **Binary Market Grouping**: Over/Under and team-based markets are automatically combined
- 📈 **Net Action Analysis**: Clear visibility into directional bets (Over vs Under, Team A vs Team B)
- 📥 **Excel Export**: Professional workbook with multiple sheets and detailed summary
- ⚡ **Real-time Processing**: Live progress updates during data fetch
- 💾 **Smart Caching**: Faster subsequent requests with local caching

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm run server
```

The server will start on `http://localhost:3000`

### 3. Use the App

1. Open your browser to `http://localhost:3000`
2. Enter a Polymarket slug (e.g., `nfl-dal-lv-2025-11-17`)
3. Click "Fetch" and wait for processing
4. Download your Excel file when ready!

## Command Line Usage

You can still use the command-line tool directly:

```bash
npm run fetch -- <market-slug> [--skip-fetch]
```

Example:
```bash
npm run fetch -- nfl-dal-lv-2025-11-17
```

Options:
- `--skip-fetch`: Use cached data if available (faster)

## Output

### Excel Workbook

The generated Excel file includes:

1. **Summary Sheet**: Aggregated statistics for all markets
   - Total Fills, Volume, Prices, Time Range
   - Binary markets grouped (27 rows instead of 54)
   
2. **Individual Sheets**: One per market/binary pair
   - Timestamp (PST with AM/PM)
   - Side (BUY/SELL)
   - Outcome
   - **Net Action** (the actual directional bet)
   - Price, Amount, Transaction Details
   
3. **Comprehensive Notes**: Explanation of data structure and interpretation

### Binary Market Grouping

Markets are intelligently grouped:
- **Over/Under**: Combined into single sheets
- **Team vs Team**: Combined into single sheets  
- **Statistics**: Aggregated across both outcomes

### Net Action Column

Shows the true directional bet:
- `BUY Over` → Net Action: **Over**
- `SELL Over` → Net Action: **Under**
- `BUY Cowboys` → Net Action: **Cowboys**
- `SELL Cowboys` → Net Action: **Raiders**

## Project Structure

```
polymarket-data/
├── src/
│   ├── server.ts           # Express server
│   ├── index.ts            # CLI entry point
│   ├── gammaClient.ts      # Gamma API client
│   ├── subgraphClient.ts   # GraphQL subgraph client
│   ├── dataProcessor.ts    # Data processing logic
│   ├── csvExporter.ts      # CSV export functionality
│   ├── excelExporter.ts    # Excel export functionality
│   ├── cacheManager.ts     # Caching logic
│   ├── config.ts           # Configuration
│   └── types.ts            # TypeScript interfaces
├── public/
│   ├── index.html          # Web app UI
│   ├── style.css           # Styling
│   ├── app.js              # Frontend logic
│   └── celebrate.gif       # Thank you image
├── cache/                  # Cached API responses
└── output/                 # Generated files

```

## API Endpoints

### POST `/api/fetch`
Start a data fetch job
```json
{
  "slug": "nfl-dal-lv-2025-11-17",
  "useCache": true
}
```

### GET `/api/status/:jobId`
Check job status

### GET `/api/download/:filename`
Download the generated Excel file

### GET `/api/health`
Health check

## Data Sources

- **Gamma API**: Market and event metadata
- **Polymarket Subgraph**: Historical fill data via GraphQL
- **Full Pagination**: Ensures complete historical data capture

## Notes

- Each trade appears twice (BUY + SELL) due to Polymarket's event structure
- Summary statistics account for this by dividing counts and volumes by 2
- Timestamps are in PST/PDT with AM/PM format and second precision
- All data is cached locally for faster subsequent requests

## License

MIT
