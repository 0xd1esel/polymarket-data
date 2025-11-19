#!/bin/bash

# Example script to fetch Polymarket data

echo "Installing dependencies..."
npm install

echo ""
echo "Building TypeScript..."
npm run build

echo ""
echo "Example 1: Fetch data for a market"
echo "npm run fetch -- will-donald-trump-win-2024-election"

echo ""
echo "Example 2: Fetch fresh data (ignore cache)"
echo "npm run fetch -- will-donald-trump-win-2024-election --no-cache"

echo ""
echo "Example 3: Regenerate CSV from cached data"
echo "npm run fetch -- will-donald-trump-win-2024-election --skip-fetch"

echo ""
echo "Ready to use! Run one of the examples above."

