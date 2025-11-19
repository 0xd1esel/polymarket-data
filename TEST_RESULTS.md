# Test Results - NFL Event

## Test Command
```bash
npm run fetch -- nfl-dal-lv-2025-11-17
```

## ✅ Results

### Event Details
- **Slug**: `nfl-dal-lv-2025-11-17`
- **Title**: Cowboys vs. Raiders
- **Markets**: 27 different betting markets
- **Total Tokens**: 54 (27 markets × 2 outcomes each)

### Data Fetched
- **Total Fills**: 17,810 transactions
- **Time Range**: November 10-17, 2025
- **Buy Trades**: 15,769
- **Sell Trades**: 2,041

### Markets Included
- Main game: Cowboys vs. Raiders (Moneyline, Spreads, Over/Under)
- First Half: Spreads, Over/Under, Moneyline
- Team Totals: Multiple O/U lines for both teams
  - Cowboys: 16.5, 17.5, 18.5, 21.5, 26.5, 27.5, 30.5, 33.5
  - Raiders: 12.5, 13.5, 16.5, 19.5, 21.5, 22.5, 23.5, 31.5

### Output Files

#### 1. Detailed CSV (`output/nfl-dal-lv-2025-11-17.csv`)
- **Size**: 6.5 MB
- **Rows**: 17,810 fills
- **Columns**:
  - Timestamp (PST & Unix)
  - Outcome (market + outcome)
  - Side (BUY/SELL)
  - Price (0-1 range)
  - Amount
  - Transaction Hash
  - Order Hash
  - Maker/Taker addresses
  - Token ID
  - Fee

**Sample Row**:
```csv
2025-11-17 22:16:57 PST,1763446617,Raiders Team Total: O/U 22.5 - Over,BUY,0.001,527,0x6aa40e1523477280506a21f399de1d44368a8707adabb3b51c0e1cbac6828055,...
```

#### 2. Summary CSV (`output/nfl-dal-lv-2025-11-17_summary.csv`)
- Aggregated statistics per market outcome
- Total/Avg volume
- Min/Max/Avg/Current prices

**Example Summary**:
```csv
Spread: Cowboys (-3.5) - Cowboys,3215,6865666.71,2135.51,0.020000,0.999000,0.526511,0.999000
```

### Cached Data

#### 1. Raw Market Data (`cache/market_nfl-dal-lv-2025-11-17.json`)
- **Size**: 101 KB
- Full event metadata with all 27 markets

#### 2. Raw Fills Data (`cache/fills_nfl-dal-lv-2025-11-17.json`)
- **Size**: 13 MB
- All 17,810 fill events for all 54 tokens
- Can be reprocessed without hitting APIs again

## Performance

### Parallel Processing
- Fetched 54 tokens concurrently (max 5 concurrent requests)
- Rate limit handling with exponential backoff
- GraphQL pagination (1000 items per page)

### Timing
- Market fetch: ~2 seconds
- Fills fetch: ~3-4 minutes (54 tokens × multiple pages each)
- Processing & export: ~10 seconds

## Key Features Demonstrated

✅ **Event Support**: Handles event slugs (not just individual markets)  
✅ **Multi-Market**: Processes all markets within an event  
✅ **Token Extraction**: Parses `clobTokenIds` JSON arrays  
✅ **Parallel Fetching**: Concurrent API calls with semaphore  
✅ **Rate Limiting**: Automatic retry with exponential backoff  
✅ **Caching**: Raw data cached for reprocessing  
✅ **Price Calculation**: Correctly computes fill prices from maker/taker amounts  
✅ **Timezone Conversion**: Unix timestamps → PST/PDT  
✅ **CSV Export**: Both detailed and summary formats  
✅ **Statistics**: Comprehensive output statistics  

## Usage

### Fetch data (uses cache if available):
```bash
npm run fetch -- nfl-dal-lv-2025-11-17
```

### Force fresh fetch:
```bash
npm run fetch -- nfl-dal-lv-2025-11-17 --no-cache
```

### Regenerate CSV from cache:
```bash
npm run fetch -- nfl-dal-lv-2025-11-17 --skip-fetch
```

## Next Steps

The tool is production-ready and can handle:
- ✅ Event slugs (like this NFL game)
- ✅ Individual market slugs
- ✅ Multiple markets within events
- ✅ Large datasets (17K+ fills)
- ✅ Rate limiting and errors

You can now fetch any Polymarket event or market!

