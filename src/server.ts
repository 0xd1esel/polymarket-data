/**
 * Express server for The Maximizer v2.0
 */

import * as express from 'express';
import * as cors from 'cors';
import * as path from 'path';
import { GammaAPIClient } from './gammaClient';
import { SubgraphClient } from './subgraphClient';
import { FillsProcessor } from './dataProcessor';
import { CSVExporter } from './csvExporter';
import { ExcelExporter } from './excelExporter';
import { CacheManager } from './cacheManager';
import { config } from './config';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize clients
const gammaClient = new GammaAPIClient();
const subgraphClient = new SubgraphClient();
const processor = new FillsProcessor();
const csvExporter = new CSVExporter(config.outputDir);
const excelExporter = new ExcelExporter();
const cacheManager = new CacheManager(config.cacheDir);

// Store for tracking job status
const jobs = new Map<string, { status: string; progress: string; filePath?: string; error?: string }>();

/**
 * Endpoint to fetch market data
 */
app.post('/api/fetch', async (req, res) => {
  const { slug, useCache = true } = req.body;

  if (!slug) {
    return res.status(400).json({ error: 'Market slug is required' });
  }

  const jobId = `${slug}_${Date.now()}`;
  jobs.set(jobId, { status: 'processing', progress: 'Starting...' });

  // Return job ID immediately
  res.json({ jobId, status: 'processing' });

  // Process asynchronously
  try {
    // Update progress
    jobs.set(jobId, { status: 'processing', progress: 'Fetching market data...' });

    // Get market data
    const marketData = await gammaClient.getMarketBySlug(slug);
    const tokenOutcomes = gammaClient.extractTokenIds(marketData);
    const tokenIdArray = Object.keys(tokenOutcomes);

    if (tokenIdArray.length === 0) {
      throw new Error('No tokens found for this market');
    }

    // Fetch fills data
    jobs.set(jobId, { status: 'processing', progress: `Fetching fills for ${tokenIdArray.length} tokens...` });

    let tokenFills;
    if (useCache && cacheManager.hasFillsCache(slug)) {
      const cachedFills = cacheManager.loadFillsData(slug);
      if (cachedFills) {
        tokenFills = cachedFills.token_fills;
      } else {
        tokenFills = await subgraphClient.getMultipleTokenFills(tokenIdArray);
        cacheManager.saveFillsData(slug, tokenFills, tokenOutcomes);
      }
    } else {
      tokenFills = await subgraphClient.getMultipleTokenFills(tokenIdArray);
      cacheManager.saveFillsData(slug, tokenFills, tokenOutcomes);
    }

    // Process fills
    jobs.set(jobId, { status: 'processing', progress: 'Processing and generating Excel...' });

    const processedFills = processor.processMarketFills(tokenFills, tokenOutcomes);

    if (processedFills.length === 0) {
      throw new Error('No fills found for this market');
    }

    // Generate Excel file
    const filePath = await excelExporter.exportToExcel(processedFills, tokenOutcomes, slug);

    // Update job status
    jobs.set(jobId, { 
      status: 'completed', 
      progress: 'Done!', 
      filePath: path.basename(filePath)
    });

  } catch (error: any) {
    console.error('Error processing market:', error);
    jobs.set(jobId, { 
      status: 'error', 
      progress: 'Failed', 
      error: error.message || 'Unknown error occurred'
    });
  }
});

/**
 * Endpoint to check job status
 */
app.get('/api/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

/**
 * Endpoint to download the Excel file
 */
app.get('/api/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(config.outputDir, filename);

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      res.status(404).json({ error: 'File not found' });
    }
  });
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 The Maximizer v2.0 is running on http://localhost:${PORT}`);
  console.log(`📊 Ready to fetch Polymarket data!\n`);
});

