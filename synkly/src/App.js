import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'; 
import { app } from './firebaseConfig';
import Login from './Login';
import Signup from './Signup';
import ScheduleInput from './ScheduleInput'; // <-- EKLENDİ!

// -----------------------------------------------------
// Ana Uygulama Bileşeni (Routing ve Auth Durum Yönetimi)
// -----------------------------------------------------
const App = () => {
    const [currentScreen, setCurrentScreen] = useState('login'); 
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // Firebase Auth Durumunu Dinleme
    useEffect(() => {
        const auth = getAuth(app);
        
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthReady(true);
            console.log('Auth State Changed:', currentUser ? currentUser.uid : 'Logged out');
        });

        return () => unsubscribe();
    }, []);

    const handleNavigate = (screenName) => {
        setCurrentScreen(screenName);
    };

    const handleAuthSuccess = (loggedInUser) => {
        setUser(loggedInUser);
        setCurrentScreen('dashboard'); 
    };

    const handleLogout = async () => {
        try {
            const auth = getAuth(app);
            await signOut(auth);
            setUser(null);
            handleNavigate('login');
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    // -----------------------------------------------------
    // RENDER AŞAMASI
    // -----------------------------------------------------

    if (!isAuthReady) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-700 bg-gray-50">
                Uygulama Yükleniyor...
            </div>
        );
    }

    // 2. Kullanıcı giriş yaptıysa Dashboard'u (Ana Ekran) göster
    if (user) {
        return (
            <div className="min-h-screen p-4 bg-gray-50 flex flex-col items-center">
                {/* Header ve Çıkış Butonu */}
                <div className="w-full max-w-4xl bg-white p-6 rounded-lg shadow-lg mb-4 flex justify-between items-center border-b pb-4">
                    <h1 className="text-3xl font-bold text-blue-800">Synkly</h1>
                    <div className="flex items-center space-x-4">
                        <p className="text-sm text-gray-600 truncate max-w-xs">Hoşgeldiniz: {user.email}</p>
                        <button 
                            onClick={handleLogout}
                            className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-1.5 px-3 rounded-lg transition duration-150"
                        >
                            Çıkış Yap
                        </button>
                    </div>
                </div>

                {/* Ana İçerik: Ders Programı Girişi */}
                <ScheduleInput userId={user.uid} /> {/* <-- BURADA KULLANILDI */}
                
                {/* Eşleştirme Sistemi Bilgisi (Sıradaki Adım) */}
                <div className="w-full max-w-4xl mt-6 p-6 bg-white rounded-lg shadow-lg">
                    <h2 className="text-2xl font-semibold mb-3 text-blue-800">Sıradaki: Eşleştirme Sistemi</h2>
                    <p className="text-gray-600">
                         Ders programınızı kaydettikten sonra, ortak boş zamanları bulmak için "Eşleştirme" işlevini ekleyeceğiz.
                    </p>
                </div>

            </div>
        );
    }

    // 3. Giriş Yapılmadıysa (Login/Signup)
    switch (currentScreen) {
        case 'signup':
            return (
                <Signup 
                    onAuthSuccess={handleAuthSuccess} 
                    onNavigate={() => handleNavigate('login')} 
                />
            );
        case 'login':
        default:
            return (
                <Login 
                    onLoginSuccess={handleAuthSuccess} 
                    onNavigate={() => handleNavigate('signup')} 
                />
            );
    }
};

export default App;