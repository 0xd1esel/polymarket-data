# Quick Start Guide

## Installation

```bash
npm install
```

## Basic Usage

### 1. Fetch data for a market

```bash
npm run fetch -- <market-slug>
```

Example:
```bash
npm run fetch -- will-donald-trump-win-2024-election
```

### 2. What happens:

1. **Fetches market data** from Gamma API (gets token IDs for YES/NO outcomes)
2. **Fetches fill data** from Polymarket subgraph (all trades) - **in parallel** for each token
3. **Processes data** - calculates prices, amounts, formats timestamps
4. **Caches raw data** - saves to `cache/` directory
5. **Exports CSV** - saves to `output/` directory

### 3. Output files:

- `output/<market-slug>.csv` - Detailed fill-by-fill data
- `output/<market-slug>_summary.csv` - Aggregated statistics

## Advanced Usage

### Use cached data (faster)

```bash
# First run fetches and caches
npm run fetch -- will-donald-trump-win-2024-election

# Subsequent runs use cache automatically
npm run fetch -- will-donald-trump-win-2024-election
```

### Force fresh fetch (ignore cache)

```bash
npm run fetch -- will-donald-trump-win-2024-election --no-cache
```

### Regenerate CSV from cached data

If you want to modify the CSV format without re-fetching:

```bash
npm run fetch -- will-donald-trump-win-2024-election --skip-fetch
```

## Finding Market Slugs

Option 1: From Polymarket URL
```
https://polymarket.com/event/will-donald-trump-win-2024-election
                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```

Option 2: Search via API
```bash
curl "https://gamma-api.polymarket.com/markets?limit=10" | jq '.[] | {slug: .slug, question: .question}'
```

## CSV Output Format

### Detailed CSV (`<slug>.csv`)

| Column | Description | Example |
|--------|-------------|---------|
| Timestamp (PST) | Human-readable time | 2024-11-19 10:30:45 PST |
| Timestamp (Unix) | Unix timestamp | 1759713503 |
| Outcome | Token type | YES / NO |
| Side | Trade direction | BUY / SELL |
| Price | Fill price (0-1) | 0.65 (= 65¢) |
| Amount | Tokens traded | 100.00 |
| Transaction Hash | Ethereum tx | 0x56ac346... |
| Order Hash | Order identifier | 0xd4a00c2... |
| Maker | Maker address | 0x6677e36... |
| Taker | Taker address | 0x4bfb41d... |
| Token ID | Asset ID | 86355235... |
| Fee | Fee amount | 0 |

### Summary CSV (`<slug>_summary.csv`)

Aggregated statistics per outcome (YES/NO):
- Total Fills
- Total Volume
- Average Volume
- Min/Max/Avg Price
- Current Price (most recent)

## Price Calculation

Polymarket trades involve two assets:
- **Token** (YES or NO outcome)
- **USDC** (stablecoin, asset ID = "0")

Price calculation:
```
Price = USDC Amount / Token Amount
```

Both amounts are normalized from 6 decimals.

Example:
- If 100 tokens are bought for 65 USDC
- Price = 65/100 = 0.65 (65¢)

## Troubleshooting

### Rate Limits

The tool handles rate limits automatically with:
- Exponential backoff retry
- Configurable concurrent request limits (default: 5)
- Small delays between requests

### No fills found

Some markets may have no trading activity yet. Check if the market is active on Polymarket.

### Cache issues

Clear cache for a specific market:
```bash
rm cache/market_<slug>.json cache/fills_<slug>.json
```

Clear all cache:
```bash
rm -rf cache/
```

## Configuration

Edit `src/config.ts` to customize:

```typescript
export const config = {
  maxConcurrentRequests: 5,  // Parallel requests
  requestTimeout: 30000,      // 30 seconds
  maxRetries: 5,              // Retry attempts
  graphqlPageSize: 1000,      // Items per page
  outputTimezone: 'America/Los_Angeles',  // PST/PDT
};
```

## Development

Run without building:
```bash
npm run dev -- <market-slug>
```

Build TypeScript:
```bash
npm run build
```

Run built version:
```bash
npm start
```

