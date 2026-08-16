const TECH_RSI_PERIOD = 14;
const TECH_ENVELOPE_DEFAULT_PERIOD = 200;
const TECH_ENVELOPE_DEFAULT_PERCENT = 14;

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

let technicalRows = [];
let technicalSortState = {
    column: 'marketCap',
    direction: 'asc'
};

// Filter state
let filterState = {
    stockSearch: '',
    monthlyRsiMin: null,
    monthlyRsiMax: null,
    weeklyRsiMin: null,
    weeklyRsiMax: null,
    dailyRsiMin: null,
    dailyRsiMax: null,
    ema20DistMin: null,
    ema20DistMax: null,
    ema50DistMin: null,
    ema50DistMax: null,
    ema100DistMin: null,
    ema100DistMax: null,
    ema200DistMin: null,
    ema200DistMax: null,
    envelopeDistMin: null,
    envelopeDistMax: null
};

let filteredRows = [];

document.addEventListener('DOMContentLoaded', () => {
    setupTechnicalSortHandlers();
    setupFilterHandlers();
    setDefaultDateRange();
    fetchTechnicalData();
});

function setupFilterHandlers() {
    // Add event listeners to all filter inputs
    const filterInputIds = [
        'stockFilter', 'monthlyRsiMin', 'monthlyRsiMax', 'weeklyRsiMin', 'weeklyRsiMax',
        'dailyRsiMin', 'dailyRsiMax', 'ema20DistMin', 'ema20DistMax', 'ema50DistMin',
        'ema50DistMax', 'ema100DistMin', 'ema100DistMax', 'ema200DistMin', 'ema200DistMax',
        'envelopeDistMin', 'envelopeDistMax'
    ];

    filterInputIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', () => {
                updateFilterState();
            });
        }
    });
}

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
        const startTimeInMillis = convertDateToISTTimestamp(startDateInput);
        const endTimeInMillis = convertDateToISTTimestamp(endDateInput);
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

    const envelopeSettings = getEnvelopeSettings();
    const envelopeEma = getLatestEMA(closePrices, envelopeSettings.period);
    const envelopeUpper = envelopeEma ? envelopeEma * (1 + envelopeSettings.percent / 100) : null;
    const envelopeLower = envelopeEma ? envelopeEma * (1 - envelopeSettings.percent / 100) : null;
    const envelopeDistance = calculateEnvelopeDistance(latestClose, envelopeUpper, envelopeLower);

    return {
        stock,
        monthlyRSI,
        weeklyRSI,
        dailyRSI,
        ema200Distance: calculateDistance(latestClose, ema200),
        ema100Distance: calculateDistance(latestClose, ema100),
        ema50Distance: calculateDistance(latestClose, ema50),
        ema20Distance: calculateDistance(latestClose, ema20),
        envelopeDistance
    };
}

function getEnvelopeSettings() {
    const periodInput = parseInt(document.getElementById('envelopePeriod')?.value, 10);
    const percentInput = parseFloat(document.getElementById('envelopePercent')?.value);

    return {
        period: Number.isFinite(periodInput) && periodInput > 0 ? periodInput : TECH_ENVELOPE_DEFAULT_PERIOD,
        percent: Number.isFinite(percentInput) && percentInput >= 0 ? percentInput : TECH_ENVELOPE_DEFAULT_PERCENT
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
        const date = convertISTTimestampToDate(candle.timestamp);
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
        const date = convertISTTimestampToDate(candle.timestamp);
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

function calculateEnvelopeDistance(closePrice, envelopeUpper, envelopeLower) {
    if (!closePrice || !envelopeUpper || !envelopeLower) {
        return null;
    }

    if (closePrice >= envelopeUpper) {
        return ((closePrice - envelopeUpper) / envelopeUpper) * 100;
    }

    if (closePrice <= envelopeLower) {
        return ((closePrice - envelopeLower) / envelopeLower) * 100;
    }

    return 0;
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
    // Show filters section when table is ready
    const filtersSection = document.getElementById('filtersSection');
    if (filtersSection) {
        filtersSection.style.display = 'block';
    }

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
        row.appendChild(createDistanceCell(rowData.envelopeDistance));

        if (isOutsideEnvelope(rowData)) {
            row.classList.add('outside-envelope');
        }

        tbody.appendChild(row);
    });

    document.getElementById('tableWrapper').style.display = 'block';
}

