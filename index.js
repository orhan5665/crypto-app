// index.js - DEBUG LOG EKLENMİŞ HALİ

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { VM } = require('vm2');
const ti = require('technicalindicators');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ============ CANDLE API ============
app.get('/api/candles', async (req, res) => {
    const { symbol, interval } = req.query;
    if (!symbol || !interval) {
        return res.status(400).json({ error: 'Lütfen "symbol" ve "interval" parametrelerini sağlayın.' });
    }
    try {
        console.log(`📡 Binance API çağrısı: symbol=${symbol}, interval=${interval}`);
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
        console.log(`✅ Binance verisi alındı (${formattedData.length} mum)`);
        res.json(formattedData);
    } catch (error) {
        console.error('❌ Binance API Hatası:', error.message, error.response?.data);
        res.status(500).json({ error: 'Binance API\'sinden veri çekilirken bir hata oluştu.' });
    }
});

// ============ BACKTEST API ============
app.post('/api/backtest', (req, res) => {
  const { code, data, params } = req.body;

  if (!code || !data || data.length === 0) {
    return res.status(400).json({ success: false, error: "Strateji kodu veya mum verisi eksik." });
  }

  try {
    console.log("🔹 Backtest isteği alındı");
    console.log("Parametreler:", params);
    console.log("Data uzunluğu:", data.length);
    console.log("Code snippet:", code.substring(0, 100), "..."); // İlk 100 karakter

    const rsiPeriod = params?.rsiPeriod || 14;
    const smaPeriod = params?.smaPeriod || 20;
    const initialBalance = params?.initialBalance || 10000;

    const highPrices = data.map(d => d.high);
    const lowPrices = data.map(d => d.low);
    const closePrices = data.map(d => d.close);

    console.log("RSI period:", rsiPeriod, "SMA period:", smaPeriod);

    const rsiValues = ti.RSI.calculate({ values: closePrices, period: rsiPeriod });
    const smaValues = ti.SMA.calculate({ values: closePrices, period: smaPeriod });

    // SuperTrend güvenli kontrol
    console.log("SuperTrend mevcut mu?", !!ti.SuperTrend);
    let supertrendValues = [];
    if (ti.SuperTrend && typeof ti.SuperTrend.calculate === "function") {
      supertrendValues = ti.SuperTrend.calculate({ high: highPrices, low: lowPrices, close: closePrices, period: 10, multiplier: 3 });
    } else {
      console.warn("⚠️ SuperTrend modülü bulunamadı, boş array kullanılacak.");
    }

    const enrichedData = data.map((candle, index) => {
      const rsiIndex = index - rsiPeriod;
      const smaIndex = index - (smaPeriod - 1);
      const stIndex = index - 10;
      
      const supertrendObject = supertrendValues[stIndex] || null;

      return {
        ...candle,
        rsi: rsiValues[rsiIndex] || null,
        sma: smaValues[smaIndex] || null,
        supertrend: supertrendObject
      };
    });

    let balance = initialBalance;
    let position = null;
    const trades = [];
    const vm = new VM({
        timeout: 1000, // kısa timeout
        sandbox: {
            buy: (index) => {
              if (position === null && index !== undefined) {
                const price = enrichedData[index].close;
                const size = balance / price;
                position = { entryPrice: price, size: size, entryIndex: index };
                balance = 0;
                console.log(`🟢 BUY @${price} (index ${index})`);
              }
            },
            sell: (index) => {
              if (position !== null && index !== undefined) {
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
                console.log(`🔴 SELL @${price} (index ${index})`);
                position = null;
              }
            },
        }
    });

    // Strateji kodunu çalıştır
    for (let i = 1; i < enrichedData.length; i++) {
      vm.sandbox.candle = enrichedData[i];
      vm.sandbox.prevCandle = enrichedData[i - 1];
      vm.sandbox.index = i;
      vm.run(code);
    }

    // Eğer açık pozisyon varsa kapat
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
      console.log(`🔴 SELL (force close) @${lastPrice}`);
      position = null;
    }

    // Sonuç metrikleri
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

    console.log("✅ Backtest tamamlandı. Final balance:", finalBalance);

    res.json({ 
      success: true, 
      trades,
      initialBalance,
      finalBalance,
      pnl,
      returnPercentage,
      winRate,
      profitFactor,
      maxDrawdown: maxDrawdown * 100,
      totalTrades,
      equityCurve
    });

  } catch (err) {
    console.error("❌ Backtest Hatası:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// ============ SERVER START ============
app.listen(PORT, () => {
    console.log(`🚀 Backend sunucusu http://localhost:${PORT} adresinde başarıyla başlatıldı.`);
});
