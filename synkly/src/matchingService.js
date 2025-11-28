// src/matchingService.js
// Uygulamanın Backend Eşleştirme Mantığı

import { db } from "./firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

// Haftanın günleri için basit bir indeksleme yapalım (Pazartesi=0, Pazar=6)
const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// -------------------------------------------------------------
// YARDIMCI FONKSİYONLAR
// -------------------------------------------------------------

/**
 * HH:MM formatındaki saati, günün başlangıcından itibaren geçen dakika sayısına çevirir.
 * Örn: 09:30 -> 570 dakika
 * @param {string} timeStr - HH:MM formatında saat stringi.
 * @returns {number} Günün başlangıcından itibaren geçen dakika sayısı.
 */
const timeToMinutes = (timeStr) => {
    // String'i al ve : ile bölerek sayıya çevir
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Dakika formatını HH:MM formatına çevirir.
 * Örn: 570 -> "09:30"
 * @param {number} totalMinutes
 * @returns {string} HH:MM formatında saat stringi.
 */
const minutesToTime = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    // Tek basamaklı sayıların başına sıfır ekler (Örn: 9 -> 09)
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};


// -------------------------------------------------------------
// 1. VERİ ÇEKME (Firestore'dan)
// -------------------------------------------------------------

/**
 * Veritabanındaki tüm kullanıcıların (yapay veri dahil) programlarını çeker.
 * @returns {Promise<Array<Object>>} Tüm kullanıcıların program verilerini içeren dizi.
 */
export const getAllSchedules = async () => {
    try {
        const usersCollectionRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollectionRef);

        const allSchedules = [];

        // Her kullanıcının altındaki 'schedule' alt koleksiyonuna giriyoruz.
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            
            // users/{userId}/schedule/current yolunu hedef alıyoruz.
            const scheduleCollectionRef = collection(db, "users", userId, "schedule");
            const scheduleSnapshot = await getDocs(scheduleCollectionRef);

            scheduleSnapshot.forEach((doc) => {
                const scheduleData = doc.data();
                
                // Veriye kullanıcı ID'sini ekleyerek döndürüyoruz
                allSchedules.push({
                    userId: userId,
                    slots: scheduleData.slots || [], // Kaydettiğimiz ders slotları
                });
            });
        }

        console.log(`Veritabanından toplam ${allSchedules.length} program çekildi.`);
        return allSchedules;
        
    } catch (error) {
        console.error("Tüm programlar çekilirken bir hata oluştu:", error);
        return []; 
    }
};

// -------------------------------------------------------------
// 2. EŞLEŞTİRME MANTIĞI (Core Logic)
// -------------------------------------------------------------

/**
 * Tüm kullanıcı programlarını analiz ederek ortak boş zaman dilimlerini bulur.
 * 
 * @param {Array<Object>} allSchedules - Firestore'dan çekilen tüm programlar.
 * @returns {Array<Object>} Gün, Başlangıç ve Bitiş saati içeren ortak boş zaman slotları.
 */
export const findFreeSlots = (allSchedules) => {
    const busySlotCounts = new Map(); 
    const totalUsers = allSchedules.length;

    // 1. DOLU ZAMANLARI İŞARETLEME
    // Tüm dersleri yarım saatlik slotlara çevirip meşgul sayısını sayar.
    allSchedules.forEach(schedule => {
        schedule.slots.forEach(slot => {
            const dayIndex = DAYS_ORDER.indexOf(slot.day);
            if (dayIndex === -1) return; 

            let startMinutes = timeToMinutes(slot.startTime);
            let endMinutes = timeToMinutes(slot.endTime);

            if (endMinutes <= startMinutes) return; 

            // Yarım saatlik adımlarla ilerle (30 dakika = 1 slot)
            for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
                // Slot ID'si: "GünIndex_SaatDakika" (Örn: 0_540 = Pazartesi 09:00)
                const slotKey = `${dayIndex}_${currentMinutes}`;
                
                // Bu slotta meşgul olan kişi sayısını artır
                busySlotCounts.set(slotKey, (busySlotCounts.get(slotKey) || 0) + 1);
            }
        });
    });

    // 2. ORTAK BOŞ ZAMANLARI BULMA
    const freeSlots = [];
    
    // Haftanın her günü için döngü (00:00'dan 23:30'a kadar)
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        let currentFreeSlot = null;
        
        for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
            const slotKey = `${dayIndex}_${minutes}`;
            
            // Eğer o slotta meşgul olan kişi sayısı TOPLAM KULLANICI sayısından azsa, slot BOŞ demektir.
            const isFree = (busySlotCounts.get(slotKey) || 0) < totalUsers;

            if (isFree) {
                if (currentFreeSlot) {
                    // Mevcut boşluğu uzat
                    currentFreeSlot.endMinutes = minutes + 30;
                } else {
                    // Yeni bir boş zaman dilimi başlat
                    currentFreeSlot = { 
                        day: DAYS_ORDER[dayIndex], 
                        startMinutes: minutes, 
                        endMinutes: minutes + 30 
                    };
                }
            } else {
                // SLOT DOLU (Birisi o saatte meşgul)
                if (currentFreeSlot) {
                    // Önceki boş zaman dilimi bitti, bunu listeye ekle
                    freeSlots.push(currentFreeSlot);
                    currentFreeSlot = null;
                }
            }
        }
        
        // Gün sonunda kalan boş slotu ekle
        if (currentFreeSlot) {
            freeSlots.push(currentFreeSlot);
        }
    }

    // Sonuçları HH:MM formatına çevir ve döndür
    return freeSlots.map(slot => ({
        day: slot.day,
        startTime: minutesToTime(slot.startMinutes),
        endTime: minutesToTime(slot.endMinutes)
    }));
};