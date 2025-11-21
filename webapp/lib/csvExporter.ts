/**
 * CSV export functionality for processed fills data
 */

import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { config } from './config';
import { ProcessedFill } from './types';

export class CSVExporter {
  private outputDir: string;

  constructor(outputDir?: string) {
    this.outputDir = outputDir || config.outputDir;
    this.ensureOutputDir();
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Sanitize market slug for use in filenames
   */
  private sanitizeSlug(slug: string): string {
    return slug.replace(/[/\\]/g, '_').replace(/\s+/g, '_');
  }

  /**
   * Calculate net action for binary markets
   * Simple rule: BUY = betting on outcome, SELL = betting on opposite outcome
   */
  private calculateNetAction(
    side: string,
    outcome: string,
    baseName: string,
    oppositesMap: { [key: string]: string } = {}
  ): string {
    // Extract the outcome (last part after " - ")
    const parts = outcome.split(' - ');
    const outcomeOnly = parts[parts.length - 1];

    if (side === 'BUY') {
      // BUY = betting on this outcome
      return outcomeOnly;
    } else {
      // SELL = betting on the opposite outcome
      return oppositesMap[outcomeOnly] || outcomeOnly;
    }
  }

  /**
   * Detect binary markets and group them together
   */
  private detectAndGroupBinaryMarkets(
    fillsByToken: { [key: string]: ProcessedFill[] }
  ): Array<{ fills: ProcessedFill[]; isBinary: boolean; baseName: string }> {
    const groups: Array<{ fills: ProcessedFill[]; isBinary: boolean; baseName: string }> = [];
    const processed = new Set<string>();

    // Get unique outcomes
    const outcomeMap: { [outcome: string]: string[] } = {};
    for (const key of Object.keys(fillsByToken)) {
      const outcome = key.split('|')[0];
      if (!outcomeMap[outcome]) {
        outcomeMap[outcome] = [];
      }
      outcomeMap[outcome].push(key);
    }

    const outcomes = Object.keys(outcomeMap);

    // Check for binary pairs
    for (let i = 0; i < outcomes.length; i++) {
      if (processed.has(outcomes[i])) continue;

      const outcome1 = outcomes[i];
      const parts1 = outcome1.split(' - ');
      const base1 = parts1.slice(0, -1).join(' - ');
      const suffix1 = parts1[parts1.length - 1];

      // Look for a matching opposite outcome
      let foundPair = false;
      for (let j = i + 1; j < outcomes.length; j++) {
        if (processed.has(outcomes[j])) continue;

        const outcome2 = outcomes[j];
        const parts2 = outcome2.split(' - ');
        const base2 = parts2.slice(0, -1).join(' - ');
        const suffix2 = parts2[parts2.length - 1];

        // Check if they share the same base and have opposite suffixes
        if (base1 === base2 && suffix1 !== suffix2) {
          const isBinaryPair = (
            (suffix1.includes('Over') && suffix2.includes('Under')) ||
            (suffix1.includes('Under') && suffix2.includes('Over')) ||
            (suffix1.includes('Yes') && suffix2.includes('No')) ||
            (suffix1.includes('No') && suffix2.includes('Yes')) ||
            // Any other case where they share the same base but different suffixes
            // (e.g., "Cowboys" vs "Raiders" for moneyline/spread markets)
            (base1 !== '' && suffix1 !== '' && suffix2 !== '')
          );

          if (isBinaryPair) {
            // Combine both outcomes into one group
            const combinedFills: ProcessedFill[] = [];
            for (const key of outcomeMap[outcome1]) {
              combinedFills.push(...fillsByToken[key]);
            }
            for (const key of outcomeMap[outcome2]) {
              combinedFills.push(...fillsByToken[key]);
            }

            // Sort by timestamp (most recent first)
            combinedFills.sort((a, b) => parseInt(b.timestamp_unix) - parseInt(a.timestamp_unix));

            groups.push({
              fills: combinedFills,
              isBinary: true,
              baseName: base1,
            });

            processed.add(outcome1);
            processed.add(outcome2);
            foundPair = true;
            break;
          }
        }
      }

      // If no pair found, add as individual outcome
      if (!foundPair) {
        const fills: ProcessedFill[] = [];
        for (const key of outcomeMap[outcome1]) {
          fills.push(...fillsByToken[key]);
        }
        fills.sort((a, b) => parseInt(b.timestamp_unix) - parseInt(a.timestamp_unix));

        groups.push({
          fills,
          isBinary: false,
          baseName: outcome1,
        });
        processed.add(outcome1);
      }
    }

    return groups;
  }

  /**
   * Get the output CSV file path
   */
  getOutputPath(marketSlug: string, suffix: string = ''): string {
    const sanitized = this.sanitizeSlug(marketSlug);
    const filename = suffix ? `${sanitized}_${suffix}.csv` : `${sanitized}.csv`;
    return path.join(this.outputDir, filename);
  }

  /**
   * Export processed fills to CSV (combined file)
   */
  async exportToCSV(
    processedFills: ProcessedFill[],
    marketSlug: string,
    outputPath?: string
  ): Promise<string | null> {
    if (processedFills.length === 0) {
      console.log('No fills to export!');
      return null;
    }

    const filePath = outputPath || this.getOutputPath(marketSlug);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'timestamp_pst', title: 'Timestamp (PST)' },
        { id: 'timestamp_unix', title: 'Timestamp (Unix)' },
        { id: 'outcome', title: 'Outcome' },
        { id: 'side', title: 'Side' },
        { id: 'price', title: 'Price' },
        { id: 'amount', title: 'Amount' },
        { id: 'transaction_hash', title: 'Transaction Hash' },
        { id: 'order_hash', title: 'Order Hash' },
        { id: 'maker', title: 'Maker' },
        { id: 'taker', title: 'Taker' },
        { id: 'token_id', title: 'Token ID' },
        { id: 'fee', title: 'Fee' },
      ],
    });

    await csvWriter.writeRecords(processedFills);

    const stats = fs.statSync(filePath);
    console.log(`\nExported ${processedFills.length} fills to: ${filePath}`);
    console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);

    return filePath;
  }

  /**
   * Export separate CSV files per token (or combined for binary markets)
   */
  async exportPerToken(
    processedFills: ProcessedFill[],
    marketSlug: string
  ): Promise<string[]> {
    if (processedFills.length === 0) {
      console.log('No fills to export!');
      return [];
    }

    // Group fills by token
    const fillsByToken: { [key: string]: ProcessedFill[] } = {};
    
    for (const fill of processedFills) {
      const key = `${fill.outcome}|${fill.token_id}`;
      if (!fillsByToken[key]) {
        fillsByToken[key] = [];
      }
      fillsByToken[key].push(fill);
    }

    // Detect binary markets and group them
    const binaryGroups = this.detectAndGroupBinaryMarkets(fillsByToken);

    const exportedFiles: string[] = [];

    console.log(`\nExporting ${binaryGroups.length} separate CSV files...`);

    for (const group of binaryGroups) {
      let fills = group.fills;
      
      // For binary markets, add net_action to each fill
      if (group.isBinary) {
        // Extract both possible outcomes from the fills to determine opposites
        const outcomeSet = new Set(fills.map(f => f.outcome.split(' - ').pop() || ''));
        const uniqueOutcomes = Array.from(outcomeSet);
        const oppositesMap = uniqueOutcomes.length === 2 ? {
          [uniqueOutcomes[0]]: uniqueOutcomes[1],
          [uniqueOutcomes[1]]: uniqueOutcomes[0]
        } : {};
        
        fills = fills.map(fill => {
          const net_action = this.calculateNetAction(fill.side, fill.outcome, group.baseName, oppositesMap);
          return { ...fill, net_action };
        });
      }
      
      let filename: string;
      if (group.isBinary) {
        // For binary markets, use the base name directly
        const cleanBaseName = group.baseName
          .replace(/[^a-zA-Z0-9\s\-]/g, '') // Remove special chars except dash
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .replace(/_+/g, '_') // Remove duplicate underscores
          .replace(/^_|_$/g, '') // Remove leading/trailing underscores
          .toLowerCase();
        filename = `${marketSlug}_${cleanBaseName}.csv`;
      } else {
        // For non-binary, parse market name and outcome
        const displayName = fills[0].outcome;
        const parts = displayName.split(' - ');
        const market = parts.slice(0, -1).join(' - ');
        const outcomeOnly = parts[parts.length - 1];
        
        const cleanMarket = market
          .replace(/[^a-zA-Z0-9\s\-]/g, '') // Remove special chars except dash
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .replace(/_+/g, '_') // Remove duplicate underscores
          .replace(/^_|_$/g, '') // Remove leading/trailing underscores
          .toLowerCase();
        
        const cleanOutcome = outcomeOnly
          .replace(/[^a-zA-Z0-9\s\-]/g, '') // Remove special chars except dash
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .replace(/_+/g, '_') // Remove duplicate underscores
          .replace(/^_|_$/g, '') // Remove leading/trailing underscores
          .toLowerCase();
        
        filename = `${marketSlug}_${cleanMarket}_${cleanOutcome}.csv`;
      }

      const filePath = path.join(this.outputDir, filename);

      // Build header based on whether net_action is present
      const hasNetAction = fills.some(f => f.net_action !== undefined);
      const header = [
        { id: 'timestamp_pst', title: 'Timestamp (PST)' },
        { id: 'timestamp_unix', title: 'Timestamp (Unix)' },
        { id: 'side', title: 'Side' },
        { id: 'outcome', title: 'Outcome' },
      ];

      if (hasNetAction) {
        header.push({ id: 'net_action', title: 'Net Action' });
      }

      header.push(
        { id: 'price', title: 'Price' },
        { id: 'amount', title: 'Amount' },
        { id: 'transaction_hash', title: 'Transaction Hash' },
        { id: 'order_hash', title: 'Order Hash' },
        { id: 'maker', title: 'Maker' },
        { id: 'taker', title: 'Taker' },
        { id: 'token_id', title: 'Token ID' },
        { id: 'fee', title: 'Fee' },
      );

      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header,
      });

      await csvWriter.writeRecords(fills);
      
      const stats = fs.statSync(filePath);
      const displayName = group.isBinary ? group.baseName : fills[0].outcome;
      const label = group.isBinary ? `${displayName} (Binary)` : displayName;
      console.log(`  ${label}: ${fills.length} fills (${(stats.size / 1024).toFixed(2)} KB)`);
      
      exportedFiles.push(filePath);
    }

    console.log(`\nTotal files exported: ${exportedFiles.length}`);

    return exportedFiles;
  }

  /**
   * Export a summary CSV with aggregated statistics
   */
  async exportSummary(
    processedFills: ProcessedFill[],
    marketSlug: string
  ): Promise<string | null> {
    if (processedFills.length === 0) {
      console.log('No fills to summarize!');
      return null;
    }

    // Group by outcome
    const byOutcome: { [outcome: string]: ProcessedFill[] } = {};
    for (const fill of processedFills) {
      if (!byOutcome[fill.outcome]) {
        byOutcome[fill.outcome] = [];
      }
      byOutcome[fill.outcome].push(fill);
    }

    // Calculate statistics
    const summaryData = Object.entries(byOutcome).map(([outcome, fills]) => {
      const amounts = fills.map(f => f.amount);
      const prices = fills.map(f => f.price);

      return {
        outcome,
        total_fills: fills.length,
        total_volume: amounts.reduce((a, b) => a + b, 0).toFixed(2),
        avg_volume: (amounts.reduce((a, b) => a + b, 0) / amounts.length).toFixed(2),
        min_price: Math.min(...prices).toFixed(6),
        max_price: Math.max(...prices).toFixed(6),
        avg_price: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(6),
        current_price: fills[0].price.toFixed(6), // Most recent
      };
    });

    const filePath = this.getOutputPath(marketSlug, 'summary');

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'outcome', title: 'Outcome' },
        { id: 'total_fills', title: 'Total Fills' },
        { id: 'total_volume', title: 'Total Volume' },
        { id: 'avg_volume', title: 'Avg Volume' },
        { id: 'min_price', title: 'Min Price' },
        { id: 'max_price', title: 'Max Price' },
        { id: 'avg_price', title: 'Avg Price' },
        { id: 'current_price', title: 'Current Price' },
      ],
    });

    await csvWriter.writeRecords(summaryData);

    console.log(`Exported summary to: ${filePath}`);

    return filePath;
  }

  /**
   * Print statistics about the processed fills
   */
  printStatistics(processedFills: ProcessedFill[]): void {
    if (processedFills.length === 0) {
      console.log('No fills to analyze!');
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('FILLS STATISTICS');
    console.log('='.repeat(60));

    console.log(`\nTotal Fills: ${processedFills.length}`);

    // Group by outcome
    const byOutcome: { [outcome: string]: ProcessedFill[] } = {};
    for (const fill of processedFills) {
      if (!byOutcome[fill.outcome]) {
        byOutcome[fill.outcome] = [];
      }
      byOutcome[fill.outcome].push(fill);
    }

    console.log('\nBy Outcome:');
    for (const [outcome, fills] of Object.entries(byOutcome)) {
      const totalVolume = fills.reduce((sum, f) => sum + f.amount, 0);
      const avgPrice = fills.reduce((sum, f) => sum + f.price, 0) / fills.length;
      const prices = fills.map(f => f.price);

      console.log(`  ${outcome}:`);
      console.log(`    Fills: ${fills.length}`);
      console.log(`    Total Volume: ${totalVolume.toFixed(2)}`);
      console.log(`    Avg Price: $${avgPrice.toFixed(4)}`);
      console.log(`    Current Price: $${fills[0].price.toFixed(4)}`);
      console.log(`    Min Price: $${Math.min(...prices).toFixed(4)}`);
      console.log(`    Max Price: $${Math.max(...prices).toFixed(4)}`);
    }

    // By side
    const buys = processedFills.filter(f => f.side === 'BUY').length;
    const sells = processedFills.filter(f => f.side === 'SELL').length;

    console.log('\nBy Side:');
    console.log(`  BUY: ${buys}`);
    console.log(`  SELL: ${sells}`);

    // Time range
    if (processedFills.length > 0) {
      console.log('\nTime Range:');
      console.log(`  Earliest: ${processedFills[processedFills.length - 1].timestamp_pst}`);
      console.log(`  Latest: ${processedFills[0].timestamp_pst}`);
    }

    console.log('='.repeat(60) + '\n');
  }
}

