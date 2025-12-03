import React, { useState, useEffect } from 'react';
// YENİ: deleteUser eklendi
import { updateProfile, deleteUser } from "firebase/auth";
// YENİ: deleteDoc eklendi
import { doc, updateDoc, setDoc, getDoc, deleteDoc } from "firebase/firestore"; 
import { db } from './firebaseConfig';
import { saveSchedule, getSchedule } from './scheduleService'; 
// YENİ: AlertTriangle ikonu eklendi
import { Trash2, Plus, Save, ArrowLeft, Clock, Edit2, Check, X, Calendar, AlertTriangle, MapPin } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
// 08:30 - 18:30 arası
const TIMES = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];

// Seçilebilir Mekanlar Listesi (KÜTÜPHANE kaldırıldı)
const PLACES = ["Farketmez", "NAR", "ETÜMUTFAK", "SUBWAY", "STARBUCKS"];

const ProfilePage = ({ user, onNavigateToMain, onLogout }) => {
    // --- STATE YÖNETİMİ ---
    const [schedule, setSchedule] = useState([]);
    const [placePreference, setPlacePreference] = useState(""); 
    
    // Kullanıcı Adı Düzenleme
    const [displayName, setDisplayName] = useState(user.displayName || user.email.split('@')[0]);
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState("");

    // Slot Ekleme Seçimleri
    const [selectedDay, setSelectedDay] = useState(DAYS[0]);
    const [selectedStartTime, setSelectedStartTime] = useState(TIMES[0]);
    const [selectedEndTime, setSelectedEndTime] = useState(TIMES[2]);
    const [selectedSlotId, setSelectedSlotId] = useState(null);
    
    // Loading Durumları
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);
    const [isSavingName, setIsSavingName] = useState(false);

    // --- 1. VERİLERİ YÜKLE ---
    useEffect(() => {
        const loadData = async () => {
            if (user) {
                try {
                    // A) Schedule Verisini Çek
                    const schedData = await getSchedule(user.uid);
                    if (schedData) {
                        setSchedule(Array.isArray(schedData) ? schedData : (schedData.slots || []));
                        setPlacePreference(schedData.placePreference || "Farketmez"); 
                    }

                    // B) Firestore'dan güncel ismi çek (Auth gecikebilir)
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists() && userDoc.data().name) {
                        setDisplayName(userDoc.data().name);
                    }
                } catch (err) {
                    console.error("Veri yükleme hatası:", err);
                }
            }
        };
        loadData();
    }, [user]);

    // --- 2. KULLANICI ADI GÜNCELLEME ---
    const startEditingName = () => {
        setTempName(displayName);
        setIsEditingName(true);
    };

    const cancelEditingName = () => {
        setIsEditingName(false);
        setTempName("");
    };

    const saveName = async () => {
        if (!tempName.trim()) return;
        setIsSavingName(true);
        try {
            // 1. Firebase Auth Profilini Güncelle
            await updateProfile(user, { displayName: tempName });
            
            // 2. Firestore 'users' koleksiyonunu güncelle
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, { 
                name: tempName,
                email: user.email,
                uid: user.uid 
            }, { merge: true });

            setDisplayName(tempName);
            setIsEditingName(false);
        } catch (error) {
            console.error("İsim güncelleme hatası:", error);
            alert("İsim güncellenemedi.");
        } finally {
            setIsSavingName(false);
        }
    };

    // --- 3. SCHEDULE YÖNETİMİ ---
    const handleAddSlot = () => {
        if (selectedStartTime >= selectedEndTime) {
            alert("Bitiş saati başlangıçtan sonra olmalı.");
            return;
        }

        // Çakışma Kontrolü
        const isOverlap = schedule.some(s => 
            s.day === selectedDay && 
            ((selectedStartTime >= s.startTime && selectedStartTime < s.endTime) ||
             (selectedEndTime > s.startTime && selectedEndTime <= s.endTime))
        );

        if (isOverlap) {
            alert("Bu saat aralığında zaten bir dersin/kaydın var.");
            return;
        }

        const newSlot = {
            id: Date.now(),
            day: selectedDay,
            startTime: selectedStartTime,
            endTime: selectedEndTime,
            courseId: 'Dolu'
        };
        setSchedule([...schedule, newSlot]);
    };

    const handleDeleteSlot = () => {
        if (!selectedSlotId) return;
        setSchedule(schedule.filter(s => s.id !== selectedSlotId));
        setSelectedSlotId(null);
    };

    const handleSaveSchedule = async () => {
        setIsSavingSchedule(true);
        try {
            // placePreference bilgisini de kaydediyoruz
            await saveSchedule(user.uid, schedule, placePreference === "Farketmez" ? "" : placePreference);
            alert("Program ve tercihler başarıyla kaydedildi.");
        } catch (error) {
            console.error(error);
            alert("Kaydetme hatası oluştu.");
        } finally {
            setIsSavingSchedule(false);
        }
    };

    // --- 4. HESAP SİLME FONKSİYONU ---
    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm(
            "DİKKAT: Hesabını kalıcı olarak silmek üzeresin.\n\nBu işlem geri alınamaz ve tüm verilerin (programın, profilin) silinecektir.\n\nEmin misin?"
        );

        if (!confirmDelete) return;

        try {
            // 1. Firestore verisini sil (Kök doküman)
            await deleteDoc(doc(db, "users", user.uid));
            
            // 2. Auth kullanıcısını sil
            await deleteUser(user);
            
            alert("Hesabın başarıyla silindi.");
            if (onLogout) onLogout(); 
            
        } catch (error) {
            console.error("Hesap silme hatası:", error);
            if (error.code === 'auth/requires-recent-login') {
                alert("Güvenlik gereği hesabını silmek için çıkış yapıp tekrar giriş yapmalısın.");
            } else {
                alert("Hesap silinirken bir hata oluştu.");
            }
        }
    };

    // Görsel sıralama
    const sortedSchedule = [...schedule].sort((a, b) => {
        const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return a.startTime.localeCompare(b.startTime);
    });

    return (
        <div className="w-[800px] max-w-full flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 min-h-[600px]">
            
            {/* --- HEADER --- */}
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                <button 
                    onClick={onNavigateToMain} 
                    className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors font-bold text-sm"
                >
                    <ArrowLeft className="w-5 h-5 mr-1"/> Geri Dön
                </button>
                <h2 className="text-xl font-bold text-slate-800">Profil Ayarları</h2>
                <div className="w-20"></div> {/* Spacer */}
            </div>

            <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                
                {/* --- KULLANICI BİLGİLERİ --- */}
                <div className="flex flex-col md:flex-row items-center gap-6 mb-8 pb-8 border-b border-slate-100">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-4xl font-bold shadow-xl shadow-indigo-200">
                        {displayName ? displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-1 h-10">
                            {isEditingName ? (
                                <>
                                    <input 
                                        type="text" 
                                        value={tempName}
                                        onChange={(e) => setTempName(e.target.value)}
                                        className="border-b-2 border-indigo-500 outline-none text-2xl font-bold text-slate-800 w-48 bg-transparent"
                                        autoFocus
                                    />
                                    <button onClick={saveName} disabled={isSavingName} className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors">
                                        <Check className="w-5 h-5"/>
                                    </button>
                                    <button onClick={cancelEditingName} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors">
                                        <X className="w-5 h-5"/>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-3xl font-bold text-slate-800">{displayName}</h3>
                                    <button onClick={startEditingName} className="text-slate-400 hover:text-indigo-600 transition-colors" title="İsmi Düzenle">
                                        <Edit2 className="w-5 h-5"/>
                                    </button>
                                </>
                            )}
                        </div>
                        <p className="text-slate-500 font-medium">{user.email}</p>
                    </div>
                </div>

                {/* --- MEKAN TERCİHİ SEÇİMİ --- */}
                <div className="mb-8 bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-full text-indigo-600 shadow-sm border border-indigo-50">
                            <MapPin className="w-6 h-6"/>
                        </div>
                        <div>
                            <h4 className="font-bold text-indigo-900 text-sm">Favori Mekan</h4>
                            <p className="text-xs text-indigo-600">Eşleşmelerde öncelikli kullanılır.</p>
                        </div>
                    </div>
                    <select 
                        value={placePreference}
                        onChange={(e) => setPlacePreference(e.target.value)}
                        className="bg-white border border-indigo-200 text-indigo-900 text-sm font-bold rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm w-48"
                    >
                        {PLACES.map(place => (
                            <option key={place} value={place}>{place}</option>
                        ))}
                    </select>
                </div>

                {/* --- DERS PROGRAMI --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* SOL KOLON: Program Listesi */}
                    <div className="flex flex-col">
                        <div className="flex justify-between items-end mb-4">
                            <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider flex items-center">
                                <Clock className="w-4 h-4 mr-2"/> Dolu Zamanların
                            </label>
                            <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg">
                                {schedule.length} Kayıt
                            </span>
                        </div>
                        
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 h-80 overflow-y-auto custom-scrollbar p-3 relative">
                            {sortedSchedule.length === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                    <Calendar className="w-10 h-10 mb-3 opacity-30"/>
                                    <p className="text-sm font-medium">Programın boş görünüyor.</p>
                                    <p className="text-xs mt-1">Yandaki panelden ders ekleyebilirsin.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {sortedSchedule.map((slot) => (
                                        <div 
                                            key={slot.id} 
                                            onClick={() => setSelectedSlotId(slot.id)}
                                            className={`p-3 rounded-xl cursor-pointer flex justify-between items-center transition-all border-l-4 ${
                                                selectedSlotId === slot.id 
                                                ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-100' 
                                                : 'bg-white border-transparent hover:border-indigo-200 hover:shadow-sm'
                                            }`}
                                        >
                                            <div>
                                                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">{slot.day}</span>
                                                <span className="font-bold text-slate-700">{slot.startTime} - {slot.endTime}</span>
                                            </div>
                                            {selectedSlotId === slot.id && (
                                                <Trash2 className="w-5 h-5 text-red-500 animate-pulse"/>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Silme Butonu */}
                        <button 
                            onClick={handleDeleteSlot} 
                            disabled={!selectedSlotId}
                            className={`w-full mt-3 py-2 rounded-xl font-bold text-sm flex items-center justify-center transition-all ${
                                !selectedSlotId 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                        >
                            <Trash2 className="w-4 h-4 mr-2"/> Seçili Kaydı Sil
                        </button>

                        {/* HESAP SİLME BÖLÜMÜ */}
                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <button 
                                onClick={handleDeleteAccount}
                                className="w-full flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 py-3 rounded-xl transition-colors text-sm font-bold border border-transparent hover:border-red-100"
                            >
                                <AlertTriangle className="w-4 h-4 mr-2"/> Hesabı Kalıcı Olarak Sil
                            </button>
                        </div>
                    </div>

                    {/* SAĞ KOLON: Ekleme Formu */}
                    <div className="flex flex-col">
                        <div className="bg-white border-2 border-dashed border-slate-200 p-6 rounded-2xl">
                            <h4 className="font-bold text-slate-800 mb-4 flex items-center">
                                <Plus className="w-5 h-5 mr-2 text-indigo-600"/> Yeni Zaman Ekle
                            </h4>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Gün</label>
                                    <select 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" 
                                        onChange={(e)=>setSelectedDay(e.target.value)}
                                        value={selectedDay}
                                    >
                                        {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Başlangıç</label>
                                        <select 
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" 
                                            onChange={(e)=>setSelectedStartTime(e.target.value)} 
                                            value={selectedStartTime}
                                        >
                                            {TIMES.map(t=><option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Bitiş</label>
                                        <select 
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" 
                                            onChange={(e)=>setSelectedEndTime(e.target.value)} 
                                            value={selectedEndTime}
                                        >
                                            {TIMES.map(t=><option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleAddSlot} 
                                    className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors flex items-center justify-center shadow-lg shadow-slate-200 mt-2"
                                >
                                    <Plus className="w-5 h-5 mr-2"/> Listeye Ekle
                                </button>
                            </div>
                        </div>

                        {/* Kaydet Butonu */}
                        <div className="mt-auto pt-6">
                            <button 
                                onClick={handleSaveSchedule} 
                                disabled={isSavingSchedule}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-200 flex items-center justify-center transition-all transform active:scale-[0.98]"
                            >
                                {isSavingSchedule ? (
                                    'Kaydediliyor...'
                                ) : (
                                    <><Save className="w-6 h-6 mr-2"/> Tüm Değişiklikleri Kaydet</>
                                )}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ProfilePage;