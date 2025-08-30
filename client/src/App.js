// src/App.js - DÜZELTİLMİŞ TAM KOD

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { auth, db } from './firebase'; 
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

// Gerekli tüm bileşenleri import et
import Auth from './auth';
import ChartComponent from './ChartComponent';
import EditorComponent from './EditorComponent';
import SettingsModal from './SettingsModal';
import './App.css';

function App() {
  // Tüm state tanımlamaları
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1h');
  const [code, setCode] = useState(`// SUPERTREND STRATEJİSİ
// Fiyat Supertrend çizgisini yukarı kırdığında AL, aşağı kırdığında SAT.

// Gerekli verilerin (supertrend objesi ve içindeki value) mevcut olduğundan emin ol
if (candle.supertrend && candle.supertrend.value && prevCandle.supertrend && prevCandle.supertrend.value) {
  const currentClose = candle.close;
  const currentSupertrend = candle.supertrend.value; // .value'yu kullan
  const prevClose = prevCandle.close;
  const prevSupertrend = prevCandle.supertrend.value; // .value'yu kullan

  // Alım Sinyali (Kırılım)
  if (prevClose < prevSupertrend && currentClose > currentSupertrend) {
    buy(index);
  }
  
  // Satım Sinyali (Kırılım)
  else if (prevClose > prevSupertrend && currentClose < currentSupertrend) {
    sell(index);
  }
}`);
  const [chartData, setChartData] = useState([]);
  const [testResults, setTestResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [savedStrategies, setSavedStrategies] = useState([]);
  
  const [strategyParams, setStrategyParams] = useState({
    initialBalance: 10000,
    rsiPeriod: 14,
    smaPeriod: 20,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTableVisible, setIsTableVisible] = useState(false);

  // Kimlik doğrulama için Effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Kaydedilmiş stratejileri çekmek için Effect
  useEffect(() => {
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

  // Mum verilerini çekmek için Effect
  useEffect(() => {
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

  // Strateji kaydetme fonksiyonu
  const handleSave = async () => {
    if (!user) {
      alert("Stratejinizi kaydetmek için lütfen giriş yapın.");
      return;
    }
    const strategyName = prompt("Stratejiniz için bir isim girin:");
    if (strategyName) {
      try {
        await addDoc(collection(db, "strategies"), {
          userId: user.uid,
          name: strategyName,
          code: code,
          params: strategyParams,
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
  
  // Kaydedilmiş stratejiyi yükleme fonksiyonu
  const handleLoadStrategy = (strategyId) => {
    if (!strategyId) return;
    const strategyToLoad = savedStrategies.find(s => s.id === strategyId);
    if (strategyToLoad) {
      setCode(strategyToLoad.code);
      if (strategyToLoad.params) {
        setStrategyParams(strategyToLoad.params);
      } else {
        setStrategyParams({ initialBalance: 10000, rsiPeriod: 14, smaPeriod: 20 });
      }
    }
  };

  // Backtest çalıştırma fonksiyonu
  const handleBacktest = async () => {
    setError('');
    setTestResults(null);
    try {
      const response = await axios.post('http://localhost:5000/api/backtest', {
        code: code,
        data: chartData,
        params: strategyParams
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
      {isModalOpen && (
        <SettingsModal 
          initialParams={strategyParams}
          onSave={setStrategyParams}
          onClose={() => setIsModalOpen(false)}
        />
      )}
      
      <header className="App-header">
        <h1>Crypto Strateji Test Platformu</h1>
        <div className="auth-buttons">
          {user ? (
            <>
              <span>Hoşgeldin, {user.email}</span>
              <button onClick={() => auth.signOut()}>Çıkış Yap</button>
            </>
          ) : (
            <Auth />
          )}
        </div>
      </header>
      
      {user && savedStrategies.length > 0 && (
        <div className="strategy-loader">
          <label>
            Kaydedilmiş Stratejiyi Yükle:
            <select onChange={(e) => handleLoadStrategy(e.target.value)} value="">
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
        {isLoading ? <div>Loading...</div> : <ChartComponent 
          symbol={symbol} 
          interval={interval} 
          chartData={chartData} 
          testResults={testResults}
          onSettingsClick={() => setIsModalOpen(true)}
        />}
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

          <button onClick={() => setIsTableVisible(!isTableVisible)} className="toggle-details-btn">
            {isTableVisible ? 'İşlem Detaylarını Gizle' : 'İşlem Detaylarını Göster'}
          </button>
          {isTableVisible && testResults.trades.length > 0 && (
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

export default App;
