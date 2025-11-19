# Polymarket Data Fetcher

A TypeScript tool to pull Polymarket trading data and format it into useful CSV files.

## Features

- 🚀 **Parallel Processing**: Fetches data for multiple tokens concurrently
- 💾 **Smart Caching**: Caches raw API responses to avoid redundant requests
- 🔄 **Rate Limit Resilient**: Automatic retry logic with exponential backoff
- 📊 **CSV Export**: Exports formatted data with price, amount, and timestamps
- 🕐 **Timezone Support**: Converts Unix timestamps to PST/PDT
- 📈 **Statistics**: Generates summary statistics for each market

## Installation

```bash
npm install
```

## Usage

### Basic Usage

Fetch data for a market by slug:

```bash
npm run fetch -- will-donald-trump-win-2024-election
```

### Options

```bash
# Don't use cache, fetch fresh data
npm run fetch -- <market-slug> --no-cache

# Use cached data only and regenerate CSV
npm run fetch -- <market-slug> --skip-fetch

# Show help
npm run fetch -- --help
```

## How It Works

1. **Fetch Market Data**: Uses the Polymarket Gamma API to get market information and token IDs
2. **Fetch Fills Data**: Queries the Polymarket subgraph for all order fill events across all tokens in the market
3. **Process Data**: Calculates fill prices, amounts, and formats timestamps
4. **Export to CSV**: Creates detailed and summary CSV files

## Data Architecture

### APIs Used

- **Gamma API**: Market metadata and token information
  - Endpoint: `https://gamma-api.polymarket.com`
  
- **Polymarket Subgraph**: Order fill events and trading data
  - Endpoint: Goldsky GraphQL endpoint

### Caching Strategy

Raw API responses are cached in the `cache/` directory:
- `market_<slug>.json`: Market metadata
- `fills_<slug>.json`: Raw fill events for all tokens

This allows you to:
- Regenerate CSVs with different formatting without re-fetching
- Work offline once data is fetched
- Avoid hitting rate limits during development

### Output Files

Generated CSV files are saved in the `output/` directory:
- `<market-slug>.csv`: Detailed fill-by-fill data
- `<market-slug>_summary.csv`: Aggregated statistics

## CSV Format

### Detailed CSV Columns

| Column | Description |
|--------|-------------|
| `Timestamp (PST)` | Human-readable timestamp in PST/PDT |
| `Timestamp (Unix)` | Unix timestamp |
| `Outcome` | Token outcome (YES/NO) |
| `Side` | Trade side (BUY/SELL) |
| `Price` | Fill price (0-1 range, e.g., 0.65 = 65¢) |
| `Amount` | Token amount traded |
| `Transaction Hash` | Ethereum transaction hash |
| `Order Hash` | Order hash |
| `Maker` | Maker address |
| `Taker` | Taker address |
| `Token ID` | Token/Asset ID |
| `Fee` | Fee amount |

### Summary CSV Columns

- Outcome
- Total Fills
- Total Volume
- Average Volume
- Min/Max/Avg Price
- Current Price (most recent)

## Configuration

Edit `src/config.ts` to customize:

- **Rate Limiting**: Concurrent request limits, retry attempts
- **GraphQL**: Page size for pagination
- **Directories**: Cache and output locations
- **Timezone**: Output timezone for timestamps

## Project Structure

```
src/
├── index.ts           # Main orchestrator script
├── config.ts          # Configuration
├── types.ts           # TypeScript type definitions
├── gammaClient.ts     # Gamma API client
├── subgraphClient.ts  # GraphQL subgraph client
├── dataProcessor.ts   # Data processing & price calculation
├── cacheManager.ts    # Caching layer
└── csvExporter.ts     # CSV export functionality
```

## Building

```bash
npm run build
```

Compiled JavaScript will be in the `dist/` directory.

## Development

Run directly with ts-node:

```bash
npm run dev -- <market-slug>
```

## Rate Limiting & Resilience

The tool is designed to be resilient to rate limits:

- **Exponential Backoff**: Automatically retries with increasing delays
- **Concurrent Limits**: Configurable maximum concurrent requests
- **Pagination**: Fetches data in chunks to avoid timeouts
- **Caching**: Reduces redundant API calls

## Finding Market Slugs

Market slugs can be found in Polymarket URLs:

```
https://polymarket.com/event/will-donald-trump-win-2024-election
                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                    This is the slug
```

Or use the Gamma API to search markets:

```bash
curl https://gamma-api.polymarket.com/markets?limit=10
```

## License

MIT