function isOutsideEnvelope(rowData) {
    return rowData.envelopeDistance !== null && rowData.envelopeDistance !== 0;
}

function getSortedTechnicalRows() {
    // Use filtered rows if filters are active, otherwise use all rows
    const rowsToSort = filteredRows.length > 0 || Object.values(filterState).some(v => v) ?
        filteredRows : technicalRows;
    const rows = rowsToSort.slice();
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

// Filter Functions
function updateFilterState() {
    filterState.stockSearch = document.getElementById('stockFilter')?.value.toUpperCase().trim() || '';
    filterState.monthlyRsiMin = parseFloat(document.getElementById('monthlyRsiMin')?.value) || null;
    filterState.monthlyRsiMax = parseFloat(document.getElementById('monthlyRsiMax')?.value) || null;
    filterState.weeklyRsiMin = parseFloat(document.getElementById('weeklyRsiMin')?.value) || null;
    filterState.weeklyRsiMax = parseFloat(document.getElementById('weeklyRsiMax')?.value) || null;
    filterState.dailyRsiMin = parseFloat(document.getElementById('dailyRsiMin')?.value) || null;
    filterState.dailyRsiMax = parseFloat(document.getElementById('dailyRsiMax')?.value) || null;
    filterState.ema20DistMin = parseFloat(document.getElementById('ema20DistMin')?.value) || null;
    filterState.ema20DistMax = parseFloat(document.getElementById('ema20DistMax')?.value) || null;
    filterState.ema50DistMin = parseFloat(document.getElementById('ema50DistMin')?.value) || null;
    filterState.ema50DistMax = parseFloat(document.getElementById('ema50DistMax')?.value) || null;
    filterState.ema100DistMin = parseFloat(document.getElementById('ema100DistMin')?.value) || null;
    filterState.ema100DistMax = parseFloat(document.getElementById('ema100DistMax')?.value) || null;
    filterState.ema200DistMin = parseFloat(document.getElementById('ema200DistMin')?.value) || null;
    filterState.ema200DistMax = parseFloat(document.getElementById('ema200DistMax')?.value) || null;
    filterState.envelopeDistMin = parseFloat(document.getElementById('envelopeDistMin')?.value) || null;
    filterState.envelopeDistMax = parseFloat(document.getElementById('envelopeDistMax')?.value) || null;
}

function applyFilters() {
    updateFilterState();
    filteredRows = technicalRows.filter(row => passesFilters(row));
    renderTechnicalTable();
    displayFilterResultCount();
}

function resetFilters() {
    // Clear all filter inputs
    document.getElementById('stockFilter').value = '';
    document.getElementById('monthlyRsiMin').value = '';
    document.getElementById('monthlyRsiMax').value = '';
    document.getElementById('weeklyRsiMin').value = '';
    document.getElementById('weeklyRsiMax').value = '';
    document.getElementById('dailyRsiMin').value = '';
    document.getElementById('dailyRsiMax').value = '';
    document.getElementById('ema20DistMin').value = '';
    document.getElementById('ema20DistMax').value = '';
    document.getElementById('ema50DistMin').value = '';
    document.getElementById('ema50DistMax').value = '';
    document.getElementById('ema100DistMin').value = '';
    document.getElementById('ema100DistMax').value = '';
    document.getElementById('ema200DistMin').value = '';
    document.getElementById('ema200DistMax').value = '';
    document.getElementById('envelopeDistMin').value = '';
    document.getElementById('envelopeDistMax').value = '';

    // Reset filter state
    filterState = {
        stockSearch: '',
        monthlyRsiMin: null,
        monthlyRsiMax: null,
        weeklyRsiMin: null,
        weeklyRsiMax: null,
        dailyRsiMin: null,
        dailyRsiMax: null,
        ema20DistMin: null,
        ema20DistMax: null,
        ema50DistMin: null,
        ema50DistMax: null,
        ema100DistMin: null,
        ema100DistMax: null,
        ema200DistMin: null,
        ema200DistMax: null,
        envelopeDistMin: null,
        envelopeDistMax: null
    };

    filteredRows = [];
    renderTechnicalTable();
    displayFilterResultCount();
}

function passesFilters(row) {
    // Stock search filter
    if (filterState.stockSearch && !row.stock.includes(filterState.stockSearch)) {
        return false;
    }

    // Monthly RSI filter
    if (row.monthlyRSI !== null) {
        if (filterState.monthlyRsiMin !== null && row.monthlyRSI < filterState.monthlyRsiMin) {
            return false;
        }
        if (filterState.monthlyRsiMax !== null && row.monthlyRSI > filterState.monthlyRsiMax) {
            return false;
        }
    }

    // Weekly RSI filter
    if (row.weeklyRSI !== null) {
        if (filterState.weeklyRsiMin !== null && row.weeklyRSI < filterState.weeklyRsiMin) {
            return false;
        }
        if (filterState.weeklyRsiMax !== null && row.weeklyRSI > filterState.weeklyRsiMax) {
            return false;
        }
    }

    // Daily RSI filter
    if (row.dailyRSI !== null) {
        if (filterState.dailyRsiMin !== null && row.dailyRSI < filterState.dailyRsiMin) {
            return false;
        }
        if (filterState.dailyRsiMax !== null && row.dailyRSI > filterState.dailyRsiMax) {
            return false;
        }
    }

    // EMA 20 Distance filter
    if (row.ema20Distance !== null) {
        if (filterState.ema20DistMin !== null && row.ema20Distance < filterState.ema20DistMin) {
            return false;
        }
        if (filterState.ema20DistMax !== null && row.ema20Distance > filterState.ema20DistMax) {
            return false;
        }
    }

    // EMA 50 Distance filter
    if (row.ema50Distance !== null) {
        if (filterState.ema50DistMin !== null && row.ema50Distance < filterState.ema50DistMin) {
            return false;
        }
        if (filterState.ema50DistMax !== null && row.ema50Distance > filterState.ema50DistMax) {
            return false;
        }
    }

    // EMA 100 Distance filter
    if (row.ema100Distance !== null) {
        if (filterState.ema100DistMin !== null && row.ema100Distance < filterState.ema100DistMin) {
            return false;
        }
        if (filterState.ema100DistMax !== null && row.ema100Distance > filterState.ema100DistMax) {
            return false;
        }
    }

    // EMA 200 Distance filter
    if (row.ema200Distance !== null) {
        if (filterState.ema200DistMin !== null && row.ema200Distance < filterState.ema200DistMin) {
            return false;
        }
        if (filterState.ema200DistMax !== null && row.ema200Distance > filterState.ema200DistMax) {
            return false;
        }
    }

    // Envelope distance filter
    if (row.envelopeDistance !== null) {
        if (filterState.envelopeDistMin !== null && row.envelopeDistance < filterState.envelopeDistMin) {
            return false;
        }
        if (filterState.envelopeDistMax !== null && row.envelopeDistance > filterState.envelopeDistMax) {
            return false;
        }
    }

    return true;
}

function toggleFilters() {
    const filtersContent = document.getElementById('filtersContent');
    const toggleBtn = document.querySelector('.filter-toggle');

    if (filtersContent.style.display === 'none') {
        filtersContent.style.display = 'block';
        toggleBtn.textContent = '▼ Hide';
    } else {
        filtersContent.style.display = 'none';
        toggleBtn.textContent = '▶ Show';
    }
}

function displayFilterResultCount() {
    let resultText = '';
    if (filteredRows.length > 0) {
        resultText = `Showing ${filteredRows.length} of ${technicalRows.length} stocks`;
    } else if (Object.values(filterState).some(v => v)) {
        resultText = 'No results match your filters';
    }

    // Update or create result count display
    let resultCountDiv = document.getElementById('filterResultCount');
    if (!resultCountDiv && resultText) {
        resultCountDiv = document.createElement('div');
        resultCountDiv.id = 'filterResultCount';
        resultCountDiv.className = 'filter-result-count';
        document.querySelector('.filters-section').appendChild(resultCountDiv);
    }

    if (resultCountDiv) {
        resultCountDiv.textContent = resultText;
    }
}

function buildTechnicalTable() {
    // Show filters section when table is ready
    const filtersSection = document.getElementById('filtersSection');
    if (filtersSection) {
        filtersSection.style.display = 'block';
    }

    renderTechnicalTable();
}