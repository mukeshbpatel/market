const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname)));

function normalizeStockSymbol(stock) {
    return String(stock || '').trim().toUpperCase();
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractScreenerSection(html, sectionId) {
    const sectionMatch = html.match(new RegExp(`<section id="${escapeRegExp(sectionId)}"[\\s\\S]*?<\\/section>`, 'i'));
    return sectionMatch ? sectionMatch[0] : null;
}

function parseScreenerQuarterTable(sectionHtml, targetLabel) {
    if (!sectionHtml) {
        return null;
    }

    const dateMatches = [...sectionHtml.matchAll(/<th class="[^"]*"\s*data-date-key="([0-9-]+)">/g)].map(match => match[1]);
    const rowMatches = [...sectionHtml.matchAll(/<tr[\s\S]*?<\/tr>/g)].map(match => match[0]);
    const rowHtml = rowMatches.find(row => row.includes(`Company.showSchedule('${targetLabel}'`));

    if (!rowHtml) {
        return null;
    }

    const cellMatches = [...rowHtml.matchAll(/<td class="[^"]*">\s*([\d,.-]+)\s*<\/td>/g)].map(match => Number(match[1].replace(/,/g, '')));

    return dateMatches.slice(-cellMatches.length).map((date, index) => ({
        date,
        value: cellMatches[index] ?? null
    }));
}

async function fetchScreenerFundamentals(stock) {
    const url = `https://www.screener.in/company/${stock}/consolidated/`;
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    if (!response.ok) {
        throw new Error(`Screener error: ${response.status}`);
    }

    const html = await response.text();
    const quartersSection = extractScreenerSection(html, 'quarters');
    const cashFlowSection = extractScreenerSection(html, 'cash-flow');
    const quarterlyDates = quartersSection
        ? [...quartersSection.matchAll(/<th class="[^"]*"\s*data-date-key="([0-9-]+)">/g)].map(match => match[1])
        : [];
    const patRows = parseScreenerQuarterTable(quartersSection, 'Net Profit') || [];
    const cashFlowRows = parseScreenerQuarterTable(cashFlowSection, 'Cash from Operating Activity') || [];

    const quarters = quarterlyDates.map((date, index) => ({
        date,
        label: new Date(date).toLocaleString('en-IN', { month: 'short', year: 'numeric' }),
        netProfit: patRows[index]?.value ?? null,
        operatingCashFlow: cashFlowRows[index]?.value ?? null
    }));

    return { stock, quarters };
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

        const data = await fetchScreenerFundamentals(stock);
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
