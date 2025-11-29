// authService.js
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { setDoc } from "firebase/firestore"; 
import { auth, getUserProfileDocRef, getUserRootDocRef } from './firebaseConfig'; 

// -----------------------------------------------------------
// YARDIMCI FONKSİYON: Kullanıcı verilerini Firestore'a kaydeder (Kök Doküman Eklendi)
// -----------------------------------------------------------
const saveUserDataToFirestore = async (uid, name, email) => {
    
    // 1. KRİTİK ADIM: Kök Dokümanı Oluştur (getAllSchedules'ın 0 dönmesini engeller)
    const rootDocRef = getUserRootDocRef(uid);
    await setDoc(rootDocRef, { 
        uid: uid,
        createdAt: new Date().toISOString()
    });
    console.log("Root user document successfully created.");


    // 2. Adım: Profil Detaylarını Oluşturma (Mevcut işlev)
    const userProfileDocRef = getUserProfileDocRef(uid);
    
    await setDoc(userProfileDocRef, {
        uid: uid,
        name: name,
        email: email,
        schedule: [], 
        optIn: false, 
    });
    console.log("User profile data successfully saved to Firestore.");
};

// -----------------------------------------------------------
// KAYIT OLMA (SIGNUP)
// -----------------------------------------------------------
export const handleSignup = async (email, password, username) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Hem kök dokümanı hem de profil detaylarını kaydet
        await saveUserDataToFirestore(user.uid, username, user.email); 

        console.log("Sign-up successful, user:", user.uid); 
        return user;
    } catch (error) {
        console.error("Sign-up error:", error.message); 
        throw error; 
    }
};

// -----------------------------------------------------------
// GİRİŞ YAPMA (LOGIN)
// -----------------------------------------------------------
export const handleLogin = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("Login successful, user:", user.uid);
        return user;
    } catch (error) {
        console.error("Login error:", error.message); 
        throw error; 
    }
};