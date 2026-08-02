let fundamentalChartInstances = {
    pat: null,
    cashFlow: null
};

let fundamentalRows = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('stockSelect')) {
        return;
    }

    populateStockDropdown();
    document.getElementById('stockSelect').addEventListener('change', fetchFundamentalData);
    fetchFundamentalData();
});

function populateStockDropdown() {
    const select = document.getElementById('stockSelect');
    const uniqueStocks = [...new Set(NIFTY_100_STOCKS)];
    const sortedStocks = uniqueStocks.slice().sort((a, b) => {
        const rankA = MARKET_CAP_RANK[a] ?? Number.MAX_SAFE_INTEGER;
        const rankB = MARKET_CAP_RANK[b] ?? Number.MAX_SAFE_INTEGER;
        return rankA - rankB || a.localeCompare(b);
    });

    select.innerHTML = '<option value="">Select a stock...</option>';
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

async function fetchFundamentalData() {
    const stock = document.getElementById('stockSelect').value;
    if (!stock) {
        showError('Please select a stock');
        return;
    }

    showLoading(true);
    showError('');

    try {
        const response = await fetch(`/api/fundamentals-data?stock=${stock}`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        // Load the latest five years of quarterly data (20 quarters)
        fundamentalRows = (data.quarters || []).slice(-20);
        renderFundamentalView(stock, fundamentalRows, data.overview || {}, data.latestTrend || {});
        showLoading(false);
    } catch (error) {
        showLoading(false);
        showError(`Error fetching data: ${error.message}`);
    }
}

function renderFundamentalView(stock, quarters, overview, latestTrend) {
    if (!quarters || quarters.length === 0) {
        showError(`No fundamental data available for ${stock}`);
        return;
    }

    renderSummary(stock, quarters, overview, latestTrend);
    renderCharts(quarters);
    renderTable(quarters);
}

function renderSummary(stock, quarters, overview, latestTrend) {
    const summary = document.getElementById('fundamentalsSummary');
    const latest = quarters[quarters.length - 1];
    const previous = quarters[quarters.length - 2] || latest;
    const patGrowth = calculateGrowth(previous?.netProfit, latest?.netProfit);
    const cfGrowth = calculateGrowth(previous?.operatingCashFlow, latest?.operatingCashFlow);
    const avgPat = quarters.reduce((sum, quarter) => sum + (quarter.netProfit || 0), 0) / quarters.length;
    const avgCf = quarters.reduce((sum, quarter) => sum + (quarter.operatingCashFlow || 0), 0) / quarters.length;
    const prediction = buildPrediction(patGrowth, cfGrowth, overview, latestTrend);

    summary.innerHTML = `
        <div class="summary-card">
            <h3>${stock}</h3>
            <p>Latest quarter: <strong>${latest.label}</strong></p>
            <p>Latest PAT (₹ Crores): <strong>${formatCroreValue(latest.netProfit)}</strong></p>
            <p>Latest operating cash flow (₹ Crores): <strong>${formatCroreValue(latest.operatingCashFlow)}</strong></p>
            <p>Data source: <strong>Yahoo Finance</strong></p>
        </div>
        <div class="summary-card">
            <h3>Snapshot</h3>
            <p>Current price: <strong>₹${formatValue(overview.currentPrice)}</strong></p>
            <p>52-week range: <strong>₹${formatValue(overview.fiftyTwoWeekLow)}</strong> - <strong>₹${formatValue(overview.fiftyTwoWeekHigh)}</strong></p>
            <p>Trailing P/E: <strong>${formatDecimal(overview.trailingPE)}</strong></p>
            <p>Beta: <strong>${formatDecimal(overview.beta)}</strong></p>
            <p>Profit margin: <strong>${formatPercent(overview.profitMargins != null ? overview.profitMargins * 100 : null)}</strong></p>
        </div>
        <div class="summary-card">
            <h3>Interpretation</h3>
            <p>${buildNarrative(stock, quarters, patGrowth, cfGrowth, avgPat, avgCf, overview, latestTrend)}</p>
            <p style="margin-top: 10px;"><strong>Prediction:</strong> ${prediction}</p>
        </div>
    `;
    summary.style.display = 'grid';
}

function renderCharts(quarters) {
    const labels = quarters.map(quarter => quarter.label);
    const patValues = quarters.map(quarter => convertToCrores(quarter.netProfit));
    const cashFlowValues = quarters.map(quarter => convertToCrores(quarter.operatingCashFlow));

    destroyChart('pat');
    destroyChart('cashFlow');

    fundamentalChartInstances.pat = new Chart(document.getElementById('patChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'PAT',
                data: patValues,
                backgroundColor: '#667eea'
            }]
        },
        options: chartOptions('₹ Crores')
    });

    fundamentalChartInstances.cashFlow = new Chart(document.getElementById('cashFlowChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Operating Cash Flow',
                data: cashFlowValues,
                backgroundColor: '#22bb33'
            }]
        },
        options: chartOptions('₹ Crores')
    });

    document.getElementById('chartGrid').style.display = 'grid';
}

