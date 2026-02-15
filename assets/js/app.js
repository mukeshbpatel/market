$(function(){
  function pct(a,b){return b?(((a-b)/b)*100).toFixed(2):'0.00'}
  function avgVolumePercent(history, currentVol){
    const sum = history.slice(0,100).reduce((s,h)=>s+h.volume,0)/100;
    return ((currentVol/sum)*100 - 100).toFixed(2);
  }

  function topN(list,key,desc=true,n=5){
    return list.slice().sort((a,b)=> (desc? b[key]-a[key]: a[key]-b[key])).slice(0,n);
  }

  // Dashboard rendering
  function renderDashboard(){
    const stocks = window.STOCKS || [];
    const niftyChange = stocks.reduce((s,s2)=>s + (s2.price - s2.prevClose),0).toFixed(2);
    $('#nifty-summary').text('Total net change: '+niftyChange);

    const gainers = topN(stocks, 'price', true).map(s=>({symbol:s.symbol,change: +(s.price - s.prevClose)}));
    const losers = topN(stocks, 'price', false).map(s=>({symbol:s.symbol,change: +(s.price - s.prevClose)}));
    const volumeGainers = topN(stocks,'volume',true).map(s=>({symbol:s.symbol,volume:s.volume}));

    $('#gainers-list').empty(); gainers.forEach(g=>$('#gainers-list').append('<li class="gainer">'+g.symbol+': '+g.change.toFixed(2)+'</li>'));
    $('#losers-list').empty(); losers.forEach(l=>$('#losers-list').append('<li class="loser">'+l.symbol+': '+l.change.toFixed(2)+'</li>'));
    $('#volume-list').empty(); volumeGainers.forEach(v=>$('#volume-list').append('<li>'+v.symbol+': '+v.volume+'</li>'));
  }

  // Stock tracker rendering
  function renderStockTable(){
    if(!$('#stocks-table').length) return;
    const tbody = $('#stocks-table tbody').empty();
    (window.STOCKS||[]).forEach(s=>{
      const change = pct(s.price,s.prevClose);
      const volAvgPct = avgVolumePercent(s.history,s.volume);
      tbody.append('<tr><td>'+s.symbol+'</td><td>'+s.price+'</td><td>'+change+'%</td><td>'+s.volume+'</td><td>'+volAvgPct+'%</td><td>'+s.rsi+'</td></tr>');
    });
  }

  // Weekly movement (use last 5 days from history)
  function renderWeekly(){
    if(!$('#weekly-gainers-list').length) return;
    const stocks = window.STOCKS||[];
    const weekly = stocks.map(s=>{
      const hist = s.history.slice(0,7);
      const first = hist[hist.length-1].close;
      const last = hist[0].close;
      return {symbol:s.symbol, pct: ((last-first)/first)*100, volume: hist.reduce((a,b)=>a+b.volume,0)};
    });
    const wg = weekly.slice().sort((a,b)=>b.pct-a.pct).slice(0,5);
    const wl = weekly.slice().sort((a,b)=>a.pct-b.pct).slice(0,5);
    const wv = weekly.slice().sort((a,b)=>b.volume-a.volume).slice(0,5);
    $('#weekly-gainers-list').empty(); wg.forEach(x=>$('#weekly-gainers-list').append('<li>'+x.symbol+': '+x.pct.toFixed(2)+'%</li>'));
    $('#weekly-losers-list').empty(); wl.forEach(x=>$('#weekly-losers-list').append('<li>'+x.symbol+': '+x.pct.toFixed(2)+'%</li>'));
    $('#weekly-volume-list').empty(); wv.forEach(x=>$('#weekly-volume-list').append('<li>'+x.symbol+': '+x.volume+'</li>'));
  }

  renderDashboard(); renderStockTable(); renderWeekly();
});
