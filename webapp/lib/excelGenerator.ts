/**
 * Excel workbook generation (memory-based, Vercel-compatible)
 */

import * as ExcelJS from 'exceljs';
import { ProcessedFill, TokenOutcomes } from './types';

export async function createExcelWorkbook(
  workbook: ExcelJS.Workbook,
  processedFills: ProcessedFill[],
  tokenOutcomes: TokenOutcomes
): Promise<void> {
  // Group fills by token/outcome
  const fillsByToken: { [key: string]: ProcessedFill[] } = {};

  for (const fill of processedFills) {
    const key = `${fill.outcome}|${fill.token_id}`;
    if (!fillsByToken[key]) {
      fillsByToken[key] = [];
    }
    fillsByToken[key].push(fill);
  }

  // Create summary sheet first
  await createSummarySheet(workbook, fillsByToken);

  // Detect and group binary markets
  const binaryGroups = detectAndGroupBinaryMarkets(fillsByToken);

  // Create a sheet for each group
  let sheetCount = 0;

  for (const group of binaryGroups) {
    let fills = group.fills;

    // For binary markets, add net_action to each fill
    if (group.isBinary) {
      const outcomeSet = new Set(fills.map(f => f.outcome.split(' - ').pop() || ''));
      const uniqueOutcomes = Array.from(outcomeSet);
      const oppositesMap = uniqueOutcomes.length === 2 ? {
        [uniqueOutcomes[0]]: uniqueOutcomes[1],
        [uniqueOutcomes[1]]: uniqueOutcomes[0]
      } : {};

      fills = fills.map(fill => {
        const net_action = calculateNetAction(fill.side, fill.outcome, group.baseName, oppositesMap);
        return { ...fill, net_action };
      });
    }

    // For binary markets, use the base name; for non-binary, use full outcome
    let displayName: string;
    if (group.isBinary) {
      displayName = group.baseName;
    } else {
      displayName = fills[0].outcome;
    }

    // Create sheet name (matching original logic exactly)
    let sheetName: string;
    if (group.isBinary) {
      // For binary markets, use the base name directly
      sheetName = displayName;
    } else {
      // For non-binary, parse and use the full name
      const parts = displayName.split(' - ');
      const market = parts.slice(0, -1).join(' - ');
      const outcomeOnly = parts[parts.length - 1];
      if (parts.length > 1) {
        sheetName = `${market} - ${outcomeOnly}`;
      } else {
        sheetName = displayName;
      }
    }

    // Sanitize and ensure unique name
    sheetName = sanitizeSheetName(sheetName);

    // Ensure uniqueness
    let finalName = sheetName;
    let counter = 1;
    while (workbook.getWorksheet(finalName)) {
      finalName = `${sheetName.substring(0, 28)}_${counter}`;
      counter++;
    }

    console.log(`  ✓ Sheet ${sheetCount + 1}: ${finalName} (${fills.length} fills)`);
    const worksheet = workbook.addWorksheet(finalName);

    // Build header based on whether net_action is present
    const hasNetAction = fills.some(f => f.net_action !== undefined);
    const headers = [
      'Timestamp (PST)',
      'Timestamp (Unix)',
      'Side',
      'Outcome',
    ];

    if (hasNetAction) {
      headers.push('Net Action');
    }

    headers.push(
      'Price',
      'Amount',
      'Transaction Hash',
      'Order Hash',
      'Maker',
      'Taker',
      'Token ID',
      'Fee'
    );

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A90E2' }
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    for (const fill of fills) {
      const row: any[] = [
        fill.timestamp_pst,
        fill.timestamp_unix,
        fill.side,
        fill.outcome,
      ];

      if (hasNetAction) {
        row.push(fill.net_action || '');
      }

      row.push(
        fill.price,
        fill.amount,
        fill.transaction_hash,
        fill.order_hash,
        fill.maker,
        fill.taker,
        fill.token_id,
        fill.fee
      );

      worksheet.addRow(row);
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, cell => {
        const cellValue = cell.value ? cell.value.toString() : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });

    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    sheetCount++;
    console.log(`  ✓ Sheet ${sheetCount}: ${finalName} (${fills.length} fills)`);
  }
}