function renderTable(quarters) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    quarters.forEach((quarter, index) => {
        const previous = quarters[index - 1];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${quarter.label}</td>
            <td>${formatCroreValue(quarter.netProfit)}</td>
            <td>${formatCroreValue(quarter.operatingCashFlow)}</td>
            <td>${buildQuarterCommentary(quarter, previous)}</td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('tableWrapper').style.display = 'block';
}

function buildNarrative(stock, quarters, patGrowth, cfGrowth, avgPat, avgCf, overview, latestTrend) {
    const lastFourPat = quarters.slice(-4).map(q => q.netProfit).filter(value => value !== null);
    const lastFourCf = quarters.slice(-4).map(q => q.operatingCashFlow).filter(value => value !== null);
    const patTrend = analyzeTrend(lastFourPat);
    const cfTrend = analyzeTrend(lastFourCf);

    return `${stock} shows a ${patTrend} PAT trajectory and a ${cfTrend} cash-flow pattern over the latest four quarters. Latest quarter PAT moved ${formatPercent(patGrowth)} versus the prior quarter, while operating cash flow changed ${formatPercent(cfGrowth)}. Average quarterly PAT is ₹${formatValue(avgPat)}, compared with average quarterly operating cash flow of ₹${formatValue(avgCf)}. The stock is currently trading near ₹${formatValue(overview.currentPrice)}, with a trailing P/E of ${formatDecimal(overview.trailingPE)} and beta of ${formatDecimal(overview.beta)}. Yahoo’s latest reported trend flags PAT as ${latestTrend.pat || 'neutral'} and cash flow as ${latestTrend.cashFlow || 'neutral'}.`;
}

function buildPrediction(patGrowth, cfGrowth, overview, latestTrend) {
    const positiveSignals = [
        patGrowth !== null && patGrowth > 0,
        cfGrowth !== null && cfGrowth > 0,
        latestTrend.pat === 'improving',
        latestTrend.cashFlow === 'improving' || latestTrend.cashFlow === 'stable',
        overview.profitMargins !== null && overview.profitMargins > 0.12
    ].filter(Boolean).length;

    const valuation = overview.trailingPE;
    const near52WLow = overview.currentPrice !== null && overview.fiftyTwoWeekLow !== null
        ? ((overview.currentPrice - overview.fiftyTwoWeekLow) / Math.max(overview.fiftyTwoWeekLow, 1)) < 0.15
        : false;

    if (positiveSignals >= 4 && (valuation === null || valuation < 30)) {
        return 'Bullish bias: the latest fundamentals suggest improving earnings quality and acceptable valuation support.';
    }

    if (positiveSignals >= 3 && near52WLow) {
        return 'Constructive but selective: the business is showing some improvement, but it is still trading close to its lows and needs confirmation from the next few quarters.';
    }

    if (positiveSignals >= 3) {
        return 'Neutral to mildly positive: growth is present, but the setup still needs stronger cash-flow confirmation before calling it a durable uptrend.';
    }

    return 'Cautious outlook: the latest quarter does not yet show enough evidence of sustained fundamental improvement.';
}

function buildQuarterCommentary(quarter, previous) {
    const patChange = calculateGrowth(previous?.netProfit, quarter.netProfit);
    const cfChange = calculateGrowth(previous?.operatingCashFlow, quarter.operatingCashFlow);
    return `PAT ${formatPercent(patChange)}, cash flow ${formatPercent(cfChange)}`;
}

function calculateGrowth(previous, current) {
    if (!previous || !current) {
        return null;
    }

    return ((current - previous) / Math.abs(previous)) * 100;
}

function analyzeTrend(values) {
    if (values.length < 2) {
        return 'neutral';
    }

    const first = values[0];
    const last = values[values.length - 1];
    const growth = calculateGrowth(first, last);

    if (growth === null) {
        return 'neutral';
    }

    if (growth > 10) {
        return 'strongly improving';
    }

    if (growth > 0) {
        return 'improving';
    }

    if (growth < -10) {
        return 'weakening';
    }

    return 'stable';
}

function formatValue(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return 'N/A';
    }

    return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function convertToCrores(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return null;
    }

    return Number(value) / 10000000;
}

function formatCroreValue(value) {
    const croreValue = convertToCrores(value);
    if (croreValue === null) {
        return 'N/A';
    }

    return `${formatValue(croreValue)} Crores`;
}

function formatDecimal(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return 'N/A';
    }

    return Number(value).toFixed(2);
}

function formatPercent(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return 'N/A';
    }

    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function chartOptions(yLabel) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: 0
        },
        scales: {
            y: {
                beginAtZero: false,
                title: {
                    display: true,
                    text: yLabel
                }
            }
        },
        plugins: {
            legend: {
                display: false
            },
            filler: {
                propagate: true
            },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ₹${formatValue(context.raw)} Crores`
                }
            }
        }
    };
}

function destroyChart(key) {
    if (fundamentalChartInstances[key]) {
        fundamentalChartInstances[key].destroy();
        fundamentalChartInstances[key] = null;
    }
}
