// Timezone utility for IST (UTC+5:30)
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds

function convertDateToISTTimestamp(dateString) {
    // Parse date string (YYYY-MM-DD format from input)
    const [year, month, day] = dateString.split('-').map(Number);
    // Create date at midnight UTC
    const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    // Adjust to IST by subtracting IST offset to get the UTC timestamp for midnight IST
    return utcDate.getTime() - IST_OFFSET_MS;
}

function convertISTTimestampToDate(timestamp) {
    // Convert timestamp to date in IST
    const date = new Date(timestamp + IST_OFFSET_MS);
    return date;
}

// NIFTY 100 stocks
const NIFTY_100_STOCKS = [
    'TCS', 'INFY', 'HINDUNILVR', 'WIPRO', 'HCLTECH', 'TECHM', 'LT', 'MARUTI', 'M&M', 'ASIANPAINT', 'BAJAJ-AUTO', 'NESTLEIND', 'ULTRACEMCO',
    'HEROMOTOCO', 'EICHERMOT', 'APOLLOHOSP', 'KOTAKBANK', 'AXISBANK', 'HDFCBANK', 'ICICIBANK', 'SBIN',
    'RELIANCE', 'JSWSTEEL', 'TATASTEEL', 'HINDALCO', 'SHRIRAMFIN', 'BEL', 'LICI', 'ABB',
    'POWERGRID', 'NTPC', 'ADANIPORTS', 'ADANIENT', 'ITC', 'BRITANNIA', 'GODREJCP', 'CIPLA',
    'PIDILITIND', 'COLPAL', 'MARICO', 'SUNPHARMA', 'DRREDDY', 'DIVISLAB', 'IPCALAB', 'AUBANK', 'POLYCAB', 'MRF', 'MUTHOOTFIN', 'CHOLAFIN', 'ALKEM', 'IDEA', 'KPITTECH',
    'BAJAJFINSV', 'SBILIFE', 'HDFCLIFE', 'ICICIPRULI', 'INDUSINDBK', 'TITAN', 'GRASIM', 'TRENT', 'PIIND', 'DMART', 'PERSISTENT',
    'BHARTIARTL', 'JIOFIN', 'YESBANK', 'DLF', 'SOBHA', 'PRESTIGE', 'PAGEIND',
    'BHEL', 'GAIL', 'IOC', 'BPCL', 'HINDPETRO', 'COALINDIA', 'NMDC', 'TATACHEM',
    'MAHABANK', 'PNB', 'BANKBARODA', 'UNIONBANK', 'IRFC', 'HUDCO',
    'SIEMENS', 'VOLTAS', 'WHIRLPOOL', 'HAVELLS', 'SYMPHONY', 'BOMDYEING', 'KALYANKJIL','HAL', 'INDIAVIX'
];

const MARKET_CAP_ORDER = [
    'RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'BEL', 'INFY', 'HINDUNILVR', 'KOTAKBANK', 'ITC', 'BHARTIARTL', 'NESTLEIND',
    'SBIN', 'AXISBANK', 'LT', 'MARUTI', 'ASIANPAINT', 'NESTLEIND', 'HDFCLIFE', 'SBILIFE', 'LICI', 'TITAN',
    'ULTRACEMCO', 'BAJAJFINSV', 'EICHERMOT', 'BRITANNIA', 'APOLLOHOSP', 'SUNPHARMA', 'DRREDDY', 'DIVISLAB', 'POLYCAB', 'TRENT',
    'POWERGRID', 'NTPC', 'ADANIENT', 'ADANIPORTS', 'JSWSTEEL', 'TATASTEEL', 'M&M',
    'HINDALCO', 'HCLTECH', 'WIPRO', 'TECHM', 'HAVELLS', 'GODREJCP', 'MARICO', 'PIDILITIND', 'MRF', 'MUTHOOTFIN', 'PIIND', 'CHOLAFIN', 'ALKEM', 'DMART', 'IDEA', 'KPITTECH', 'PERSISTENT',
    'COLPAL', 'CIPLA', 'BPCL', 'IOC', 'COALINDIA', 'TATACHEM',
    'PAGEIND', 'DLF', 'SOBHA', 'PRESTIGE', 'JIOFIN', 'YESBANK',
    'PNB', 'BANKBARODA', 'UNIONBANK', 'IRFC', 'MAHABANK', 'BHEL', 'GAIL', 'NMDC',
    'SIEMENS', 'ABB', 'VOLTAS', 'WHIRLPOOL',
    'SYMPHONY', 'BOMDYEING', 'HUDCO', 'IPCALAB', 'SHRIRAMFIN',
    'HEROMOTOCO', 'BAJAJ-AUTO','HINDPETRO', 'KALYANKJIL', 'HAL', 'INDIAVIX'
];

