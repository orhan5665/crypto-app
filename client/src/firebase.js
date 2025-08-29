// Firebase SDK'larını içe aktarın
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore'; // Firestore için
import { getAuth } from 'firebase/auth'; // Kimlik Doğrulama için

// Firebase yapılandırma objeniz (bu bilgileri Firebase Konsolundan alabilirsiniz)
const firebaseConfig = {
  apiKey: "AIzaSyCfokh34qvC1hDn-y5hlV8AJrEu6wzuhzo",
  authDomain: "cryptoapp-907e7.firebaseapp.com",
  projectId: "cryptoapp-907e7",
  storageBucket: "cryptoapp-907e7.appspot.com",
  messagingSenderId: "281537800405",
  appId: "YOUR_APP_ID",
  measurementId: "G-YOUR_MEASUREMENT_ID"
};

// Firebase'i başlatın
const app = initializeApp(firebaseConfig);

// Firebase hizmetlerine erişin VE DIŞA AKTARIN (export!)
export const db = getFirestore(app); // Artık 'db' dışarıya aktarılıyor
export const auth = getAuth(app);   // Artık 'auth' dışarıya aktarılıyor

// İsterseniz 'app' değişkenini de dışa aktarabilirsiniz, bazen gerekebilir
// export const firebaseApp = app;
