// src/App.js
import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'; 
import { app } from './firebaseConfig';

// Sayfa Bileşenleri
import Login from './Login';
import Signup from './Signup';
import MainDashboard from './MainDashboard';
import ProfilePage from './ProfilePage';
import ChatScreen from "./ChatScreen";

// Servisler
import { getIncomingInvitations, getSentInvitations, updateInvitationStatus, cancelInvitation } from "./invitationService";
import { getOrCreateChatForInvitation } from "./chatService";

const App = () => {
    // ---------------------------------------------------------------
    // 1. STATE YÖNETİMİ
    // ---------------------------------------------------------------
    
    // Navigasyon ve Kullanıcı Durumu
    const [currentScreen, setCurrentScreen] = useState('login'); 
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Veri Yönetimi (Davetler ve Sohbet)
    const [incomingInvitations, setIncomingInvitations] = useState([]);
    const [sentInvitations, setSentInvitations] = useState([]);
    const [activeChatId, setActiveChatId] = useState(null);
    const [activeChatInvitation, setActiveChatInvitation] = useState(null);

    // ---------------------------------------------------------------
    // 2. OTURUM YÖNETİMİ (Auth Listener)
    // ---------------------------------------------------------------
    useEffect(() => {
        const auth = getAuth(app);
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setAuthLoading(false);
            
            // Oturum açıldıysa dashboard'a yönlendir
            if (u) {
                if (currentScreen === 'login' || currentScreen === 'signup') {
                    setCurrentScreen('main');
                }
            } else {
                // KULLANICI YOKSA:
                // Sadece 'signup' ekranında DEĞİLSEK login'e at.
                // Böylece kayıt olma ekranında kalabiliriz.
                if (currentScreen !== 'signup') {
                    setCurrentScreen('login');
                }
            }
        });
        return () => unsubscribe();
    }, [currentScreen]);

    // ---------------------------------------------------------------
    // 3. VERİ SENKRONİZASYONU
    // ---------------------------------------------------------------
    useEffect(() => {
        if (!user) return;
        
        const loadInvites = async () => {
            try {
                const incoming = await getIncomingInvitations(user.uid);
                const sent = await getSentInvitations(user.uid);
                setIncomingInvitations(incoming);
                setSentInvitations(sent);
            } catch (error) {
                console.error("Veri çekme hatası:", error);
            }
        };

        loadInvites(); 
        
        // Verileri periyodik olarak güncelle (Polling: 5sn)
        const interval = setInterval(loadInvites, 5000); 
        return () => clearInterval(interval);
    }, [user]);

    // ---------------------------------------------------------------
    // 4. İŞLEYİCİ FONKSİYONLAR (Handlers)
    // ---------------------------------------------------------------
    
    const handleLogout = async () => {
        await signOut(getAuth(app));
        setUser(null);
        setCurrentScreen('login');
    };

    // Sohbet Ekranını Başlat
    const handleOpenChat = async (invitation) => {
        try {
            const chatId = await getOrCreateChatForInvitation(invitation);
            setActiveChatId(chatId);
            setActiveChatInvitation(invitation);
            setCurrentScreen("chat");
        } catch (error) {
            console.error("Chat başlatma hatası:", error);
            alert("Sohbet açılamadı.");
        }
    };

    // Davet Yanıtlama (Kabul/Red)
    const handleRespondToInvite = async (invitationId, newStatus) => {
        try {
            await updateInvitationStatus(invitationId, newStatus);
            
            // Listeleri güncelle
            const incoming = await getIncomingInvitations(user.uid);
            setIncomingInvitations(incoming);
            
            // Kabul edildiyse sohbeti aç
            if (newStatus === "accepted") {
                const inv = incoming.find(i => i.id === invitationId);
                if(inv) handleOpenChat(inv);
            }
        } catch (error) {
            console.error("Davet yanıtlama hatası:", error);
        }
    };

    // Davet İptali
    const handleCancelInvite = async (invitationId) => {
        if(window.confirm("Daveti iptal etmek istediğinize emin misiniz?")) {
            await cancelInvitation(invitationId);
            const sent = await getSentInvitations(user.uid);
            setSentInvitations(sent);
        }
    };

    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center font-bold text-indigo-600">Yükleniyor...</div>;
    }

    // ---------------------------------------------------------------
    // 5. Render
    // ---------------------------------------------------------------
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="w-full flex justify-center">
                
                {/* Giriş Ekranı */}
                {currentScreen === 'login' && (
                    <Login 
                        onLoginSuccess={() => setCurrentScreen('main')} 
                        onNavigateToSignup={() => setCurrentScreen('signup')} 
                    />
                )}
                
                {/* Kayıt Ekranı */}
                {currentScreen === 'signup' && (
                    <Signup 
                        onAuthSuccess={(u) => { setUser(u); setCurrentScreen('main'); }}
                        onNavigateToLogin={() => setCurrentScreen('login')} 
                    />
                )}
                
                {/* Ana Dashboard */}
                {currentScreen === 'main' && user && (
                    <MainDashboard 
                        user={user} 
                        onLogout={handleLogout} 
                        onNavigateToProfile={() => setCurrentScreen('profile')}
                        // Data Props
                        incomingInvitations={incomingInvitations}
                        sentInvitations={sentInvitations}
                        onRespondToInvite={handleRespondToInvite}
                        onOpenChat={handleOpenChat}
                        onCancelInvite={handleCancelInvite}
                    />
                )}
                
                {/* Profil Sayfası */}
                {currentScreen === 'profile' && user && (
                    <ProfilePage 
                        user={user} 
                        onNavigateToMain={() => setCurrentScreen('main')} 
                        onLogout={handleLogout} 
                    />
                )}

                {/* Sohbet Ekranı */}
                {currentScreen === 'chat' && user && (
                    <ChatScreen
                        user={user}
                        chatId={activeChatId}
                        invitation={activeChatInvitation}
                        onBack={() => setCurrentScreen("main")}
                    />
                )}
            </div>
        </div>
    );
};

export default App;