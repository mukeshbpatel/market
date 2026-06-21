// NIFTY 100 stocks
const NIFTY_100_STOCKS = [
    'TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM', 'LT', 'MARUTI', 'M&M', 'BAJAJ-AUTO',
    'HEROMOTOCO', 'EICHER', 'APOLLOHOSP', 'KOTAKBANK', 'AXISBANK', 'HDFCBANK', 'ICICIBANK', 'SBIN',
    'RELIANCE', 'JSWSTEEL', 'TATASTEEL', 'HINDALCO', 'VEDL', 'SHRIRAMFIN', 'HDFC', 'LIC',
    'POWERGRID', 'NTPC', 'ADANIPORTS', 'ADANIENT', 'ITC', 'BRITANNIA', 'NESTLEIND', 'GODREJCP',
    'PIDILITIND', 'COLPAL', 'MARICO', 'SUNPHARMA', 'CIPLA', 'DRREDDY', 'PHARMEASY', 'IPCALAB',
    'BAJAJFINSV', 'SBILIFE', 'HDFCLIFE', 'ICICIPRULI', 'TITAN', 'ULTRACEMCO', 'GRASIM', 'AIRTELLORIG',
    'BHARTIARTL', 'JIOFINANCE', 'YESBANK', 'DLF', 'SOBHA', 'PRESTIGE', 'SUNTV', 'PAGEIND',
    'TATAMOTORS', 'BAJAJFINSV', 'NYKAA', 'NABIL', 'DLDMLTD', 'APOLLOTYRE', 'MRF', 'CUMMINSIND',
    'BHEL', 'GAIL', 'IOC', 'BPCL', 'HPCL', 'COALINDIA', 'NMDC', 'TATACHEM',
    'INDIGO', 'SPICEJET', 'MAHABANK', 'PNB', 'BANKBARODA', 'UNIONBANK', 'IRFC', 'HUDCO',
    'SIEMENS', 'ABB', 'VOLTAS', 'WHIRLPOOL', 'HAVELLS', 'SYMPHONY', 'BOMDYEING', 'KALYANNVRTH', 'INDIAVIX'
];

const MARKET_CAP_ORDER = [
    'RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'HDFC', 'INFY', 'KOTAKBANK', 'ITC', 'BHARTIARTL',
    'SBIN', 'AXISBANK', 'LT', 'MARUTI', 'NESTLEIND', 'HDFCLIFE', 'SBILIFE', 'LIC', 'TITAN',
    'ULTRACEMCO', 'BAJAJFINSV', 'EICHER', 'BRITANNIA', 'APOLLOHOSP', 'SUNPHARMA', 'DRREDDY',
    'POWERGRID', 'NTPC', 'ADANIENT', 'ADANIPORTS', 'JSWSTEEL', 'TATASTEEL', 'TATAMOTORS', 'M&M',
    'HINDALCO', 'HCLTECH', 'WIPRO', 'TECHM', 'HAVELLS', 'GODREJCP', 'MARICO', 'PIDILITIND',
    'COLPAL', 'CIPLA', 'VEDL', 'BPCL', 'IOC', 'HPCL', 'COALINDIA', 'TATACHEM', 'SUNTV',
    'PAGEIND', 'DLF', 'SOBHA', 'PRESTIGE', 'NYKAA', 'JIOFINANCE', 'AIRTELLORIG', 'YESBANK',
    'PNB', 'BANKBARODA', 'UNIONBANK', 'IRFC', 'MAHABANK', 'BHEL', 'GAIL', 'NMDC', 'APOLLOTYRE',
    'MRF', 'CUMMINSIND', 'INDIGO', 'SPICEJET', 'SIEMENS', 'ABB', 'VOLTAS', 'WHIRLPOOL',
    'SYMPHONY', 'BOMDYEING', 'HUDCO', 'NABIL', 'DLDMLTD', 'IPCALAB', 'SHRIRAMFIN',
    'HEROMOTOCO', 'BAJAJ-AUTO', 'INDIAVIX'
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
    if (!document.getElementById('stockSelect')) {
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
        const startTimeInMillis = startDate.getTime();
        const endTimeInMillis = endDate.getTime();

        // Use local backend proxy to bypass CORS restrictions
        const proxyUrl = `/api/stock-data?stock=${stock}&startTimeInMillis=${startTimeInMillis}&endTimeInMillis=${endTimeInMillis}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();

        if (!data.candles || data.candles.length === 0) {
            throw new Error('No data available for this stock');
        }

        processAndDisplayData(data.candles);
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

        const date = new Date(timestamp);
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
    displayStockInfo(candles, candles[0][1], candles[candles.length - 1][4]);
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
                cell.style.backgroundColor = '#f0f0f0';
                cell.style.color = '#999';
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
            yearlyCell.style.backgroundColor = '#f0f0f0';
            yearlyCell.style.color = '#999';
        }
        row.appendChild(yearlyCell);

        tbody.appendChild(row);
    });

    document.getElementById('tableWrapper').style.display = 'block';
}

function getColor(changePercent) {
    const absChange = Math.abs(changePercent);

    if (changePercent === 0) {
        return '#f0f0f0';
    }

    if (changePercent > 0) {
        if (absChange <= 2) return '#d4f8d4';
        if (absChange <= 5) return '#a3eaa3';
        if (absChange <= 10) return '#67d867';
        if (absChange <= 15) return '#33c133';
        if (absChange <= 20) return '#2a9a2a';
        if (absChange <= 25) return '#1f7a1f';
        return '#145f14';
    }

    if (absChange <= 2) return '#fde2e2';
    if (absChange <= 5) return '#f7b7b7';
    if (absChange <= 10) return '#f18a8a';
    if (absChange <= 15) return '#e75d5d';
    if (absChange <= 20) return '#d83c3c';
    if (absChange <= 25) return '#b72525';
    return '#8a1818';
}

function getTextColor(changePercent) {
    if (Math.abs(changePercent) > 25) {
        return '#fff'; // White text for very strong changes with darker backgrounds
    }
    return '#333'; // Dark text for better contrast on light backgrounds
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
        const date = new Date(timestamp);
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
                    up: '#22bb33',
                    down: '#c41e3a',
                    unchanged: '#999'
                }
            }, {
                label: 'EMA 20',
                type: 'line',
                data: emaData,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
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
                        maxTicksLimit: 12
                    }
                },
                y: {
                    beginAtZero: false
                }
            },
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
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
