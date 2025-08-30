// src/SettingsModal.jsx - YENİ DOSYA

import React, { useState } from 'react';

const SettingsModal = ({ initialParams, onSave, onClose }) => {
  const [params, setParams] = useState(initialParams);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setParams(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleSave = () => {
    onSave(params);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Strateji Ayarları</h2>
        
        <div className="form-group">
          <label>Başlangıç Bakiyesi ($)</label>
          <input 
            type="number" 
            name="initialBalance" 
            value={params.initialBalance} 
            onChange={handleChange} 
          />
        </div>
        
        <div className="form-group">
          <label>RSI Periyodu</label>
          <input 
            type="number" 
            name="rsiPeriod" 
            value={params.rsiPeriod} 
            onChange={handleChange} 
          />
        </div>
        
        <div className="form-group">
          <label>SMA Periyodu</label>
          <input 
            type="number" 
            name="smaPeriod" 
            value={params.smaPeriod} 
            onChange={handleChange} 
          />
        </div>

        <div className="modal-actions">
          <button onClick={handleSave}>Kaydet</button>
          <button onClick={onClose}>İptal</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;