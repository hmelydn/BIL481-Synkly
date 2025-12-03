import React, { useState, useEffect } from 'react';
// Servisler
import { getAllSchedules, findAvailableFriends } from './matchingService';
import { createInvitation } from './invitationService';
import { collection, getDocs, doc, getDoc } from "firebase/firestore"; 
import { db } from './firebaseConfig';

// İkonlar
import { 
    User, Search, LogOut, Calendar, Clock, Sparkles, 
    Mail, CheckCircle, XCircle, MessageCircle, Send, X, Trash2,
    ChevronRight, ArrowLeft, Filter, ChevronDown, MapPin
} from 'lucide-react'; 

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
// Mekan Listesi
//const PLACES = ["Farketmez", "NAR", "ETÜMUTFAK", "SUBWAY", "STARBUCKS"]; filtrede kaldirdik yer secimi

const MainDashboard = ({ 
    user, 
    onLogout, 
    onNavigateToProfile,
    incomingInvitations = [], 
    sentInvitations = [],
    onRespondToInvite, 
    onOpenChat,
    onCancelInvite
}) => {
    // Görünüm State i
    const [activeTab, setActiveTab] = useState('matches'); 
    
    // Search ve Veri State leri
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [sendingInviteId, setSendingInviteId] = useState(null);

    // Eşleşme Verileri
    const [allMatchesData, setAllMatchesData] = useState([]); 
    
    // filtreleme state leri
    const [selectedDay, setSelectedDay] = useState("");       
    const [selectedTimeKey, setSelectedTimeKey] = useState(""); 
    //const [filterPlace, setFilterPlace] = useState("Farketmez"); filtrede place kaldirildi

    // isim cache
    // Davetlerdeki ID'lerin karşılığı olan isimleri burada tutacağız
    const [namesCache, setNamesCache] = useState({});

    // davetler icin isim cekme
    useEffect(() => {
        const fetchNamesForInvites = async () => {
            const idsToFetch = new Set();
            
            // Gelen ve Giden davetlerdeki, bizden farklı olan tüm ID leri topla
            [...incomingInvitations, ...sentInvitations].forEach(inv => {
                if (inv.fromUserId !== user.uid) idsToFetch.add(inv.fromUserId);
                if (inv.toUserId !== user.uid) idsToFetch.add(inv.toUserId);
            });

            const newCache = { ...namesCache };
            let needsUpdate = false;

            await Promise.all(Array.from(idsToFetch).map(async (uid) => {
                if (newCache[uid]) return; // Zaten çekmişsek tekrar çekme

                let foundName = "Unknown";
                try {
                    // 1. Ana dokümana bak
                    const userDoc = await getDoc(doc(db, "users", uid));
                    if (userDoc.exists() && userDoc.data().name) {
                        foundName = userDoc.data().name;
                    } else {
                        // 2. Profil dokümanına bak (Fallback)
                        const profileDoc = await getDoc(doc(db, "users", uid, "profile", "user-details"));
                        if (profileDoc.exists()) {
                            const d = profileDoc.data();
                            foundName = d.name || d.username || d.email?.split('@')[0] || "Unknown";
                        }
                    }
                } catch (e) {
                    console.error("İsim çekme hatası:", e);
                }

                newCache[uid] = foundName;
                needsUpdate = true;
            }));

            if (needsUpdate) {
                setNamesCache(newCache);
            }
        };

        if (incomingInvitations.length > 0 || sentInvitations.length > 0) {
            fetchNamesForInvites();
        }
    }, [incomingInvitations, sentInvitations, user.uid]); // namesCache dependency de yok, loop olmasın diye


    
// eslesme bulma
    
    const handleSearchMatches = async () => {
        setIsSearching(true);
        setSelectedDay("");
        setSelectedTimeKey("");

        setTimeout(async () => {
            try {
                const allSchedules = await getAllSchedules();
                const timeSlots = findAvailableFriends(user.uid, allSchedules);
                
                const usersRef = collection(db, "users");
                const snapshot = await getDocs(usersRef);
                const nameMap = {};

                await Promise.all(snapshot.docs.map(async (userDoc) => {
                    const userId = userDoc.id;
                    let userName = "Unknown";
                    const userData = userDoc.data();
                    
                    if (userData.name) {
                        userName = userData.name;
                    } else {
                        try {
                            const profileDocRef = doc(db, "users", userId, "profile", "user-details");
                            const profileSnap = await getDoc(profileDocRef);
                            if (profileSnap.exists()) {
                                const pData = profileSnap.data();
                                userName = pData.name || pData.username || pData.email?.split('@')[0] || "Unknown";
                            }
                        } catch (err) { }
                    }
                    nameMap[userId] = userName;
                }));

                const processedMatches = [];
                timeSlots.forEach(slot => {
                    const friendsInThisSlot = [];
                    slot.availableFriendsIds.forEach(friendId => {
                        if(friendId === user.uid) return;
                        friendsInThisSlot.push({
                            id: friendId,
                            name: nameMap[friendId] || "Friend",
                            uniqueKey: `${slot.day}-${slot.startTime}-${friendId}`
                        });
                    });

                    if (friendsInThisSlot.length > 0) {
                        processedMatches.push({
                            uniqueSlotId: `${slot.day}|${slot.startTime}`, 
                            day: slot.day,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            place: slot.place,
                            friends: friendsInThisSlot
                        });
                    }
                });

                setAllMatchesData(processedMatches);
                setHasSearched(true);
            } catch (error) {
                console.error(error);
                alert("Eşleşmeler getirilirken hata oluştu.");
            } finally {
                setIsSearching(false);
            }
        }, 600);
    };

    // davet gonderme

    const handleSendInvite = async (friendData, slotInfo) => {
        const alreadySent = sentInvitations.some(inv => 
            inv.toUserId === friendData.id && 
            inv.day === slotInfo.day && 
            inv.startTime === slotInfo.startTime && 
            inv.status === 'pending'
        );

        if (alreadySent) {
            alert("Bu kişiye zaten bekleyen bir davetin var.");
            return;
        }

        setSendingInviteId(friendData.uniqueKey);
        try {
            let myName = user.displayName || user.email?.split('@')[0] || "User";
            try {
                const myProfileRef = doc(db, "users", user.uid, "profile", "user-details");
                const myProfileSnap = await getDoc(myProfileRef);
                if (myProfileSnap.exists()) {
                    myName = myProfileSnap.data().name || myName;
                }
            } catch(e) { }

            await createInvitation({
                fromUserId: user.uid,
                fromUserName: myName,
                toUserId: friendData.id,
                slot: {
                    day: slotInfo.day,
                    startTime: slotInfo.startTime,
                    endTime: slotInfo.endTime
                }
            });
            alert("Davet başarıyla gönderildi!");
        } catch (error) {
            console.error(error);
            alert("Davet gönderilemedi.");
        } finally {
            setSendingInviteId(null);
        }
    };

    // yardimci filtreler

    const filteredByPlaceMatches = allMatchesData
    /*.filter(m => 
        filterPlace === "Farketmez" || m.place === filterPlace
    );*///filtrelemeyi place'e gore kaldirdim

    const availableDays = DAYS_ORDER.filter(day => 
        filteredByPlaceMatches.some(m => m.day === day)
    );

    const availableTimesForSelectedDay = filteredByPlaceMatches
        .filter(m => m.day === selectedDay)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const currentSelectedMatch = filteredByPlaceMatches.find(
        m => m.uniqueSlotId === selectedTimeKey
    );

    const pendingCount = incomingInvitations.filter(i => i.status === 'pending').length;
    const activeChats = [
        ...incomingInvitations.filter(i => i.status === 'accepted'),
        ...sentInvitations.filter(i => i.status === 'accepted')
    ];

    return (
        <div className="w-[1000px] max-w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-slate-100">
            
            {/* ================= SOL MENÜ ================= */}
            <div className="w-full md:w-1/3 bg-slate-50 p-6 flex flex-col border-r border-slate-100">
                <div className="mb-8">
                    <h1 className="text-2xl font-extrabold text-indigo-600 tracking-tight">Synkly.</h1>
                </div>

                <div className="flex-1 space-y-3">
                    <button onClick={onNavigateToProfile} className="w-full bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-3 hover:border-indigo-300 transition-all text-left">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                            <User className="w-5 h-5"/>
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 text-sm">Profilim</p>
                            <p className="text-xs text-slate-500">Programını Düzenle</p>
                        </div>
                    </button>

                    <div className="border-t border-slate-200 my-4"></div>

                    <button onClick={() => setActiveTab('matches')} className={`w-full p-3 rounded-xl flex items-center space-x-3 transition-all ${activeTab === 'matches' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <Search className="w-5 h-5"/>
                        <span className="font-bold text-sm">Eşleşme Bul</span>
                    </button>

                    <button onClick={() => setActiveTab('invites')} className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${activeTab === 'invites' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <div className="flex items-center space-x-3">
                            <Mail className="w-5 h-5"/>
                            <span className="font-bold text-sm">Davetler & Sohbet</span>
                        </div>
                        {pendingCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingCount}</span>
                        )}
                    </button>
                </div>

                <button onClick={onLogout} className="mt-auto flex items-center text-slate-500 hover:text-red-500 transition-colors p-2 text-sm font-medium">
                    <LogOut className="w-4 h-4 mr-2"/> Çıkış Yap
                </button>
            </div>

            {/* ================= SAĞ İÇERİK ================= */}
            <div className="w-full md:w-2/3 p-6 bg-white flex flex-col relative">
                
                {/* TAB 1: EŞLEŞME BUL */}
                {activeTab === 'matches' && (
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                                    <Sparkles className="w-6 h-6 text-yellow-500 mr-2 fill-current"/>
                                    Eşleşen Zamanlar
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">Önce tarat, sonra menüden zamanını seç.</p>
                            </div>
                            <button 
                                onClick={handleSearchMatches} 
                                disabled={isSearching} 
                                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center"
                            >
                                {isSearching ? "Taranıyor..." : <><Search className="w-4 h-4 mr-2"/> Eşleşmeleri Getir</>}
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {!hasSearched && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                                    <Search className="w-12 h-12 mb-4 text-slate-300"/>
                                    <p className="font-medium">Ortak boş zamanları görmek için sağ üstteki butona tıkla.</p>
                                </div>
                            )}

                            {hasSearched && allMatchesData.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                    <p className="font-medium">Maalesef hiçbir ortak boş zaman bulunamadı.</p>
                                </div>
                            )}

                            {hasSearched && allMatchesData.length > 0 && (
                                <div className="space-y-6">
                                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                                        <div className="flex items-center gap-2 mb-4 text-indigo-600 font-bold text-sm uppercase tracking-wide">
                                            <Filter className="w-4 h-4"/> Filtrele
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            

                                            {/* Gün Seçimi */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Hangi Gün?</label>
                                                <div className="relative">
                                                    <select 
                                                        value={selectedDay}
                                                        onChange={(e) => {
                                                            setSelectedDay(e.target.value);
                                                            setSelectedTimeKey("");
                                                        }}
                                                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-3 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 transition-all font-medium cursor-pointer"
                                                    >
                                                        <option value="" disabled>Gün Seçin...</option>
                                                        {availableDays.length === 0 ? (
                                                            <option disabled>Bu mekanda eşleşme yok</option>
                                                        ) : (
                                                            availableDays.map(day => (
                                                                <option key={day} value={day}>{day}</option>
                                                            ))
                                                        )}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                                        <ChevronDown className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Saat Seçimi */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Hangi Saat?</label>
                                                <div className="relative">
                                                    <select 
                                                        value={selectedTimeKey}
                                                        onChange={(e) => setSelectedTimeKey(e.target.value)}
                                                        disabled={!selectedDay}
                                                        className={`w-full appearance-none border py-3 px-4 pr-8 rounded-xl leading-tight focus:outline-none transition-all font-medium cursor-pointer
                                                            ${!selectedDay 
                                                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                                                                : 'bg-slate-50 border-slate-200 text-slate-700 focus:bg-white focus:border-indigo-500'}`
                                                        }
                                                    >
                                                        <option value="" disabled>
                                                            {!selectedDay ? "Önce Gün Seçin" : "Zaman Aralığı Seçin..."}
                                                        </option>
                                                        {availableTimesForSelectedDay.map(m => (
                                                            <option key={m.uniqueSlotId} value={m.uniqueSlotId}>
                                                                {m.startTime} - {m.endTime} ({m.friends.length} Kişi)
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                                        <ChevronDown className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        {!selectedDay ? (
                                            <div className="text-center text-slate-400 py-10 opacity-50">
                                                <Calendar className="w-10 h-10 mx-auto mb-2"/>
                                                <p>Lütfen menüden bir gün seçin.</p>
                                            </div>
                                        ) : !selectedTimeKey ? (
                                            <div className="text-center text-slate-400 py-10 opacity-50">
                                                <Clock className="w-10 h-10 mx-auto mb-2"/>
                                                <p>Şimdi bir zaman aralığı seçin.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h3 className="font-bold text-slate-700">
                                                        Uygun Arkadaşlar {currentSelectedMatch?.place ? `(@${currentSelectedMatch.place})` : ''}
                                                    </h3>
                                                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full">
                                                        {currentSelectedMatch?.friends.length} Kişi
                                                    </span>
                                                </div>

                                                {currentSelectedMatch?.friends.map((friendData) => (
                                                    <div key={friendData.uniqueKey} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-lg hover:border-indigo-200 transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                                                                {friendData.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-800">{friendData.name}</div>
                                                                <div className="text-xs text-green-600 flex items-center font-medium mt-0.5">
                                                                    <CheckCircle className="w-3 h-3 mr-1"/> Müsait
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleSendInvite(friendData, currentSelectedMatch)} 
                                                            disabled={sendingInviteId === friendData.uniqueKey} 
                                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md transition-all flex items-center disabled:opacity-50"
                                                        >
                                                            {sendingInviteId === friendData.uniqueKey ? "..." : <>Davet Et <Send className="w-3 h-3 ml-2"/></>}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: DAVETLER */}
                {activeTab === 'invites' && (
                    <div className="flex flex-col h-full overflow-hidden">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                            <Mail className="w-6 h-6 text-indigo-500 mr-2"/>
                            Davet Kutusu
                        </h2>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                            
                            {/* Gelenler */}
                            <div>
                                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Bekleyen İstekler</h3>
                                {incomingInvitations.filter(i => i.status === 'pending').length === 0 ? (
                                    <p className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200">Henüz yeni bir davetin yok.</p>
                                ) : (
                                    incomingInvitations.filter(i => i.status === 'pending').map(inv => (
                                        <div key={inv.id} className="bg-white border-l-4 border-yellow-400 p-4 rounded-lg shadow-sm mb-3 flex justify-between items-center">
                                            <div>
                                                {/*İsmi Cache'den al */}
                                                <p className="font-bold text-slate-800">
                                                    {inv.fromUserName || namesCache[inv.fromUserId] || "Bir Kullanıcı"}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1 flex items-center"><Clock className="w-3 h-3 mr-1"/> {inv.day}, {inv.startTime} - {inv.endTime}</p>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button onClick={() => onRespondToInvite(inv.id, 'rejected')} className="p-2 text-red-500 hover:bg-red-50 rounded-full" title="Reddet"><XCircle className="w-6 h-6"/></button>
                                                <button onClick={() => onRespondToInvite(inv.id, 'accepted')} className="p-2 text-green-500 hover:bg-green-50 rounded-full" title="Kabul Et"><CheckCircle className="w-6 h-6"/></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Sohbetler */}
                            <div>
                                <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider mb-3 mt-2">Aktif Sohbetler</h3>
                                {activeChats.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200">Henüz onaylanmış bir planın yok.</p>
                                ) : (
                                    activeChats.map(inv => {
                                        // Karşı tarafın ismini Cache'den al
                                        const otherUserId = inv.fromUserId === user.uid ? inv.toUserId : inv.fromUserId;
                                        const otherName = (inv.fromUserId !== user.uid ? inv.fromUserName : null) || namesCache[otherUserId] || "Arkadaş";

                                        return (
                                            <div key={inv.id} className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl shadow-sm mb-3 flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-indigo-900">{otherName}</p>
                                                    <p className="text-indigo-700 text-sm mt-1">{inv.day}, {inv.startTime}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => onOpenChat(inv)} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center shadow-md"><MessageCircle className="w-4 h-4 mr-2"/> Sohbet</button>
                                                    <button onClick={() => { if(window.confirm("Silmek istiyor musun?")) onCancelInvite(inv.id); }} className="p-2 bg-white text-red-500 border border-red-100 rounded-lg hover:bg-red-50"><Trash2 className="w-5 h-5"/></button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Gidenler */}
                            <div>
                                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3 mt-2">Gönderilen Davetler</h3>
                                {sentInvitations.filter(i => i.status === 'pending').length === 0 ? (
                                    <p className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200">Henüz yanıt bekleyen davetin yok.</p>
                                ) : (
                                    sentInvitations.filter(i => i.status === 'pending').map(inv => (
                                        <div key={inv.id} className="bg-white border border-slate-200 p-3 rounded-lg flex justify-between items-center mb-2 opacity-75 hover:opacity-100 transition-opacity">
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">
                                                    {/* Kime gönderildiğini göster */}
                                                    Kime: {namesCache[inv.toUserId] || "Arkadaş"}
                                                </p>
                                                <p className="text-xs text-slate-500">{inv.day}, {inv.startTime}</p>
                                            </div>
                                            <button onClick={() => onCancelInvite(inv.id)} className="text-xs text-red-400 hover:text-red-600 font-medium flex items-center px-2 py-1 hover:bg-red-50 rounded transition-colors"><X className="w-3 h-3 mr-1"/> İptal Et</button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MainDashboard;