function createSummarySheet(
  workbook: ExcelJS.Workbook,
  fillsByToken: { [key: string]: ProcessedFill[] }
): void {
  const worksheet = workbook.addWorksheet('Summary', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  // Header
  const headerRow = worksheet.addRow([
    'Market',
    'Total Fills',
    'Total Volume',
    'Avg Volume',
    'Min Price',
    'Max Price',
    'Avg Price',
    'Current Price',
    'Earliest Fill',
    'Latest Fill'
  ]);

  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF34A853' }
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Group by binary markets
  const binaryGroups = detectAndGroupBinaryMarkets(fillsByToken);
  binaryGroups.sort((a, b) => b.fills.length - a.fills.length);

  for (const group of binaryGroups) {
    const fills = group.fills;
    const volumes = fills.map(f => f.amount);
    const prices = fills.map(f => f.price);

    // Each trade appears twice (BUY + SELL), so divide by 2
    const totalVolume = volumes.reduce((a, b) => a + b, 0) / 2;
    const actualFillCount = fills.length / 2;
    const avgVolume = totalVolume / actualFillCount;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const currentPrice = fills[0].price;

    let displayName: string;
    if (group.isBinary) {
      displayName = group.baseName;
    } else {
      const outcome = fills[0].outcome;
      const parts = outcome.split(' - ');
      const market = parts.slice(0, -1).join(' - ');
      const outcomeOnly = parts[parts.length - 1];
      if (parts.length > 1) {
        displayName = `${market} - ${outcomeOnly}`;
      } else {
        displayName = outcome;
      }
    }

    worksheet.addRow([
      displayName,
      actualFillCount,
      parseFloat(totalVolume.toFixed(2)),
      parseFloat(avgVolume.toFixed(2)),
      parseFloat(minPrice.toFixed(6)),
      parseFloat(maxPrice.toFixed(6)),
      parseFloat(avgPrice.toFixed(6)),
      parseFloat(currentPrice.toFixed(6)),
      fills[fills.length - 1].timestamp_pst,
      fills[0].timestamp_pst
    ]);
  }

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: true }, cell => {
      const cellValue = cell.value ? cell.value.toString() : '';
      maxLength = Math.max(maxLength, cellValue.length);
    });
    column.width = Math.min(Math.max(maxLength + 2, 12), 50);
  });

  // Add notes section
  addNotesSection(worksheet);
}

function addNotesSection(worksheet: ExcelJS.Worksheet): void {
  const notesStartRow = worksheet.rowCount + 3;

  const notesHeaderRow = worksheet.getRow(notesStartRow);
  notesHeaderRow.getCell(1).value = '📋 IMPORTANT NOTES';
  notesHeaderRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1E88E5' } };
  notesHeaderRow.height = 25;

  const notes = [
    '',
    '1. DUPLICATE TRADES: Each trade appears TWICE in the raw data (once as BUY, once as SELL). This is because Polymarket\'s',
    '   subgraph emits two OrderFilled events per trade - one from each side. The summary statistics above account for this',
    '   by dividing fill counts and volumes by 2 to show actual trading activity.',
    '',
    '2. VOLUME CALCULATION: "Total Volume" represents the actual amount traded. Individual sheets show both sides of each trade,',
    '   so if you sum amounts directly from those sheets, divide by 2 for accurate volume.',
    '',
    '3. PRICES: Prices are displayed as decimals (e.g., 0.65 = 65% probability). Min/Max/Avg prices are calculated across',
    '   all fills and reflect market movement over time.',
    '',
    '4. TIMESTAMPS: All timestamps are in Pacific Time (PST/PDT) with AM/PM format and second precision. Unix timestamps',
    '   are also provided for programmatic analysis.',
    '',
    '5. CURRENT PRICE: Represents the most recent fill price (latest chronologically) for each outcome.',
    '',
    '6. TRANSACTION HASH: Blockchain transaction identifier. Same hash with different order hashes = same transaction filling',
    '   multiple orders.',
    '',
    '7. ORDER HASH: Unique identifier for each individual order. Different from transaction hash.',
    '',
    '8. DATA SOURCE: All data pulled from Polymarket\'s official subgraph via GraphQL queries with full pagination to ensure',
    '   complete historical data capture.',
    '',
    '9. BINARY MARKET GROUPING: Binary markets (Over/Under, Cowboys/Raiders, etc.) are combined into single rows in the',
    '   summary and single sheets in the workbook. Statistics aggregate data from both outcomes. Individual sheets include',
    '   a "Net Action" column showing the true directional bet:',
    '   • BUY + Outcome "Over" → Net Action: "Over" (betting on Over)',
    '   • SELL + Outcome "Over" → Net Action: "Under" (selling Over = betting on Under)',
    '   • BUY + Outcome "Cowboys" → Net Action: "Cowboys" (betting on Cowboys)',
    '   • SELL + Outcome "Cowboys" → Net Action: "Raiders" (selling Cowboys = betting on Raiders)',
    '   The "Side" column shows whether tokens were bought or sold, while "Net Action" shows the actual bet direction.',
  ];

  let currentRow = notesStartRow + 1;
  notes.forEach(note => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = note;
    row.getCell(1).font = { size: 10 };
    if (note.startsWith('1.') || note.startsWith('2.') || note.startsWith('3.') ||
        note.startsWith('4.') || note.startsWith('5.') || note.startsWith('6.') ||
        note.startsWith('7.') || note.startsWith('8.') || note.startsWith('9.')) {
      row.getCell(1).font = { size: 10, bold: true };
    }
    currentRow++;
  });

  // Merge cells for notes section
  for (let i = notesStartRow; i < currentRow; i++) {
    worksheet.mergeCells(i, 1, i, 10);
  }
}

