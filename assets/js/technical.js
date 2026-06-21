const TECH_RSI_PERIOD = 14;
let technicalRows = [];
let technicalSortState = {
    column: 'marketCap',
    direction: 'asc'
};

document.addEventListener('DOMContentLoaded', () => {
    setupTechnicalSortHandlers();
    setDefaultDateRange();
    fetchTechnicalData();
});

function setupTechnicalSortHandlers() {
    const headers = document.querySelectorAll('#technicalTable th[data-sort-key]');
    headers.forEach(header => {
        header.style.cursor = 'pointer';
        header.title = 'Click to sort';
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sortKey;
            if (technicalSortState.column === sortKey) {
                technicalSortState.direction = technicalSortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                technicalSortState.column = sortKey;
                technicalSortState.direction = 'asc';
            }

            renderTechnicalTable();
        });
    });
}

function setDefaultDateRange() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (365 * 3));

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

async function fetchTechnicalData() {
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

    showLoading(true);
    showError('');

    try {
        const startTimeInMillis = startDate.getTime();
        const endTimeInMillis = endDate.getTime();
        const stocks = [...new Set(NIFTY_100_STOCKS)];
        const sortedStocks = stocks.sort((a, b) => {
            const rankA = MARKET_CAP_RANK[a] ?? Number.MAX_SAFE_INTEGER;
            const rankB = MARKET_CAP_RANK[b] ?? Number.MAX_SAFE_INTEGER;
            return rankA - rankB || a.localeCompare(b);
        });

        const results = await Promise.all(sortedStocks.map(async (stock) => {
            try {
                const proxyUrl = `/api/stock-data?stock=${stock}&startTimeInMillis=${startTimeInMillis}&endTimeInMillis=${endTimeInMillis}`;
                const response = await fetch(proxyUrl);
                if (!response.ok) {
                    throw new Error(`API Error: ${response.status}`);
                }

                const data = await response.json();
                if (!data.candles || data.candles.length === 0) {
                    return null;
                }

                return buildTechnicalRow(stock, data.candles);
            } catch (error) {
                console.warn(`Failed to fetch data for ${stock}:`, error);
                return null;
            }
        }));

        technicalRows = results.filter(Boolean);
        buildTechnicalTable();
        showLoading(false);
    } catch (error) {
        showLoading(false);
        showError(`Error fetching data: ${error.message}`);
    }
}

function buildTechnicalRow(stock, candles) {
    const dailyCandles = candles
        .map(normalizeCandle)
        .filter(Boolean)
        .sort((a, b) => a.timestamp - b.timestamp);

    const closePrices = dailyCandles.map(candle => candle.close);
    const monthlyCloses = aggregateClosesByMonth(dailyCandles);
    const weeklyCloses = aggregateClosesByWeek(dailyCandles);

    const latestClose = closePrices[closePrices.length - 1] ?? null;
    const monthlyRSI = getLatestRSI(monthlyCloses, TECH_RSI_PERIOD);
    const weeklyRSI = getLatestRSI(weeklyCloses, TECH_RSI_PERIOD);
    const dailyRSI = getLatestRSI(closePrices, TECH_RSI_PERIOD);

    const ema200 = getLatestEMA(closePrices, 200);
    const ema100 = getLatestEMA(closePrices, 100);
    const ema50 = getLatestEMA(closePrices, 50);
    const ema20 = getLatestEMA(closePrices, 20);

    return {
        stock,
        monthlyRSI,
        weeklyRSI,
        dailyRSI,
        ema200Distance: calculateDistance(latestClose, ema200),
        ema100Distance: calculateDistance(latestClose, ema100),
        ema50Distance: calculateDistance(latestClose, ema50),
        ema20Distance: calculateDistance(latestClose, ema20)
    };
}

function normalizeCandle(candle) {
    if (!Array.isArray(candle) || candle.length < 5) {
        return null;
    }

    let timestamp = candle[0];
    if (timestamp < 10000000000) {
        timestamp = timestamp * 1000;
    }

    return {
        timestamp,
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5] || 0
    };
}

function aggregateClosesByWeek(candles) {
    const weeklyMap = {};

    candles.forEach(candle => {
        const date = new Date(candle.timestamp);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay() + 1);

        const year = weekStart.getFullYear();
        const month = String(weekStart.getMonth() + 1).padStart(2, '0');
        const day = String(weekStart.getDate()).padStart(2, '0');
        const weekKey = `${year}-${month}-${day}`;

        weeklyMap[weekKey] = candle.close;
    });

    return Object.keys(weeklyMap)
        .sort()
        .map(weekKey => weeklyMap[weekKey]);
}

function aggregateClosesByMonth(candles) {
    const monthlyMap = {};

    candles.forEach(candle => {
        const date = new Date(candle.timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const monthKey = `${year}-${month}`;

        monthlyMap[monthKey] = candle.close;
    });

    return Object.keys(monthlyMap)
        .sort()
        .map(monthKey => monthlyMap[monthKey]);
}

function calculateDistance(closePrice, emaValue) {
    if (!closePrice || !emaValue) {
        return null;
    }

    return ((closePrice - emaValue) / emaValue) * 100;
}

function calculateRSI(values, period = TECH_RSI_PERIOD) {
    if (!Array.isArray(values) || values.length <= period) {
        return values.map(() => null);
    }

    const rsi = Array(values.length).fill(null);
    let gainSum = 0;
    let lossSum = 0;

    for (let i = 1; i <= period; i += 1) {
        const delta = values[i] - values[i - 1];
        gainSum += Math.max(delta, 0);
        lossSum += Math.max(-delta, 0);
    }

    let avgGain = gainSum / period;
    let avgLoss = lossSum / period;

    rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));

    for (let i = period + 1; i < values.length; i += 1) {
        const delta = values[i] - values[i - 1];
        const gain = Math.max(delta, 0);
        const loss = Math.max(-delta, 0);

        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;

        rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));
    }

    return rsi;
}

