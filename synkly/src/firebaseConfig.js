// src/firebaseConfig.js (Lütfen bu kodu kullan)

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Global değişken kontrolleri kaldırıldı, doğrudan .env'ye güveniyoruz.

// 1. App ID'yi belirleme
const appId = process.env.REACT_APP_CANVAS_APP_ID || 'synkly-default-app-id';

// 2. Firebase Config objesini .env değişkenlerinden çeker
const firebaseConfig = {
    // ⚠️ Değerler SADECE .env.local dosyasından çekilecek!
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID, 
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Firebase'i başlatma
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Firestore'da kullanıcıya özel koleksiyon yolunu oluşturan yardımcı fonksiyon.
const getPrivateUserCollectionPath = (userId, collectionName) => {
    return `artifacts/${appId}/users/${userId}/${collectionName}`;
};

export { app, auth, db, getPrivateUserCollectionPath };