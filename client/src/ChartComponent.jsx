// src/ChartComponent.jsx

import React, { useMemo } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';

const ChartComponent = ({ symbol, interval, chartData, testResults }) => {
  // YENİ: 'flagData' yerine 'buySignals' ve 'sellSignals' hesaplayan mantık
  const { buySignals, sellSignals } = useMemo(() => {
    if (!testResults || !testResults.trades) {
      return { buySignals: [], sellSignals: [] };
    }

    const buys = [];
    const sells = [];

    // Her bir tamamlanmış işlemi (al-sat döngüsü) döngüye al
    testResults.trades.forEach(trade => {
      const buyCandle = chartData[trade.entryIndex];
      const sellCandle = chartData[trade.exitIndex];

      // Alım sinyalini mumun altına yerleştir
      if (buyCandle) {
        buys.push({
          x: buyCandle.time,
          y: buyCandle.low * 0.995, // Mumun en düşüğünün biraz altına
        });
      }
      
      // Satım sinyalini mumun üzerine yerleştir
      if (sellCandle) {
        sells.push({
          x: sellCandle.time,
          y: sellCandle.high * 1.005, // Mumun en yükseğinin biraz üzerine
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
      // YENİ: Alım sinyalleri için scatter serisi
      {
        type: 'scatter',
        name: 'Alım Sinyalleri',
        data: buySignals,
        onSeries: symbol,
        marker: {
          symbol: 'triangle', // Yukarı ok sembolü
          fillColor: '#4CAF50', // Yeşil
          lineWidth: 1,
          lineColor: '#388E3C', // Koyu yeşil çerçeve
          radius: 7
        },
        tooltip: {
            pointFormat: 'Alım Sinyali'
        }
      },
      // YENİ: Satım sinyalleri için scatter serisi
      {
        type: 'scatter',
        name: 'Satım Sinyalleri',
        data: sellSignals,
        onSeries: symbol,
        marker: {
          symbol: 'triangle-down', // Aşağı ok sembolü
          fillColor: '#F44336', // Kırmızı
          lineWidth: 1,
          lineColor: '#D32F2F', // Koyu kırmızı çerçeve
          radius: 7
        },
        tooltip: {
            pointFormat: 'Satım Sinyali'
        }
      }
    ]
  };

  if (!chartData || !chartData.length) {
    return <div>Grafik verisi bekleniyor...</div>;
  }

  return (
    <HighchartsReact
      highcharts={Highcharts}
      constructorType={'stockChart'}
      options={options}
    />
  );
};

export default ChartComponent;