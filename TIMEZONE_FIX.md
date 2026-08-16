# IST Timezone Fix - Summary

## Problem
API calls were using browser local timezone instead of IST (Indian Standard Time, UTC+5:30), causing data mismatches across all pages.

## Solution
Added IST timezone utilities to convert all date inputs and timestamps to IST before making API calls.

## Changes Made

### 1. Core Utility Functions Added
All affected JavaScript files now include:
```javascript
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes

function convertDateToISTTimestamp(dateString) {
    // Parse date string (YYYY-MM-DD format from input)
    const [year, month, day] = dateString.split('-').map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    // Adjust to IST by subtracting IST offset
    return utcDate.getTime() - IST_OFFSET_MS;
}

function convertISTTimestampToDate(timestamp) {
    // Convert timestamp to date in IST
    return new Date(timestamp + IST_OFFSET_MS);
}
```

### 2. Files Modified

#### `assets/js/app.js`
- Added IST timezone utilities
- Updated `fetchStockData()` to use `convertDateToISTTimestamp()`
- Updated `processAndDisplayData()` to use `convertISTTimestampToDate()`
- Updated `showYearChart()` to use IST conversion

#### `assets/js/rsi.js`
- Added IST timezone utilities
- Updated `groupByWeek()` to use `convertISTTimestampToDate()`
- Updated `groupByMonth()` to use `convertISTTimestampToDate()`

#### `assets/js/technical.js`
- Added IST timezone utilities
- Updated `fetchTechnicalData()` to use `convertDateToISTTimestamp()`
- Updated `aggregateClosesByWeek()` to use `convertISTTimestampToDate()`
- Updated `aggregateClosesByMonth()` to use `convertISTTimestampToDate()`

#### `weekly.html`
- Updated `fetchAllStocksData()` to use `convertDateToISTTimestamp()`
- Updated candle processing to use `convertISTTimestampToDate()`

#### `beta.html`
- Added `getISTTimestamp()` utility
- Updated `fetchSeries()` to use IST-adjusted timestamps

### 3. How It Works

**Before (UTC-based - incorrect):**
```
User selects: 2024-01-01
new Date("2024-01-01") → UTC midnight on 2024-01-01
getTime() → Wrong time for IST
API returns data from wrong date
```

**After (IST-based - correct):**
```
User selects: 2024-01-01
convertDateToISTTimestamp("2024-01-01")
→ IST midnight on 2024-01-01 (UTC 18:30 on 2023-12-31)
→ Correct timestamp sent to API
API returns data for correct IST date
```

## Impact
All pages now consistently use IST timezone:
- ✅ Monthly Tracker (index.html)
- ✅ Weekly Tracker (weekly.html)  
- ✅ RSI Tracker (rsi.html)
- ✅ Technical Analysis (technical.html)
- ✅ Beta Grid (beta.html)
- ✅ Fundamental Analysis (fundamental.html)

## Testing
Verify that:
1. Chart data aligns with expected IST dates
2. Date range selections return data for correct IST period
3. RSI values match expected calculations
4. Weekly/Monthly aggregations are correctly grouped by IST dates
