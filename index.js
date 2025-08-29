// index.js - HATA AYIKLAMA MESAJLARI EKLENMİŞ TAM VE SON HALİ

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { VM } = require('vm2');
const ti = require('technicalindicators');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get('/api/candles', async (req, res) => {
    const { symbol, interval } = req.query;
    if (!symbol || !interval) {
        return res.status(400).json({ error: 'Lütfen "symbol" ve "interval" parametrelerini sağlayın.' });
    }
    try {
        const response = await axios.get('https://api.binance.com/api/v3/klines', {
            params: {
                symbol: symbol.toUpperCase(),
                interval: interval,
                limit: 500
            }
        });
        const formattedData = response.data.map(d => ({
            time: d[0],
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4])
        }));
        res.json(formattedData);
    } catch (error) {
        console.error('Binance API Hatası:', error.message);
        res.status(500).json({ error: 'Binance API\'sinden veri çekilirken bir hata oluştu.' });
    }
});

app.post('/api/backtest', (req, res) => {
  const { code, data } = req.body;

  if (!code || !data || data.length === 0) {
    return res.status(400).json({ success: false, error: "Strateji kodu veya mum verisi eksik." });
  }

  const closePrices = data.map(d => d.close);
  const rsiInput = { values: closePrices, period: 14 };
  const rsiValues = ti.RSI.calculate(rsiInput);
  const smaInput = { values: closePrices, period: 20 };
  const smaValues = ti.SMA.calculate(smaInput);

  const enrichedData = data.map((candle, index) => {
    const rsiIndex = index - rsiInput.period;
    const smaIndex = index - (smaInput.period - 1);
    return {
      ...candle,
      rsi: rsiValues[rsiIndex] || null,
      sma20: smaValues[smaIndex] || null,
    };
  });

  let initialBalance = 10000;
  let balance = initialBalance;
  let position = null;
  const trades = [];

  const vm = new VM({
      timeout: 2000,
      sandbox: {
          buy: (index) => {
            console.log(`BUY sinyali alındı - Index: ${index}. Pozisyon durumu: ${JSON.stringify(position)}`);
            if (position === null && index !== undefined) {
              console.log('--> Koşul başarılı, ALIM YAPILIYOR...');
              const price = enrichedData[index].close;
              const size = balance / price;
              position = { entryPrice: price, size: size, entryIndex: index };
              balance = 0;
            }
          },
          sell: (index) => {
            console.log(`SELL sinyali alındı - Index: ${index}. Pozisyon durumu: ${JSON.stringify(position)}`);
            if (position !== null && index !== undefined) {
              console.log('--> Koşul başarılı, SATIM YAPILIYOR...');
              const price = enrichedData[index].close;
              balance = position.size * price;
              trades.push({
                type: 'sell',
                entryPrice: position.entryPrice,
                exitPrice: price,
                profit: (price - position.entryPrice) * position.size,
                entryIndex: position.entryIndex,
                exitIndex: index
              });
              position = null;
            }
          },
      }
  });

  try {
    for (let i = 0; i < enrichedData.length; i++) {
      vm.sandbox.candle = enrichedData[i];
      vm.sandbox.index = i;
      vm.run(code);
    }
    
    if (position !== null) {
      const lastPrice = enrichedData[enrichedData.length - 1].close;
      balance += position.size * lastPrice;
       trades.push({
          type: 'sell',
          entryPrice: position.entryPrice,
          exitPrice: lastPrice,
          profit: (lastPrice - position.entryPrice) * position.size,
          entryIndex: position.entryIndex,
          exitIndex: enrichedData.length - 1
        });
      position = null;
    }

    const finalBalance = balance;
    const pnl = finalBalance - initialBalance;
    const returnPercentage = (pnl / initialBalance) * 100;

    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.profit > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const grossProfit = trades.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0);
    const grossLoss = trades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0);
    const profitFactor = grossLoss !== 0 ? Math.abs(grossProfit / grossLoss) : Infinity;
    let peak = initialBalance;
    let maxDrawdown = 0;
    const equityCurve = [initialBalance];
    trades.forEach(trade => { equityCurve.push(equityCurve[equityCurve.length - 1] + trade.profit); });
    equityCurve.forEach(equity => {
      if (equity > peak) { peak = equity; }
      const drawdown = ((peak - equity) / peak);
      if (drawdown > maxDrawdown) { maxDrawdown = drawdown; }
    });
    
    res.json({ 
      success: true, 
      trades: trades,
      initialBalance,
      finalBalance,
      pnl,
      returnPercentage,
      winRate,
      profitFactor,
      maxDrawdown: maxDrawdown * 100,
      totalTrades
    });

  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
    console.log(`Backend sunucusu http://localhost:${PORT} adresinde başarıyla başlatıldı.`);
});