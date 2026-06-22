const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const YahooFinance = require('yahoo-finance2').default;

const app = express();
const PORT = 3000;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname)));

function normalizeStockSymbol(stock) {
    return String(stock || '').trim().toUpperCase();
}

function toYahooSymbol(stock) {
    const normalized = normalizeStockSymbol(stock);
    if (!normalized) {
        return '';
    }

    return normalized.endsWith('.NS') ? normalized : `${normalized}.NS`;
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getNumericValue(value) {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'object') {
        if (typeof value.raw === 'number') {
            return value.raw;
        }

        if (typeof value.fmt === 'string') {
            const parsed = Number(String(value.fmt).replace(/,/g, '').replace(/B$/i, '000000000').replace(/M$/i, '000000'));
            return Number.isFinite(parsed) ? parsed : null;
        }
    }

    const parsed = Number(String(value).replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
}

function getDateKey(value) {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString().slice(0, 10);
}

function formatQuarterLabel(dateKey) {
    return new Date(dateKey).toLocaleString('en-IN', { month: 'short', year: 'numeric' });
}

function getTrendLabel(current, previous) {
    if (current === null || previous === null || previous === 0) {
        return 'neutral';
    }

    const change = ((current - previous) / Math.abs(previous)) * 100;
    if (change > 8) {
        return 'improving';
    }

    if (change < -8) {
        return 'weakening';
    }

    return 'stable';
}

async function fetchYahooFundamentals(stock) {
    const symbol = toYahooSymbol(stock);
    const [financialSeries, quoteSummary] = await Promise.all([
        yahooFinance.fundamentalsTimeSeries(symbol, {
            period1: '2010-01-01',
            period2: new Date(),
            type: 'quarterly',
            module: 'financials'
        }),
        yahooFinance.quoteSummary(symbol, {
            modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'financialData', 'cashflowStatementHistoryQuarterly']
        })
    ]);

    const quarterMap = new Map();

    financialSeries.forEach(item => {
        const dateKey = getDateKey(item.date);
        if (!dateKey) {
            return;
        }

        quarterMap.set(dateKey, {
            date: dateKey,
            label: formatQuarterLabel(dateKey),
            netProfit: getNumericValue(item.netIncome),
            operatingCashFlow: null
        });
    });

    const cashflowStatements = quoteSummary?.cashflowStatementHistoryQuarterly?.cashflowStatements || [];
    cashflowStatements.forEach(item => {
        const dateKey = getDateKey(item.date || item.endDate);
        if (!dateKey) {
            return;
        }

        const existing = quarterMap.get(dateKey) || {
            date: dateKey,
            label: formatQuarterLabel(dateKey),
            netProfit: null,
            operatingCashFlow: null
        };

        // Yahoo Finance returns operating cash flow as 'operatingActivities' or 'operatingCashFlow'
        const cashFlow = getNumericValue(item.operatingActivities) || getNumericValue(item.operatingCashFlow);
        existing.operatingCashFlow = cashFlow;
        quarterMap.set(dateKey, existing);
    });

    const quarters = [...quarterMap.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
    const latest = quarters[quarters.length - 1] || {};
    const previous = quarters[quarters.length - 2] || latest;

    const price = quoteSummary?.price || {};
    const summaryDetail = quoteSummary?.summaryDetail || {};
    const defaultKeyStatistics = quoteSummary?.defaultKeyStatistics || {};
    const financialData = quoteSummary?.financialData || {};

    return {
        stock,
        symbol,
        quarters,
        overview: {
            currentPrice: getNumericValue(price.regularMarketPrice),
            fiftyTwoWeekHigh: getNumericValue(summaryDetail.fiftyTwoWeekHigh),
            fiftyTwoWeekLow: getNumericValue(summaryDetail.fiftyTwoWeekLow),
            trailingPE: getNumericValue(summaryDetail.trailingPE),
            beta: getNumericValue(defaultKeyStatistics.beta),
            profitMargins: getNumericValue(financialData.profitMargins),
            marketCap: getNumericValue(price.marketCap)
        },
        latestTrend: {
            pat: getTrendLabel(latest.netProfit ?? null, previous.netProfit ?? null),
            cashFlow: getTrendLabel(latest.operatingCashFlow ?? null, previous.operatingCashFlow ?? null)
        }
    };
}

// API Proxy endpoint
app.get('/api/stock-data', async (req, res) => {
    try {
        const { stock, startTimeInMillis, endTimeInMillis } = req.query;

        if (!stock || !startTimeInMillis || !endTimeInMillis) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const apiUrl = `https://groww.in/v1/api/charting_service/v2/chart/delayed/exchange/NSE/segment/CASH/${stock}?endTimeInMillis=${endTimeInMillis}&intervalInMinutes=1440&startTimeInMillis=${startTimeInMillis}`;

        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/fundamentals-data', async (req, res) => {
    try {
        const stock = normalizeStockSymbol(req.query.stock);
        if (!stock) {
            return res.status(400).json({ error: 'Missing required parameter: stock' });
        }

        const data = await fetchYahooFundamentals(stock);
        res.json(data);
    } catch (error) {
        console.error('Error fetching fundamentals:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n✅ Server running at http://localhost:${PORT}`);
    console.log(`\n📊 Open: http://localhost:${PORT}/index.html\n`);
});
