import { auth, db, getPrivateUserCollectionPath } from './firebaseConfig'; // 1. YENİ: getPrivateUserCollectionPath içe aktarılıyor
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore"; 

// -----------------------------------------------------------
// YARDIMCI FONKSİYON: Kullanıcı verilerini Firestore'a kaydeder
// -----------------------------------------------------------
const saveUserDataToFirestore = async (uid, name, email) => {
    // ⚠️ DÜZELTME: Güvenlik kurallarına uygun özel kullanıcı yolu oluşturuluyor.
    const userDocRef = doc(db, getPrivateUserCollectionPath(uid, "profile"), "user-details");
    
    try {
        await setDoc(userDocRef, {
            uid: uid,
            name: name, // Kayıt sırasında aldığımız username buraya name olarak kaydedilecek
            email: email,
            schedule: [], // İlk giriş için boş program listesi
            optIn: false, // Gizlilik gereksinimi
        });
        console.log("User data successfully saved to Firestore.");
    } catch (error) {
        console.error("Error writing user data to Firestore:", error);
        throw error;
    }
};

// -----------------------------------------------------------
// KAYIT OLMA (SIGNUP)
// -----------------------------------------------------------
export const handleSignup = async (email, password, username) => {
    try {
        // 1. Firebase Auth ile hesap oluştur
        const userCredential = await createUserWithEmailAndPassword(
            auth, 
            email, 
            password
        );
        
        const user = userCredential.user;
        
        // 2. YENİ ADIM: Kullanıcı adını Firestore'a kaydet
        await saveUserDataToFirestore(user.uid, username, user.email); 

        console.log("Sign-up successful, user:", user); 
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
        const userCredential = await signInWithEmailAndPassword(
            auth, 
            email, 
            password
        );
        
        const user = userCredential.user;
        console.log("Login successful, user:", user);
        return user;

    } catch (error) {
        console.error("Login error:", error.message); 
        throw error; 
    }
};