function detectAndGroupBinaryMarkets(
  fillsByToken: { [key: string]: ProcessedFill[] }
): Array<{ fills: ProcessedFill[]; isBinary: boolean; baseName: string }> {
  const groups: Array<{ fills: ProcessedFill[]; isBinary: boolean; baseName: string }> = [];
  const processed = new Set<string>();

  const outcomeMap: { [outcome: string]: string[] } = {};
  for (const key of Object.keys(fillsByToken)) {
    const outcome = key.split('|')[0];
    if (!outcomeMap[outcome]) {
      outcomeMap[outcome] = [];
    }
    outcomeMap[outcome].push(key);
  }

  const outcomes = Object.keys(outcomeMap);

  for (let i = 0; i < outcomes.length; i++) {
    if (processed.has(outcomes[i])) continue;

    const outcome1 = outcomes[i];
    const parts1 = outcome1.split(' - ');
    const base1 = parts1.slice(0, -1).join(' - ');
    const suffix1 = parts1[parts1.length - 1];

    let foundPair = false;
    for (let j = i + 1; j < outcomes.length; j++) {
      if (processed.has(outcomes[j])) continue;

      const outcome2 = outcomes[j];
      const parts2 = outcome2.split(' - ');
      const base2 = parts2.slice(0, -1).join(' - ');
      const suffix2 = parts2[parts2.length - 1];

      if (base1 === base2 && suffix1 !== suffix2) {
        const isBinaryPair = (
          (suffix1.includes('Over') && suffix2.includes('Under')) ||
          (suffix1.includes('Under') && suffix2.includes('Over')) ||
          (suffix1.includes('Yes') && suffix2.includes('No')) ||
          (suffix1.includes('No') && suffix2.includes('Yes')) ||
          (base1 !== '' && suffix1 !== '' && suffix2 !== '')
        );

        if (isBinaryPair) {
          const combinedFills: ProcessedFill[] = [];
          for (const key of outcomeMap[outcome1]) {
            combinedFills.push(...fillsByToken[key]);
          }
          for (const key of outcomeMap[outcome2]) {
            combinedFills.push(...fillsByToken[key]);
          }

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

function calculateNetAction(
  side: string,
  outcome: string,
  baseName: string,
  oppositesMap: { [key: string]: string } = {}
): string {
  const parts = outcome.split(' - ');
  const outcomeOnly = parts[parts.length - 1];

  if (side === 'BUY') {
    return outcomeOnly;
  } else {
    return oppositesMap[outcomeOnly] || outcomeOnly;
  }
}

function sanitizeSheetName(name: string): string {
  // Remove special characters (including colons)
  let sanitized = name.replace(/[/\\?*[\]:]/g, '');

  // Replace common separators with spaces for readability
  sanitized = sanitized.replace(/_-_/g, ' - ');

  // Truncate to 31 characters
  if (sanitized.length > 31) {
    // Try to keep the most important part
    // Format: "market - outcome"
    const parts = sanitized.split(' - ');
    if (parts.length >= 2) {
      const outcome = parts[parts.length - 1];
      const availableLength = 31 - outcome.length - 3; // " - " = 3 chars
      if (availableLength > 5) {
        const market = parts.slice(0, -1).join(' - ').substring(0, availableLength);
        sanitized = `${market} - ${outcome}`;
      } else {
        // Just take the outcome if market name is too long
        sanitized = outcome.substring(0, 31);
      }
    } else {
      sanitized = sanitized.substring(0, 31);
    }
  }

  return sanitized;
}

