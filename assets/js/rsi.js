// RSI Calculator for all stocks - multiple timeframes
let allStocksRSI = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('rsiTableBody')) {
        return;
    }

    fetchAllStocksRSI();
});

async function fetchAllStocksRSI() {
    showLoading(true);
    showError('');

    // Use fixed date range - last 2 years
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear() - 2, endDate.getMonth(), endDate.getDate());

    const startTimeInMillis = startDate.getTime();
    const endTimeInMillis = endDate.getTime();

    // Fetch data for all stocks
    const stocks = MARKET_CAP_ORDER.slice(0, MARKET_CAP_ORDER.length); // All stocks in market cap order
    const rsiResults = [];

    try {
        for (let i = 0; i < stocks.length; i++) {
            const stock = stocks[i];
            try {
                const candles = await fetchCandles(stock, startTimeInMillis, endTimeInMillis);
                const rsiData = calculateAllTimeframeRSI(candles);
                
                rsiResults.push({
                    stock: stock,
                    monthlyRsi: rsiData.monthlyRsi,
                    weeklyRsi: rsiData.weeklyRsi,
                    dailyRsi: rsiData.dailyRsi
                });

                // Update progress
                updateLoadingProgress(i + 1, stocks.length);
            } catch (error) {
                console.log(`Error fetching data for ${stock}: ${error.message}`);
                rsiResults.push({
                    stock: stock,
                    monthlyRsi: null,
                    weeklyRsi: null,
                    dailyRsi: null
                });
            }

            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        displayAllStocksRSI(rsiResults);
        showLoading(false);
    } catch (error) {
        showLoading(false);
        showError(`Error fetching data: ${error.message}`);
    }
}

function calculateAllTimeframeRSI(candles) {
    candles.sort((a, b) => a[0] - b[0]);

    // Group by timeframes
    const dailyCandles = candles;
    const weeklyCandles = groupByWeek(candles);
    const monthlyCandles = groupByMonth(candles);

    // Calculate RSI
    const dailyRSI = calculateRSI(dailyCandles, 14);
    const weeklyRSI = calculateRSI(weeklyCandles, 14);
    const monthlyRSI = calculateRSI(monthlyCandles, 14);

    // Get latest values
    return {
        dailyRsi: getLatestRSI(dailyRSI),
        weeklyRsi: getLatestRSI(weeklyRSI),
        monthlyRsi: getLatestRSI(monthlyRSI)
    };
}

function getLatestRSI(rsiArray) {
    // Find the latest non-null RSI value
    for (let i = rsiArray.length - 1; i >= 0; i--) {
        if (rsiArray[i] !== null) {
            return rsiArray[i];
        }
    }
    return null;
}

function groupByWeek(candles) {
    const weeklyData = {};
    
    candles.forEach(candle => {
        let timestamp = candle[0];
        if (timestamp < 10000000000) {
            timestamp = timestamp * 1000;
        }

        const date = new Date(timestamp);
        const year = date.getFullYear();
        const week = getWeekNumber(date);
        const weekKey = `${year}-${week}`;

        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = {
                timestamp: timestamp,
                open: candle[1],
                high: candle[2],
                low: candle[3],
                close: candle[4]
            };
        } else {
            weeklyData[weekKey].close = candle[4];
            weeklyData[weekKey].high = Math.max(weeklyData[weekKey].high, candle[2]);
            weeklyData[weekKey].low = Math.min(weeklyData[weekKey].low, candle[3]);
        }
    });

    return Object.values(weeklyData).sort((a, b) => a.timestamp - b.timestamp)
        .map(d => [d.timestamp / 1000, d.open, d.high, d.low, d.close]);
}

function groupByMonth(candles) {
    const monthlyData = {};
    
    candles.forEach(candle => {
        let timestamp = candle[0];
        if (timestamp < 10000000000) {
            timestamp = timestamp * 1000;
        }

        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = date.getMonth();
        const monthKey = `${year}-${month}`;

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                timestamp: timestamp,
                open: candle[1],
                high: candle[2],
                low: candle[3],
                close: candle[4]
            };
        } else {
            monthlyData[monthKey].close = candle[4];
            monthlyData[monthKey].high = Math.max(monthlyData[monthKey].high, candle[2]);
            monthlyData[monthKey].low = Math.min(monthlyData[monthKey].low, candle[3]);
        }
    });

    return Object.values(monthlyData).sort((a, b) => a.timestamp - b.timestamp)
        .map(d => [d.timestamp / 1000, d.open, d.high, d.low, d.close]);
}

