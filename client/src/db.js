// src/db.js
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

// Strateji kaydet
export const saveStrategy = async (userId, code) => {
  await addDoc(collection(db, "strategies"), {
    userId,
    code,
    createdAt: new Date()
  });
};

// Stratejileri getir
export const getStrategies = async (userId) => {
  const q = query(collection(db, "strategies"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
