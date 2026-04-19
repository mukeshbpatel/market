const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname)));

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

app.listen(PORT, () => {
    console.log(`\n✅ Server running at http://localhost:${PORT}`);
    console.log(`\n📊 Open: http://localhost:${PORT}/stock-monthly-tracker.html\n`);
});