function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function calculateRSI(candles, period = 14) {
    const rsiValues = [];
    
    for (let i = 0; i < candles.length; i++) {
        if (i < period) {
            rsiValues.push(null);
            continue;
        }

        let gains = 0;
        let losses = 0;

        // Calculate gains and losses over the period
        for (let j = i - period + 1; j <= i; j++) {
            const change = candles[j][4] - candles[j - 1][4]; // close - previous close
            if (change > 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }

        const avgGain = gains / period;
        const avgLoss = losses / period;

        if (avgLoss === 0) {
            rsiValues.push(avgGain > 0 ? 100 : 0);
        } else {
            const rs = avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));
            rsiValues.push(Math.round(rsi * 100) / 100);
        }
    }

    return rsiValues;
}

function displayAllStocksRSI(rsiResults) {
    const container = document.getElementById('rsiTableContainer');
    const tbody = document.getElementById('rsiTableBody');

    tbody.innerHTML = '';
    
    rsiResults.forEach(row => {
        const tr = document.createElement('tr');

        // Stock Symbol cell
        const symbolCell = document.createElement('td');
        symbolCell.textContent = row.stock;
        symbolCell.style.fontWeight = '600';
        tr.appendChild(symbolCell);

        // Monthly RSI cell
        const monthlyCell = document.createElement('td');
        if (row.monthlyRsi !== null) {
            monthlyCell.textContent = row.monthlyRsi.toFixed(2);
            monthlyCell.style.backgroundColor = getMonthlyWeeklyColor(row.monthlyRsi);
        } else {
            monthlyCell.textContent = '-';
        }
        tr.appendChild(monthlyCell);

        // Weekly RSI cell
        const weeklyCell = document.createElement('td');
        if (row.weeklyRsi !== null) {
            weeklyCell.textContent = row.weeklyRsi.toFixed(2);
            weeklyCell.style.backgroundColor = getMonthlyWeeklyColor(row.weeklyRsi);
        } else {
            weeklyCell.textContent = '-';
        }
        tr.appendChild(weeklyCell);

        // Daily RSI cell
        const dailyCell = document.createElement('td');
        if (row.dailyRsi !== null) {
            dailyCell.textContent = row.dailyRsi.toFixed(2);
            dailyCell.style.backgroundColor = getDailyColor(row.dailyRsi);
        } else {
            dailyCell.textContent = '-';
        }
        tr.appendChild(dailyCell);

        tbody.appendChild(tr);
    });

    container.style.display = 'block';
}

function getMonthlyWeeklyColor(rsi) {
    // RSI > 60: shades of green
    if (rsi > 60) {
        // Gradient from light green to dark green based on RSI value
        const intensity = Math.min((rsi - 60) / 40, 1); // 0 to 1 scale
        const red = Math.round(144 - (144 * intensity)); // 144 -> 0
        const green = Math.round(238 - (16 * intensity)); // 238 -> 222
        const blue = Math.round(144 - (144 * intensity)); // 144 -> 0
        return `rgb(${red}, ${green}, ${blue})`;
    }
    return 'transparent';
}

function getDailyColor(rsi) {
    // RSI crossing 50: yellow (48-52 range)
    if (rsi >= 48 && rsi <= 52) {
        return '#FFD700'; // Golden yellow
    }
    // RSI > 60: shades of green
    else if (rsi > 60) {
        const intensity = Math.min((rsi - 60) / 40, 1);
        const red = Math.round(144 - (144 * intensity));
        const green = Math.round(238 - (16 * intensity));
        const blue = Math.round(144 - (144 * intensity));
        return `rgb(${red}, ${green}, ${blue})`;
    }
    // RSI < 40: shades of red
    else if (rsi < 40) {
        const intensity = Math.min((40 - rsi) / 40, 1);
        const red = Math.round(255 * (0.5 + 0.5 * intensity)); // 255
        const green = Math.round(182 - (182 * intensity)); // 182 -> 0
        const blue = Math.round(198 - (198 * intensity)); // 198 -> 0
        return `rgb(${red}, ${green}, ${blue})`;
    }
    return 'transparent';
}

function updateLoadingProgress(current, total) {
    const loading = document.getElementById('loading');
    loading.textContent = `⏳ Fetching data and calculating RSI for all stocks... (${current}/${total})`;
}

function showError(message) {
    const errorMsg = document.getElementById('errorMsg');
    if (message) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
    } else {
        errorMsg.style.display = 'none';
    }
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.style.display = 'block';
    } else {
        loading.style.display = 'none';
    }
}
