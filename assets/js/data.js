// Fetch real stock data from provided API; fallback to sample data if unavailable
(function(){
  const API_URL = 'https://groww.in/v1/api/charting_service/v2/chart/delayed/exchange/NSE/segment/CASH/TCS?endTimeInMillis=1771162317811&intervalInMinutes=1440&startTimeInMillis=1613500200000';
  window.STOCKS = [];

  function genSampleStocks(){
    const STOCKS = [];
    for(let i=1;i<=50;i++){
      const symbol = 'STK'+i;
      const prevClose = +(Math.random()*900+50).toFixed(2);
      const price = +(prevClose * (1 + (Math.random()-0.5)/10)).toFixed(2);
      const volume = Math.floor(Math.random()*1000000+10000);
      const history = [];
      let last = prevClose;
      for(let d=0;d<100;d++){
        last = +(last * (1 + (Math.random()-0.5)/50)).toFixed(2);
        history.push({close:last,volume: Math.floor(Math.random()*1000000)});
      }
      const rsi = Math.floor(Math.random()*60+20);
      STOCKS.push({symbol,price,prevClose,volume,history,rsi});
    }
    window.STOCKS = STOCKS;
  }

  function parseCandles(resp){
    // try common locations for candle arrays
    if(!resp) return null;
    if(resp.candles && Array.isArray(resp.candles)) return resp.candles;
    if(resp.data && resp.data.candles && Array.isArray(resp.data.candles)) return resp.data.candles;
    if(resp.chart && resp.chart.candles && Array.isArray(resp.chart.candles)) return resp.chart.candles;
    // Some APIs return array at root
    if(Array.isArray(resp)) return resp;
    return null;
  }

  function buildStockFromCandles(symbol, candles){
    // candles might be array of arrays [ts,open,high,low,close,volume]
    const history = candles.slice().map(item=>{
      if(Array.isArray(item)){
        return {time: item[0], open: item[1], high: item[2], low: item[3], close: item[4], volume: item[5] || 0};
      }
      // object-style
      return {time: item.time || item.t, open: item.open, high: item.high, low: item.low, close: item.close || item.c, volume: item.volume || item.v || 0};
    }).filter(h=>h && (h.close!==undefined));
    if(history.length===0) return null;
    const latest = history[history.length-1];
    const prev = history[Math.max(0, history.length-2)];
    const price = +latest.close;
    const prevClose = +prev.close;
    const volume = +latest.volume || 0;
    const rsi = Math.floor(Math.random()*60+20);
    return {symbol, price, prevClose, volume, history: history.reverse(), rsi};
  }

  // Try to fetch API (may be blocked by CORS when opened as local file)
  $.getJSON(API_URL).done(function(resp){
    const candles = parseCandles(resp);
    if(candles){
      const stock = buildStockFromCandles('TCS', candles);
      if(stock) window.STOCKS.push(stock);
    }
    // also populate sample stocks so UI has more items to show
    for(let i=2;i<=20;i++){
      const symbol = 'STK'+i;
      const prevClose = +(Math.random()*900+50).toFixed(2);
      const price = +(prevClose * (1 + (Math.random()-0.5)/10)).toFixed(2);
      const volume = Math.floor(Math.random()*1000000+10000);
      const history = [];
      let last = prevClose;
      for(let d=0;d<100;d++){
        last = +(last * (1 + (Math.random()-0.5)/50)).toFixed(2);
        history.push({close:last,volume: Math.floor(Math.random()*1000000)});
      }
      const rsi = Math.floor(Math.random()*60+20);
      window.STOCKS.push({symbol,price,prevClose,volume,history,rsi});
    }
  }).fail(function(){
    console.warn('Could not fetch API (CORS or network). Using generated sample data.');
    genSampleStocks();
  });

})();