const MARKET_CAP_RANK = MARKET_CAP_ORDER.reduce((acc, symbol, index) => {
    acc[symbol] = index;
    return acc;
}, {});

let currentStock = null;
let stockData = {};
let allCandles = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('stockSelect') || !document.getElementById('startDate') || !document.getElementById('endDate')) {
        return;
    }

    populateStockDropdown();
    setDefaultDateRange();
    fetchStockData();
});

function setDefaultDateRange() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const startDate = new Date(2018, 0, 1);
    const endDate = new Date();
    startDateInput.value = formatDate(startDate);
    endDateInput.value = formatDate(endDate);
    endDateInput.max = formatDate(endDate);
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function populateStockDropdown() {
    const select = document.getElementById('stockSelect');
    select.innerHTML = '<option value="">Select a stock...</option>';

    const uniqueStocks = [...new Set(NIFTY_100_STOCKS)];
    const sortedStocks = uniqueStocks.slice().sort((a, b) => {
        const rankA = MARKET_CAP_RANK[a] ?? Number.MAX_SAFE_INTEGER;
        const rankB = MARKET_CAP_RANK[b] ?? Number.MAX_SAFE_INTEGER;
        return rankA - rankB || a.localeCompare(b);
    });

    sortedStocks.forEach(stock => {
        const option = document.createElement('option');
        option.value = stock;
        option.textContent = stock;
        select.appendChild(option);
    });

    if (sortedStocks.length > 0) {
        select.value = sortedStocks[0];
    }
}

