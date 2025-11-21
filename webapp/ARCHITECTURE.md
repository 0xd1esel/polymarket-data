# Architecture: The Maximizer v2.0

## ✅ Simple, Stable, Vercel-Optimized

### Design Philosophy

**Single-Request, In-Memory Architecture**
- One POST request → Process → Download
- No job queue, no polling, no filesystem
- Clean, simple, predictable

### Why This Is The Best Approach for Vercel

1. **Serverless-Native**
   - Vercel functions are stateless and ephemeral
   - No shared filesystem between requests
   - Perfect fit for in-memory processing

2. **Simple User Experience**
   - User clicks "Fetch" → File downloads
   - No intermediate steps
   - Immediate feedback

3. **No State Management**
   - No job tracking
   - No status polling
   - No cleanup needed

4. **Cost-Effective**
   - Single function execution per request
   - No wasted polling requests
   - Pay only for actual processing time

## Architecture Components

### Frontend (React/Next.js)
```
app/page.tsx
├── User enters slug
├── Clicks "Fetch"
├── POST /api/fetch (shows loading)
└── Downloads file → Thank you screen
```

### Backend (Next.js API Route)
```
app/api/fetch/route.ts
├── Receives slug
├── Fetches market data (Gamma API)
├── Fetches fills data (Subgraph)
├── Processes data (binary grouping, net actions)
├── Generates Excel in memory (exceljs)
└── Returns buffer as downloadable file
```

### Data Processing Layer
```
lib/
├── gammaClient.ts       # Polymarket Gamma API
├── subgraphClient.ts    # GraphQL subgraph queries
├── dataProcessor.ts     # Process fills, calculate prices
├── excelGenerator.ts    # In-memory Excel generation
├── cacheManager.ts      # /tmp cache (per-instance)
└── types.ts             # TypeScript interfaces
```

## Request Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │
     │ 1. POST /api/fetch {slug}
     ▼
┌─────────────────┐
│  Next.js API    │
│  Route Handler  │
└────┬────────────┘
     │
     │ 2. Fetch Market Data
     ▼
┌─────────────────┐
│  Gamma API      │ ─── Market metadata, token IDs
└────┬────────────┘
     │
     │ 3. Fetch Fills Data
     ▼
┌─────────────────┐
│  Subgraph API   │ ─── Historical fills (paginated)
└────┬────────────┘
     │
     │ 4. Process Data
     ▼
┌─────────────────┐
│ Data Processor  │ ─── Binary grouping, net actions
└────┬────────────┘
     │
     │ 5. Generate Excel
     ▼
┌─────────────────┐
│ Excel Generator │ ─── In-memory workbook creation
└────┬────────────┘
     │
     │ 6. Return Buffer
     ▼
┌─────────────────┐
│  HTTP Response  │ ─── Content-Type: xlsx, direct download
└────┬────────────┘
     │
     │ 7. Download & Thank You
     ▼
┌─────────┐
│  User   │
└─────────┘
```

## File Generation (In-Memory)

```typescript
// ✅ Vercel-Compatible Approach

// 1. Create workbook
const workbook = new ExcelJS.Workbook();

// 2. Add sheets
workbook.addWorksheet('Summary');
workbook.addWorksheet('Market 1');
// ... more sheets

// 3. Generate buffer
const buffer = await workbook.xlsx.writeBuffer();

// 4. Return as HTTP response
return new NextResponse(buffer, {
  headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename="file.xlsx"'
  }
});
```

## Naming Consistency

### Sheet Names
Matches original implementation exactly:

**Binary Markets:**
```
baseName directly → "Cowboys vs. Raiders OU 50.5"
```

**Non-Binary Markets:**
```
"market - outcome" → "Spread Cowboys (-3.5) - Cowboys"
```

**Sanitization:**
- Remove: `/\?*[]:` characters
- Truncate: 31 characters max
- Smart truncation: Keep outcome, shorten market name

### File Names
```
{slug}_combined.xlsx
```
Example: `nfl-dal-lv-2025-11-17_combined.xlsx`

## Performance

**Typical Processing Times:**
- Small market (5-10 tokens): 3-5 seconds
- Medium market (20-30 tokens): 8-12 seconds
- Large market (50+ tokens): 15-25 seconds

**Optimizations:**
- Parallel token fetching (5 concurrent)
- Retry logic with exponential backoff
- Efficient memory management
- /tmp caching for warm instances

## Vercel Configuration

**vercel.json:**
```json
{
  "functions": {
    "app/api/fetch/route.ts": {
      "maxDuration": 60,     // 60s for Pro, 10s for Free
      "memory": 1024          // 1GB RAM
    }
  }
}
```

**Free Tier Adaptation:**
- Change `maxDuration` to `10`
- Most markets complete < 10s
- Upgrade to Pro for heavier usage

## Error Handling

**Graceful Failures:**
- Invalid slug → 400 error
- API timeout → Retry with backoff
- No tokens found → Clear error message
- Processing error → Full error details

**User Experience:**
- Loading spinner during processing
- Error message displayed inline
- Can retry immediately

## Caching Strategy

**Local /tmp Cache:**
- Stores fetched market data
- Ephemeral (per function instance)
- Reduces redundant API calls
- Automatic on function warm-up

**Cache Location:**
```
/tmp/polymarket-cache/
├── fills_{slug}.json
└── market_{slug}.json
```

## Stability Features

1. **No Race Conditions**
   - Single-threaded execution per request
   - No shared state between requests

2. **No Cleanup Required**
   - Memory released after request
   - No orphaned files
   - No stale job states

3. **Predictable Performance**
   - Execution time = data size
   - No polling overhead
   - No intermediate storage

4. **Type Safety**
   - Full TypeScript coverage
   - Compile-time error detection
   - IDE autocomplete

## Deployment

**One Command:**
```bash
cd webapp
npx vercel
```

**Auto-Configuration:**
- Next.js detected automatically
- Edge functions configured
- Environment optimized

**Zero Config:**
- No environment variables needed
- No database setup
- No external services

## Monitoring

**Vercel Dashboard Shows:**
- Function execution time
- Memory usage
- Error logs
- Request count

**Debug Logs:**
```
[slug] Starting fetch...
[slug] Fetching market data...
[slug] Fetching fills for N tokens...
[slug] Processing fills...
[slug] Generating Excel workbook...
  ✓ Sheet 1: Market Name (N fills)
  ✓ Sheet 2: Market Name (N fills)
[slug] Done! Generated X bytes
```

## Why This Beats Alternatives

### ❌ Alternative 1: File Storage + Download Endpoint
**Problems:**
- Requires persistent storage (S3, database)
- Two API calls (generate + download)
- Cleanup logic needed
- More complex state management

### ❌ Alternative 2: Job Queue + Polling
**Problems:**
- Need Redis or similar for queue
- Polling creates extra requests
- State management complexity
- Harder to debug

### ✅ Our Approach: In-Memory + Direct Return
**Benefits:**
- Single API call
- No external dependencies
- Simple, predictable flow
- Perfect for Vercel

## Summary

**This architecture is:**
- ✅ Simple (single endpoint)
- ✅ Stable (no race conditions)
- ✅ Vercel-optimized (serverless-native)
- ✅ Type-safe (full TypeScript)
- ✅ Performant (in-memory processing)
- ✅ Cost-effective (pay per execution)
- ✅ Maintainable (clear separation of concerns)

**Ready to deploy!** 🚀

