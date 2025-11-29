// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc } from "firebase/firestore";

// NOTE: Bypassing complex Canvas environment variables for stability
const firebaseConfig = {
    apiKey: "AIzaSyDznFuNqsNYTd8TTOvKmrSaS1Von0OauFk",
    authDomain: "synkly-local.firebaseapp.com",
    projectId: "synkly-local",
    storageBucket: "synkly-local.firebasestorage.app",
    messagingSenderId: "964755350474", 
    appId: "1:964755350474:web:0c46ae3a6ffd014620a533",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// YARDIMCI FONKSİYON 1: Users kök doküman referansı (Phantom Document çözümlemek için kritik)
export const getUserRootDocRef = (uid) => {
    // Path: users/{uid}
    return doc(db, "users", uid); 
};

// YARDIMCI FONKSİYON 2: Kullanıcı profil detayları
export const getUserProfileDocRef = (uid) => {
    // Path: users/{uid}/profile/user-details
    return doc(db, "users", uid, "profile", "user-details");
};

// YARDIMCI FONKSİYON 3: Kullanıcı program detayları
export const getUserScheduleDocRef = (uid) => {
    // Path: users/{uid}/schedule/current
    return doc(db, "users", uid, "schedule", "current");
};

export { app, auth, db };