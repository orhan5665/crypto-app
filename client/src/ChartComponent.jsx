// src/ChartComponent.jsx - DÜZELTİLMİŞ TAM KOD

import React, { useMemo } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import stockModule from 'highcharts/modules/stock';

// Bu satır, Highcharts'a 'candlestick' serisini öğretir.


const ChartComponent = ({ symbol, interval, chartData, testResults, onSettingsClick }) => {
  
  const { buySignals, sellSignals } = useMemo(() => {
    if (!testResults || !testResults.trades) {
      return { buySignals: [], sellSignals: [] };
    }

    const buys = [];
    const sells = [];

    testResults.trades.forEach(trade => {
      const buyCandle = chartData[trade.entryIndex];
      const sellCandle = chartData[trade.exitIndex];

      if (buyCandle) {
        buys.push({
          x: buyCandle.time,
          y: buyCandle.low * 0.995,
        });
      }
      
      if (sellCandle) {
        sells.push({
          x: sellCandle.time,
          y: sellCandle.high * 1.005,
        });
      }
    });

    return { buySignals: buys, sellSignals: sells };
  }, [testResults, chartData]);

  const options = {
    title: { text: `${symbol} Fiyat Grafiği (${interval})` },
    rangeSelector: { selected: 5 },
    plotOptions: {
        candlestick: {
            color: '#F44336',
            upColor: '#4CAF50'
        }
    },
    series: [
      {
        type: 'candlestick',
        id: symbol,
        name: symbol,
        data: chartData.map(d => [d.time, d.open, d.high, d.low, d.close]),
      },
      {
        type: 'scatter',
        name: 'Alım Sinyalleri',
        data: buySignals,
        onSeries: symbol,
        marker: {
          symbol: 'triangle',
          fillColor: '#4CAF50',
          lineWidth: 1,
          lineColor: '#388E3C',
          radius: 7
        },
        tooltip: { pointFormat: 'Alım Sinyali' }
      },
      {
        type: 'scatter',
        name: 'Satım Sinyalleri',
        data: sellSignals,
        onSeries: symbol,
        marker: {
          symbol: 'triangle-down',
          fillColor: '#F44336',
          lineWidth: 1,
          lineColor: '#D32F2F',
          radius: 7
        },
        tooltip: { pointFormat: 'Satım Sinyali' }
      }
    ]
  };

  if (!chartData || !chartData.length) {
    return <div>Grafik verisi bekleniyor...</div>;
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className="chart-toolbar">
        <button onClick={onSettingsClick} className="settings-btn">
          ⚙️ Ayarlar
        </button>
      </div>
      <HighchartsReact
        highcharts={Highcharts}
        constructorType={'stockChart'}
        options={options}
      />
    </div>
  );
};

export default ChartComponent;
