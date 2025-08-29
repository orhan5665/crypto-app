// src/App.js
import Auth from './auth';
import React from 'react';
import axios from 'axios';
import { auth, db } from './firebase'; 
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

import ChartComponent from './ChartComponent';
import EditorComponent from './EditorComponent';
import './App.css';

function App() {
  const [symbol, setSymbol] = React.useState('BTCUSDT');
  const [interval, setInterval] = React.useState('1h');
  const [code, setCode] = React.useState(`// YENİ İNDİKATÖRLER: candle.rsi ve candle.sma20
// RSI 30'un altına düştüğünde ve fiyat 20'lik ortalamanın üzerindeyken AL.
// RSI 70'in üzerine çıktığında SAT.

if (candle.rsi < 30 && candle.close > candle.sma20) {
  buy(index);
} else if (candle.rsi > 70) {
  sell(index);
}`
  );
  
  const [chartData, setChartData] = React.useState([]);
  const [testResults, setTestResults] = React.useState(null); // BU SATIR EKSİKTİ
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const [user, setUser] = React.useState(null);
  const [savedStrategies, setSavedStrategies] = React.useState([]);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const fetchStrategies = async () => {
      if (user) {
        const q = query(collection(db, "strategies"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const strategies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSavedStrategies(strategies);
      } else {
        setSavedStrategies([]);
      }
    };
    fetchStrategies();
  }, [user]);

  React.useEffect(() => {
    setIsLoading(true);
    setTestResults(null);
    axios.get(`http://localhost:5000/api/candles?symbol=${symbol}&interval=${interval}`)
      .then(response => {
        setChartData(response.data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Veri çekme hatası:", err);
        setError('Grafik verileri yüklenemedi.');
        setIsLoading(false);
      });
  }, [symbol, interval]);

  const handleSave = async () => {
    if (!user) {
      alert("Stratejinizi kaydetmek için lütfen giriş yapın.");
      return;
    }
    const strategyName = prompt("Lütfen stratejiniz için bir isim girin:");
    if (strategyName) {
      try {
        await addDoc(collection(db, "strategies"), {
          userId: user.uid,
          name: strategyName,
          code: code,
          createdAt: new Date()
        });
        alert(`'${strategyName}' başarıyla kaydedildi!`);
        const q = query(collection(db, "strategies"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        setSavedStrategies(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error("Kaydetme hatası:", e);
        alert("Strateji kaydedilirken bir hata oluştu.");
      }
    }
  };
  
  const handleLoadStrategy = (strategyId) => {
    if (!strategyId) return;
    const strategyToLoad = savedStrategies.find(s => s.id === strategyId);
    if (strategyToLoad) {
      setCode(strategyToLoad.code);
    }
  };

  const handleBacktest = async () => {
    setError('');
    setTestResults(null);
    try {
      const response = await axios.post('http://localhost:5000/api/backtest', {
        code: code,
        data: chartData
      });
      if (response.data.success) {
        setTestResults(response.data);
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError(err.response ? err.response.data.error : 'Test sırasında bir hata oluştu.');
    }
  };

  return (
    <div className="App">
    
<header className="App-header">
  <h1>Crypto Strateji Test Platformu</h1>
  <div className="auth-buttons">
    {user ? (
      <>
        <span>Hoşgeldin, {user.email}</span>
        <button onClick={() => auth.signOut()}>Çıkış Yap</button>
      </>
    ) : (
      <Auth /> // "Giriş Yapılmadı" yazısı yerine artık bu bileşen gelecek
    )}
  </div>
</header>
      
      {user && savedStrategies.length > 0 && (
        <div className="strategy-loader">
          <label>
            Kaydedilmiş Stratejiyi Yükle:
            <select onChange={(e) => handleLoadStrategy(e.target.value)}>
              <option value="">Strateji Seçin...</option>
              {savedStrategies.map(strategy => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="controls">
        <label>
          Parite Seçin:
          <select value={symbol} onChange={e => setSymbol(e.target.value)}>
            <option value="BTCUSDT">BTC/USDT</option>
            <option value="ETHUSDT">ETH/USDT</option>
            <option value="BNBUSDT">BNB/USDT</option>
            <option value="SOLUSDT">SOL/USDT</option>
          </select>
        </label>
        <label>
          Zaman Aralığı Seçin:
          <select value={interval} onChange={e => setInterval(e.target.value)}>
            <option value="15m">15 Dakika</option>
            <option value="1h">1 Saat</option>
            <option value="4h">4 Saat</option>
            <option value="1d">1 Gün</option>
          </select>
        </label>
      </div>

      <div className="chart-container">
        {isLoading ? <div>Yükleniyor...</div> : <ChartComponent symbol={symbol} interval={interval} chartData={chartData} testResults={testResults} />}
      </div>

      <div className="editor-container">
        <EditorComponent code={code} onCodeChange={setCode} />
      </div>

      <div className="actions-container">
        <button onClick={handleBacktest} className="test-button">Test Et</button>
        <button onClick={handleSave} className="save-button">Stratejiyi Kaydet</button>
      </div>

      {error && <div className="results error">{error}</div>}
      
{testResults && (
  <div className="results">
    <h3>Test Sonuçları</h3>
    {/* Gelişmiş Metrikler Paneli */}
    <div className="results-grid">
      <div><strong>Başlangıç Bakiyesi:</strong> ${testResults.initialBalance.toLocaleString()}</div>
      <div><strong>Son Bakiye:</strong> ${testResults.finalBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
      <div style={{ color: testResults.pnl >= 0 ? 'green' : 'red' }}>
        <strong>Toplam Kar/Zarar:</strong> ${testResults.pnl.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
      </div>
      <div style={{ color: testResults.returnPercentage >= 0 ? 'green' : 'red' }}>
        <strong>Getiri:</strong> {(testResults.returnPercentage || 0).toFixed(2)}%
      </div>
      <div><strong>Toplam İşlem:</strong> {testResults.totalTrades}</div>
      <div><strong>Kazanma Oranı:</strong> {(testResults.winRate || 0).toFixed(2)}%</div>
      <div><strong>Kar Faktörü:</strong> {(testResults.profitFactor || 0).toFixed(2)}</div>
      <div style={{ color: 'red' }}>
        <strong>Maks. Düşüş:</strong> {(testResults.maxDrawdown || 0).toFixed(2)}%
      </div>
    </div>

    {/* Detaylı İşlem Tablosu */}
    {testResults.trades.length > 0 && (
      <div className="trades-table-container">
        <h4>İşlem Detayları</h4>
        <table>
          <thead>
            <tr>
              <th>Giriş Fiyatı</th>
              <th>Çıkış Fiyatı</th>
              <th>Kar/Zarar ($)</th>
            </tr>
          </thead>
          <tbody>
            {testResults.trades.map((trade, index) => (
              <tr key={index}>
                <td>{(trade.entryPrice || 0).toFixed(2)}</td>
                <td>{(trade.exitPrice || 0).toFixed(2)}</td>
                <td style={{ color: trade.profit >= 0 ? 'green' : 'red' }}>
                  {(trade.profit || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}
    </div>
  );
}

export default App; // BU SATIR EKSİKTİ