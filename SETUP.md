# Stock Monthly Tracker - Setup Guide

## Problem Solved
The CORS error occurred because the HTML file was opened directly with `file://` protocol. The solution is to run a backend server that proxies API requests.

## Setup Instructions

### Step 1: Install Node.js
If you don't have Node.js installed, download it from https://nodejs.org/ (LTS version recommended)

### Step 2: Install Dependencies
Open PowerShell in the market folder and run:
```powershell
npm install
```

### Step 3: Start the Server
```powershell
npm start
```

You should see:
```
✅ Server running at http://localhost:3000
📊 Open: http://localhost:3000/stock-monthly-tracker.html
```

### Step 4: Open in Browser
Click the link or open: **http://localhost:3000/stock-monthly-tracker.html**

## How It Works
- `server.js` - Backend Express server that proxies requests to Groww API
- `stock-monthly-tracker.html` - Frontend that calls the local proxy instead of direct API
- `package.json` - Dependencies list

## Files
- **stock-monthly-tracker.html** - The stock tracker page
- **server.js** - Backend proxy server
- **package.json** - Node dependencies

## Troubleshooting

### Still getting CORS error?
Make sure you're accessing via `http://localhost:3000` NOT `file://`

### Port 3000 already in use?
Edit `server.js` and change `const PORT = 3000;` to a different port like `3001`

### npm command not found?
Install Node.js from https://nodejs.org/

## Features
✅ 10-year monthly price movement data
✅ Color-coded gains (green) and losses (red)
✅ NIFTY 100 stock selection
✅ 10-year high/low prices
✅ Responsive design

Enjoy! 📈