function getLatestRSI(values, period) {
    const series = calculateRSI(values, period);
    for (let i = series.length - 1; i >= 0; i -= 1) {
        if (series[i] !== null && Number.isFinite(series[i])) {
            return series[i];
        }
    }

    return null;
}

function getLatestEMA(values, period) {
    if (!Array.isArray(values) || values.length < period) {
        return null;
    }

    const emaSeries = calculateEMA(values, period);
    for (let i = emaSeries.length - 1; i >= 0; i -= 1) {
        if (emaSeries[i] !== null && Number.isFinite(emaSeries[i])) {
            return emaSeries[i];
        }
    }

    return null;
}

function buildTechnicalTable() {
    renderTechnicalTable();
}

function renderTechnicalTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    updateTechnicalSortIndicators();

    const rows = getSortedTechnicalRows();

    rows.forEach(rowData => {
        const row = document.createElement('tr');

        const stockCell = document.createElement('td');
        stockCell.className = 'year-col';
        stockCell.textContent = rowData.stock;
        stockCell.title = 'Click to open Sensibull chart';
        stockCell.onclick = () => openSensibullChart(rowData.stock);
        row.appendChild(stockCell);

        row.appendChild(createRsiCell(rowData.monthlyRSI));
        row.appendChild(createRsiCell(rowData.weeklyRSI));
        row.appendChild(createRsiCell(rowData.dailyRSI));
        row.appendChild(createDistanceCell(rowData.ema200Distance));
        row.appendChild(createDistanceCell(rowData.ema100Distance));
        row.appendChild(createDistanceCell(rowData.ema50Distance));
        row.appendChild(createDistanceCell(rowData.ema20Distance));

        tbody.appendChild(row);
    });

    document.getElementById('tableWrapper').style.display = 'block';
}

function getSortedTechnicalRows() {
    const rows = technicalRows.slice();
    const sortKey = technicalSortState.column;
    const direction = technicalSortState.direction === 'desc' ? -1 : 1;

    if (sortKey === 'marketCap') {
        return rows;
    }

    return rows.sort((a, b) => compareTechnicalRows(a, b, sortKey, direction));
}

function compareTechnicalRows(a, b, sortKey, direction) {
    if (sortKey === 'stock') {
        return direction * a.stock.localeCompare(b.stock);
    }

    const valueA = a[sortKey];
    const valueB = b[sortKey];

    if (valueA === null && valueB === null) {
        return a.stock.localeCompare(b.stock);
    }

    if (valueA === null) {
        return 1;
    }

    if (valueB === null) {
        return -1;
    }

    const delta = valueA - valueB;
    if (delta === 0) {
        return a.stock.localeCompare(b.stock);
    }

    return direction * delta;
}

function updateTechnicalSortIndicators() {
    const headers = document.querySelectorAll('#technicalTable th[data-sort-key]');
    headers.forEach(header => {
        const indicator = header.querySelector('.sort-indicator');
        if (!indicator) {
            return;
        }

        if (header.dataset.sortKey === technicalSortState.column && technicalSortState.column !== 'marketCap') {
            indicator.textContent = technicalSortState.direction === 'asc' ? '▲' : '▼';
        } else {
            indicator.textContent = '';
        }
    });
}

function createRsiCell(value) {
    const cell = document.createElement('td');
    cell.className = 'month-cell';

    if (value === null || Number.isNaN(value)) {
        cell.textContent = 'N/A';
        cell.style.backgroundColor = '#f0f0f0';
        cell.style.color = '#666';
        return cell;
    }

    cell.textContent = value.toFixed(1);
    cell.style.backgroundColor = getRsiColor(value);
    cell.style.color = value < 40 || value > 60 ? '#222' : '#333';
    cell.setAttribute('title', `RSI: ${value.toFixed(2)}`);
    return cell;
}

function createDistanceCell(value) {
    const cell = document.createElement('td');
    cell.className = 'month-cell';

    if (value === null || Number.isNaN(value)) {
        cell.textContent = 'N/A';
        cell.style.backgroundColor = '#f0f0f0';
        cell.style.color = '#666';
        return cell;
    }

    const formatted = `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
    cell.textContent = formatted;
    cell.style.backgroundColor = value >= 0 ? '#e2f2e8' : '#f8d7da';
    cell.style.color = value >= 0 ? '#0f5132' : '#842029';
    cell.setAttribute('title', `Distance from close: ${formatted}`);
    return cell;
}

function getRsiColor(rsi) {
    if (rsi < 40) {
        return '#f8d7da';
    }

    if (rsi > 60) {
        return '#d1e7dd';
    }

    return '#f0f0f0';
}