// src/Auth.jsx - GÜNCELLENMİŞ TAM KOD

import React, { useState } from 'react';
import { auth } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,         // YENİ: Google için gerekli
  signInWithPopup             // YENİ: Google için gerekli
} from "firebase/auth";

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // E-posta/şifre ile kayıt (Bu fonksiyon aynı kaldı)
  const handleRegister = async () => { /* ... */ };

  // E-posta/şifre ile giriş (Bu fonksiyon aynı kaldı)
  const handleLogin = async () => { /* ... */ };

  // YENİ: Google ile giriş yapma fonksiyonu
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider(); // Google sağlayıcısını oluştur
    try {
      await signInWithPopup(auth, provider); // Giriş penceresini aç
      setError('');
    } catch (err) {
      setError(err.message);
      console.error(err);
    }
  };

  return (
    <div className="auth-container">
      <div className="email-auth">
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-posta"
        />
        <input 
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Şifre"
        />
        <button onClick={handleLogin}>Giriş Yap</button>
        <button onClick={handleRegister}>Kayıt Ol</button>
      </div>

      <div className="separator">veya</div>

      {/* YENİ: Google ile giriş butonu */}
      <div className="social-auth">
        <button onClick={handleGoogleLogin} className="google-btn">
          Google ile Giriş Yap
        </button>
      </div>

      {error && <p className="auth-error">{error}</p>}
    </div>
  );
};

export default Auth;