async function fetchCandles(stock, startTimeInMillis, endTimeInMillis) {
    if (!stock) {
        throw new Error('Missing stock symbol');
    }
    if (!startTimeInMillis || !endTimeInMillis) {
        throw new Error('Missing start or end time');
    }

    const proxyUrl = `/api/stock-data?stock=${encodeURIComponent(stock)}&startTimeInMillis=${startTimeInMillis}&endTimeInMillis=${endTimeInMillis}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.candles || data.candles.length === 0) {
        throw new Error('No data available for this stock');
    }

    return data.candles;
}

async function mapWithConcurrency(items, concurrency, mapper, onProgress) {
    const results = new Array(items.length);
    let nextIndex = 0;
    let completed = 0;

    async function runWorker() {
        while (nextIndex < items.length) {
            const index = nextIndex++;
            results[index] = await mapper(items[index], index);
            completed += 1;
            onProgress?.(completed, items.length);
        }
    }

    const workerCount = Math.min(Math.max(1, concurrency), items.length);
    await Promise.all(Array.from({ length: workerCount }, runWorker));
    return results;
}

function setLoadingProgress(current, total) {
    const progress = total ? Math.round((current / total) * 100) : 0;
    const progressBar = document.getElementById('loadingProgressBar');
    const progressTrack = progressBar?.parentElement;
    if (!progressBar || !progressTrack) {
        return;
    }

    progressBar.style.width = `${progress}%`;
    progressTrack.setAttribute('aria-valuenow', progress);
}

async function fetchStockData() {
    const stock = document.getElementById('stockSelect').value;
    if (!stock) {
        showError('Please select a stock');
        return;
    }

    const startDateInput = document.getElementById('startDate').value;
    const endDateInput = document.getElementById('endDate').value;
    if (!startDateInput || !endDateInput) {
        showError('Please select both start and end dates');
        return;
    }

    const startDate = new Date(startDateInput);
    const endDate = new Date(endDateInput);
    if (startDate > endDate) {
        showError('Start date must be on or before end date');
        return;
    }

    currentStock = stock;
    showLoading(true);
    showError('');

    try {
        const startTimeInMillis = convertDateToISTTimestamp(startDateInput);
        const endTimeInMillis = convertDateToISTTimestamp(endDateInput);
        const candles = await fetchCandles(stock, startTimeInMillis, endTimeInMillis);
        processAndDisplayData(candles);
        showLoading(false);
    } catch (error) {
        showLoading(false);
        showError(`Error fetching data: ${error.message}`);
    }
}

function processAndDisplayData(candles) {
    allCandles = candles; // Store globally for chart
    candles.sort((a, b) => a[0] - b[0]);

    // Group by month
    const monthlyData = {};
    candles.forEach(candle => {
        // Convert timestamp to milliseconds if needed (Groww API returns seconds)
        let timestamp = candle[0];
        if (timestamp < 10000000000) {
            timestamp = timestamp * 1000; // Convert seconds to milliseconds
        }

        // Convert to IST
        const date = convertISTTimestampToDate(timestamp);
        const year = date.getFullYear();
        const month = date.getMonth();
        const monthKey = `${year}-${month}`;

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                year,
                month,
                open: candle[1],
                close: candle[4],
                high: candle[2],
                low: candle[3]
            };
        } else {
            // Keep first open and last close
            monthlyData[monthKey].close = candle[4];
            monthlyData[monthKey].high = Math.max(monthlyData[monthKey].high, candle[2]);
            monthlyData[monthKey].low = Math.min(monthlyData[monthKey].low, candle[3]);
        }
    });

    // Organize by year
    const yearlyData = {};
    Object.values(monthlyData).forEach(data => {
        if (!yearlyData[data.year]) {
            yearlyData[data.year] = {};
        }
        yearlyData[data.year][data.month] = {
            open: data.open,
            close: data.close,
            high: data.high,
            low: data.low
        };
    });

    // Calculate monthly changes
    const monthlyChanges = {};
    Object.entries(monthlyData).forEach(([key, data]) => {
        const change = ((data.close - data.open) / data.open) * 100;
        monthlyChanges[key] = change;
    });

    // Build table
    buildTable(yearlyData, monthlyChanges, candles);

    // Display stock info
    displayStockInfo(candles, candles[0][4], candles[candles.length - 1][4]);
}

function buildTable(yearlyData, monthlyChanges, candles) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    const years = Object.keys(yearlyData).map(Number).sort((a, b) => a - b);

    years.forEach(year => {
        const row = document.createElement('tr');
        const yearCell = document.createElement('td');
        yearCell.className = 'year-col';
        yearCell.textContent = year;
        yearCell.onclick = () => showYearChart(year);
        row.appendChild(yearCell);

        for (let month = 0; month < 12; month++) {
            const cell = document.createElement('td');
            const monthKey = `${year}-${month}`;

            if (monthlyChanges[monthKey] !== undefined) {
                const change = monthlyChanges[monthKey];
                const monthData = yearlyData[year][month];

                cell.className = 'month-cell';
                cell.textContent = change.toFixed(1);
                cell.setAttribute('data-percent', `${change.toFixed(1)}%`);
                cell.setAttribute('title', `
                    Open: ₹${monthData.open.toFixed(2)}
                    Close: ₹${monthData.close.toFixed(2)}
                    High: ₹${monthData.high.toFixed(2)}
                    Low: ₹${monthData.low.toFixed(2)}
                    Change: ${change.toFixed(2)}%`);

                // Color based on percentage change
                cell.style.backgroundColor = getColor(change);
                cell.style.color = getTextColor(change);
            } else {
                cell.className = 'month-cell neutral';
                cell.textContent = 'N/A';
                cell.style.backgroundColor = '#202c39';
                cell.style.color = '#9aabbd';
            }

            row.appendChild(cell);
        }

        const yearlyCell = document.createElement('td');
        const yearMonths = Object.keys(yearlyData[year]).map(Number).sort((a, b) => a - b);
        if (yearMonths.length > 0) {
            const firstMonth = yearMonths[0];
            const lastMonth = yearMonths[yearMonths.length - 1];
            const startPrice = yearlyData[year][firstMonth].open;
            const endPrice = yearlyData[year][lastMonth].close;
            const yearlyChange = ((endPrice - startPrice) / startPrice) * 100;

            yearlyCell.className = 'month-cell';
            yearlyCell.textContent = yearlyChange.toFixed(1);
            yearlyCell.setAttribute('title', `Year start: ₹${startPrice.toFixed(2)}\nYear end: ₹${endPrice.toFixed(2)}\nChange: ${yearlyChange.toFixed(2)}%`);
            yearlyCell.style.backgroundColor = getColor(yearlyChange);
            yearlyCell.style.color = getTextColor(yearlyChange);
        } else {
            yearlyCell.className = 'month-cell neutral';
            yearlyCell.textContent = 'N/A';
            yearlyCell.style.backgroundColor = '#202c39';
            yearlyCell.style.color = '#9aabbd';
        }
        row.appendChild(yearlyCell);

        tbody.appendChild(row);
    });

    document.getElementById('tableWrapper').style.display = 'block';
}

function getColor(changePercent) {
    const absChange = Math.abs(changePercent);

    if (changePercent === 0) {
        return '#202c39';
    }

    if (changePercent > 0) {
        if (absChange <= 2) return '#162c25';
        if (absChange <= 5) return '#18372b';
        if (absChange <= 10) return '#1a4231';
        if (absChange <= 15) return '#1c4d37';
        if (absChange <= 20) return '#1e583d';
        if (absChange <= 25) return '#206343';
        return '#226e49';
    }

    if (absChange <= 2) return '#342027';
    if (absChange <= 5) return '#40232b';
    if (absChange <= 10) return '#4c2630';
    if (absChange <= 15) return '#582934';
    if (absChange <= 20) return '#642c38';
    if (absChange <= 25) return '#702f3c';
    return '#7c3240';
}

function getTextColor(changePercent) {
    return '#e8f0f5';
}

function displayStockInfo(candles, startPrice, endPrice) {
    const rangeChange = ((endPrice - startPrice) / startPrice) * 100;
    const high = Math.max(...candles.map(c => c[2]));
    const low = Math.min(...candles.map(c => c[3]));

    document.getElementById('currentPrice').textContent = `₹${endPrice.toFixed(2)}`;
    document.getElementById('rangeChange').innerHTML = `
        <span class="${rangeChange > 0 ? 'positive' : 'negative'}">
            ${rangeChange > 0 ? '+' : ''}${rangeChange.toFixed(2)}%
        </span>
    `;
    document.getElementById('rangeHigh').textContent = `₹${high.toFixed(2)}`;
    document.getElementById('rangeLow').textContent = `₹${low.toFixed(2)}`;

    document.getElementById('stockInfo').style.display = 'flex';
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('errorMsg');
    if (message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    } else {
        errorDiv.style.display = 'none';
    }
}

function showYearChart(year) {
    const yearCandles = allCandles.filter(candle => {
        const timestamp = candle[0] < 10000000000 ? candle[0] * 1000 : candle[0];
        const date = convertISTTimestampToDate(timestamp);
        return date.getFullYear() === year;
    });

    if (yearCandles.length === 0) {
        showError('No data available for this year');
        return;
    }

    // Calculate EMA 20
    const closes = yearCandles.map(c => c[4]);
    const ema = calculateEMA(closes, 20);

    // Prepare data
    const candlestickData = yearCandles.map(c => {
        const timestamp = c[0] < 10000000000 ? c[0] * 1000 : c[0];
        return {
            x: timestamp,
            o: c[1],
            h: c[2],
            l: c[3],
            c: c[4]
        };
    });

    const emaData = ema.map((val, i) => {
        const timestamp = yearCandles[i][0] < 10000000000 ? yearCandles[i][0] * 1000 : yearCandles[i][0];
        return { x: timestamp, y: val };
    });

    // Update chart title
    document.getElementById('chartTitle').textContent = `Candlestick Chart for ${year} with EMA 20`;

    // Reset canvas completely
    const chartContainer = document.getElementById('chartContainer');
    const oldCanvas = document.getElementById('yearChart');
    if (oldCanvas) {
        oldCanvas.remove();
    }

    // Create new canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'yearChart';
    canvas.style.width = '100%';
    // Remove fixed height style, let Chart.js handle it

    // Insert after title
    const title = document.getElementById('chartTitle');
    title.insertAdjacentElement('afterend', canvas);

    // Destroy previous chart if exists
    if (window.yearChartInstance) {
        window.yearChartInstance.destroy();
        window.yearChartInstance = null;
    }

    // Create chart
    const ctx = canvas.getContext('2d');
    window.yearChartInstance = new Chart(ctx, {
        type: 'candlestick',
        data: {
            datasets: [{
                label: 'Candlestick',
                data: candlestickData,
                color: {
                    up: '#69c99a',
                    down: '#ed8188',
                    unchanged: '#9aabbd'
                }
            }, {
                label: 'EMA 20',
                type: 'line',
                data: emaData,
                borderColor: '#55b5d0',
                backgroundColor: 'rgba(85, 181, 208, 0.12)',
                fill: false,
                pointRadius: 0,
                borderWidth: 2
            }]
        },
        options: {
            responsive: false,
            width: chartContainer.offsetWidth,
            height: 1000,
            animation: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM yyyy'
                        }
                    },
                    ticks: {
                        color: '#9aabbd',
                        maxTicksLimit: 12
                    },
                    grid: { color: '#263544' }
                },
                y: {
                    beginAtZero: false,
                    ticks: { color: '#9aabbd' },
                    grid: { color: '#263544' }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#d7e1ea' }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#172330',
                    titleColor: '#e6edf4',
                    bodyColor: '#d1dce6',
                    borderColor: '#34485a',
                    borderWidth: 1
                }
            }
        }
    });

    document.getElementById('chartContainer').style.display = 'block';
    document.getElementById('chartContainer').scrollIntoView({ behavior: 'smooth' });
}

function calculateEMA(data, period) {
    if (data.length < period) return data.map(() => null);
    const ema = [];
    const multiplier = 2 / (period + 1);
    let emaVal = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period; // Initial SMA
    ema.push(emaVal);
    for (let i = period; i < data.length; i++) {
        emaVal = (data[i] - emaVal) * multiplier + emaVal;
        ema.push(emaVal);
    }
    // Pad with nulls for the first period-1 values
    while (ema.length < data.length) {
        ema.unshift(null);
    }
    return ema;
}

function openSensibullChart(symbol) {
    if (!symbol) {
        showError('Please select a stock');
        return;
    }

    const url = `https://web.sensibull.com/chart?tradingSymbol=${encodeURIComponent(symbol)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
}
