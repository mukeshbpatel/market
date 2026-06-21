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
        fundamentalRows = (data.quarters || []).slice(-20);
        renderFundamentalView(stock, fundamentalRows);
        showLoading(false);
    } catch (error) {
        showLoading(false);
        showError(`Error fetching data: ${error.message}`);
    }
}

function renderFundamentalView(stock, quarters) {
    if (!quarters || quarters.length === 0) {
        showError(`No fundamental data available for ${stock}`);
        return;
    }

    renderSummary(stock, quarters);
    renderCharts(quarters);
    renderTable(quarters);
}

function renderSummary(stock, quarters) {
    const summary = document.getElementById('fundamentalsSummary');
    const latest = quarters[quarters.length - 1];
    const previous = quarters[quarters.length - 2] || latest;
    const patGrowth = calculateGrowth(previous?.netProfit, latest?.netProfit);
    const cfGrowth = calculateGrowth(previous?.operatingCashFlow, latest?.operatingCashFlow);
    const avgPat = quarters.reduce((sum, quarter) => sum + (quarter.netProfit || 0), 0) / quarters.length;
    const avgCf = quarters.reduce((sum, quarter) => sum + (quarter.operatingCashFlow || 0), 0) / quarters.length;

    summary.innerHTML = `
        <div class="summary-card">
            <h3>${stock}</h3>
            <p>Latest quarter: <strong>${latest.label}</strong></p>
            <p>Latest PAT: <strong>₹${formatValue(latest.netProfit)}</strong></p>
            <p>Latest cash flow: <strong>₹${formatValue(latest.operatingCashFlow)}</strong></p>
        </div>
        <div class="summary-card">
            <h3>Interpretation</h3>
            <p>${buildNarrative(stock, quarters, patGrowth, cfGrowth, avgPat, avgCf)}</p>
        </div>
    `;
    summary.style.display = 'grid';
}

function renderCharts(quarters) {
    const labels = quarters.map(quarter => quarter.label);
    const patValues = quarters.map(quarter => quarter.netProfit);
    const cashFlowValues = quarters.map(quarter => quarter.operatingCashFlow);

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
            <td>${formatValue(quarter.netProfit)}</td>
            <td>${formatValue(quarter.operatingCashFlow)}</td>
            <td>${buildQuarterCommentary(quarter, previous)}</td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('tableWrapper').style.display = 'block';
}

function buildNarrative(stock, quarters, patGrowth, cfGrowth, avgPat, avgCf) {
    const lastFourPat = quarters.slice(-4).map(q => q.netProfit).filter(value => value !== null);
    const lastFourCf = quarters.slice(-4).map(q => q.operatingCashFlow).filter(value => value !== null);
    const patTrend = analyzeTrend(lastFourPat);
    const cfTrend = analyzeTrend(lastFourCf);

    return `${stock} shows a ${patTrend} PAT trajectory and a ${cfTrend} cash-flow pattern over the latest four quarters. Latest quarter PAT moved ${formatPercent(patGrowth)} versus the prior quarter, while operating cash flow changed ${formatPercent(cfGrowth)}. Average quarterly PAT is ₹${formatValue(avgPat)}, compared with average quarterly operating cash flow of ₹${formatValue(avgCf)}. If PAT is rising while cash flow is stable or stronger, the business is likely converting earnings into real cash effectively. Watch whether the company sustains both margins and cash generation across the next few quarters before calling the trend durable.`;
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
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ₹${formatValue(context.raw)}`
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
