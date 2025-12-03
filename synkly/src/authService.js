// src/authService.js
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile,
    signOut,                    // Çıkış fonksiyonunu ekledim
    setPersistence,             // Kalıcılık ayarı
    browserSessionPersistence   // Tarayıcı kapanınca oturumu silme ayarı
} from "firebase/auth";

import { setDoc } from "firebase/firestore"; 
import { auth, getUserProfileDocRef, getUserRootDocRef } from './firebaseConfig'; 

// -----------------------------------------------------------
// Firestore'a kullanıcı verisini kaydetme fonksiyonum
// -----------------------------------------------------------
const saveUserDataToFirestore = async (uid, name, email) => {
    
    // 1. Dashboard'da isim "Unknown" çıkmasın diye ana dokümana da yazıyorum
    const rootDocRef = getUserRootDocRef(uid);
    await setDoc(rootDocRef, { 
        uid: uid,
        name: name,   // İsim eklendi
        email: email, // Email eklendi
        createdAt: new Date().toISOString()
    }, { merge: true }); 

    console.log("Kullanıcı ana dokümanı oluşturuldu.");

    // 2. Profil detaylarını alt koleksiyona atıyorum
    const userProfileDocRef = getUserProfileDocRef(uid);
    await setDoc(userProfileDocRef, {
        uid: uid,
        name: name,
        email: email,
        schedule: [], 
        optIn: false, 
    }, { merge: true });
    console.log("Profil detayları kaydedildi.");
};

// -----------------------------------------------------------
// KAYIT OLMA (SIGNUP) FONKSİYONUM
// -----------------------------------------------------------
export const handleSignup = async (email, password, username) => {
    try {
        // Tarayıcı kapanınca çıkış yapsın diye SESSION ayarı yapıyorum
        await setPersistence(auth, browserSessionPersistence);

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Auth profilindeki ismi güncelliyorum
        await updateProfile(user, {
            displayName: username,
        });

        // Veritabanına kaydını yapıyorum
        await saveUserDataToFirestore(user.uid, username, user.email); 

        // EKLENEN KISIM: Kayıt olduktan sonra direkt girmesin, login sayfasına dönsün
        await signOut(auth); 

        console.log("Kayıt tamam, login sayfasına yönlendiriliyor."); 
        return user;
    } catch (error) {
        console.error("Kayıt sırasında hata oldu:", error.message); 
        throw error; 
    }
};

// -----------------------------------------------------------
// GİRİŞ YAPMA (LOGIN) FONKSİYONUM
// -----------------------------------------------------------
export const handleLogin = async (email, password) => {
    try {
        // EKLENEN KISIM: Giriş yaparken "Tarayıcı kapanınca oturumu kapat" emrini veriyorum
        await setPersistence(auth, browserSessionPersistence);

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Giriş başarılı, user:", userCredential.user.uid);
        return userCredential.user;
    } catch (error) {
        console.error("Giriş hatası:", error.message); 
        throw error; 
    }
};