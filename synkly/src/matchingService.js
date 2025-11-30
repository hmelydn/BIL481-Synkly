import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db, getUserProfileDocRef } from "./firebaseConfig"; // ❗ getUserProfileDocRef import edildi!

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
// ✅ Eşleştirme aralığı 08:30'da başlar ve 18:30'da biter.
const MATCHING_START_TIME = '08:30'; 
const MATCHING_END_TIME = '18:30';   

// -------------------------------------------------------------
// HELPER FUNCTIONS 
// -------------------------------------------------------------
// Zaman stringini dakikaya çevirirken null/undefined kontrolü yap
const timeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") {
        console.warn("timeToMinutes: invalid timeStr:", timeStr);
        return null; // ❗ bozuk slotları atlamak için null
    }

    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        console.warn("timeToMinutes: NaN parsed from:", timeStr);
        return null;
    }

    return hours * 60 + minutes;
};


const minutesToTime = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Eşleştirme döngüsünün başlangıç ve bitiş dakikalarını hesaplar
const START_MINUTES = timeToMinutes(MATCHING_START_TIME); // 510 dakika (08:30)
const END_MINUTES = timeToMinutes(MATCHING_END_TIME);     // 1110 dakika (18:30)

// YARDIMCI FONKSİYON: UID'den kullanıcı adını çeker (Sadece yedek olarak)
const fetchUserName = async (uid) => {
    try {
        const userProfileRef = getUserProfileDocRef(uid);
        const docSnap = await getDoc(userProfileRef);
        if (docSnap.exists()) {
            return docSnap.data().name || `User (${uid.substring(0, 4)}...)`;
        }
        return `User (${uid.substring(0, 4)}...)`;
    } catch (error) {
        console.error("Error fetching username for UID:", uid, error);
        return `User (${uid.substring(0, 4)}...)`;
    }
};

// -------------------------------------------------------------
// 1. DATA FETCHING (Veri Çekme) - GÜNCELLENDİ
// -------------------------------------------------------------

export const getAllSchedules = async () => {
    try {
        const usersCollectionRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollectionRef); 

        const allSchedules = [];
        
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            
            // 1. Programı Çek
            const scheduleDocRef = doc(db, "users", userId, "schedule", "current");
            const scheduleDoc = await getDoc(scheduleDocRef);

            // 2. Kullanıcı Profilini Çek (Adı Almak İçin)
            const profileDocRef = getUserProfileDocRef(userId); 
            const profileDoc = await getDoc(profileDocRef);
            const userName = profileDoc.exists() ? profileDoc.data().name : null; // ❗ Ad çekildi


            if (scheduleDoc.exists()) {
                const scheduleData = scheduleDoc.data();
                
                allSchedules.push({
                userId: userId,
                slots: scheduleData.slots || [],
                placePreference: scheduleData.placePreference || null,
            });

            }
        }

        console.log(`Fetched total ${allSchedules.length} schedules from the database.`);
        return allSchedules;
        
    } catch (error) {
        console.error("CRITICAL ERROR in getAllSchedules:", error); 
        return []; 
    }
};

// -------------------------------------------------------------
// 2. MATCHING LOGIC (Eşleştirme Mantığı) - GÜNCELLENDİ
// -------------------------------------------------------------

/*export const findAvailableFriends = (currentUserId, allSchedules) => {
    
    const currentUserSchedule = allSchedules.find(s => s.userId === currentUserId) || {
        userId: currentUserId,
        slots: []
    };

    const otherSchedules = allSchedules.filter(s => s.userId !== currentUserId);

    // Arkadaşların ID ve Ad haritasını oluştur (hızlı arama için)
    const friendDetailsMap = new Map(otherSchedules.map(s => [
        s.userId, 
        { 
            id: s.userId, 
            name: s.userName || `User (${s.userId.substring(0, 4)}…)` // ❗ Ad veya kesik UID
        }
    ]));


    // ---------------------------------------------------------
    // 2) KULLANICININ MEŞGUL OLDUĞU SLOT'LARI İŞARETLE
    // ---------------------------------------------------------
    const currentUserBusySlots = new Set();

    currentUserSchedule.slots.forEach(slot => {
        const dayIndex = DAYS_ORDER.indexOf(slot.day);
        if (dayIndex === -1) return;

        if (!slot.startTime || !slot.endTime) {
            console.warn("timeToMinutes: invalid timeStr (currentUser slot):", slot);
            return;
        }

        let startMinutes = timeToMinutes(slot.startTime);
        let endMinutes = timeToMinutes(slot.endTime);

        // ❗ Eğer start veya end bozuksa bu slotu tamamen atla
        if (startMinutes === null || endMinutes === null) {
            console.warn("Skipping invalid currentUser slot:", slot);
            return; // forEach içindeki bu slotu geç
        }


        for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
            currentUserBusySlots.add(`${dayIndex}_${currentMinutes}`);
        }
    });

    // ---------------------------------------------------------
    // 3) DİĞER KULLANICILARIN MEŞGUL SLOT HARİTASI
    // ---------------------------------------------------------
    const userBusyMap = new Map();

    otherSchedules.forEach(schedule => {
        schedule.slots.forEach(slot => {
            const dayIndex = DAYS_ORDER.indexOf(slot.day);
            if (dayIndex === -1) return;

            if (!slot.startTime || !slot.endTime) {
                console.warn("timeToMinutes: invalid timeStr (otherUser slot):", slot);
                return;
            }

            let startMinutes = timeToMinutes(slot.startTime);
            let endMinutes = timeToMinutes(slot.endTime);

            if (startMinutes === null || endMinutes === null) {
            console.warn("Skipping invalid otherUser slot:", slot);
            return;
        }

            for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
                const slotKey = `${dayIndex}_${currentMinutes}`;
                if (!userBusyMap.has(slotKey)) {
                    userBusyMap.set(slotKey, new Set());
                }
                userBusyMap.get(slotKey).add(schedule.userId);
            }
        });
    });

    // ---------------------------------------------------------
    // 4) EŞLEŞTİRME VE BİRLEŞTİRME
    // ---------------------------------------------------------
    const availableSlots = [];
    let currentAvailableSlot = null;

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += 30) {
            const slotKey = `${dayIndex}_${minutes}`;

            // 1) Sen bu 30 dakikada boş musun?
            const isUserFree = !currentUserBusySlots.has(slotKey);

            if (isUserFree) {
                const busyFriends = userBusyMap.get(slotKey) || new Set();

                // 2) Bu 30 dakikada boş olan diğer kullanıcıların ID'leri
                const freeFriendIds = otherSchedules
                    .map(schedule => schedule.userId)
                    .filter(friendId => !busyFriends.has(friendId));

                // 3) PLACE FİLTRESİ
                const availableFriendsList = freeFriendIds.filter(friendId => {
                    const friendPlace = userPlacePreference.get(friendId) || null;

                    if (!currentUserPlace || !friendPlace) return true;
                    return friendPlace === currentUserPlace;
                }).map(friendId => friendDetailsMap.get(friendId)); // ❗ ID'leri obje (ID+Name) listesine çevirdik

                const availableFriendsCount = availableFriendsList.length;

                if (availableFriendsCount > 0) {
                    const slotInfo = {
                        day: DAYS_ORDER[dayIndex],
                        startMinutes: minutes,
                        endMinutes: minutes + 30,
                        availableCount: availableFriendsCount,
                        availableFriends: availableFriendsList, // ❗ Yeni liste (ID ve Name içeriyor)
                        place: currentUserPlace || null,
                    };

                    // Aynı gündeki ardışık 30 dk blokları tek slotta birleştirme
                    
                    // Mevcut slotun ve yeni slotun arkadaş listelerinin ID'lerini karşılaştır
                    const newFriendIds = availableFriendsList.map(f => f.id);
                    const oldFriendIds = currentAvailableSlot ? currentAvailableSlot.availableFriends.map(f => f.id) : [];
                    
                    const friendsMatch =
                        currentAvailableSlot &&
                        oldFriendIds.length === newFriendIds.length &&
                        oldFriendIds.every(id => newFriendIds.includes(id)) &&
                        currentAvailableSlot.place === slotInfo.place;
                        

                    if (friendsMatch && currentAvailableSlot.day === slotInfo.day) {
                        currentAvailableSlot.endMinutes = minutes + 30;
                    } else {
                        if (currentAvailableSlot) {
                            availableSlots.push(currentAvailableSlot);
                        }
                        currentAvailableSlot = slotInfo;
                    }
                } else {
                    if (currentAvailableSlot) {
                        availableSlots.push(currentAvailableSlot);
                        currentAvailableSlot = null;
                    }
                }
            } else {
                if (currentAvailableSlot) {
                    availableSlots.push(currentAvailableSlot);
                    currentAvailableSlot = null;
                }
            }
        }

        // Gün sonu temizliği
        if (currentAvailableSlot) {
            availableSlots.push(currentAvailableSlot);
            currentAvailableSlot = null;
        }
    }

    // Final formatlama ve filtreleme
    return availableSlots.map(slot => ({
        day: slot.day,
        startTime: minutesToTime(slot.startMinutes),
        endTime: minutesToTime(slot.endMinutes),
        availableCount: slot.availableCount,
        availableFriendsIds: slot.availableFriendsIds || []
    })).filter(slot => slot.availableCount > 0);
};*/

export const findAvailableFriends = (currentUserId, allSchedules) => {
    // ---------------------------------------------------------
    // 0) Her kullanıcı için place tercihini çıkar
    //    -> Veride genelde tüm slot'lar aynı place'e sahip, o yüzden
    //       ilk bulduğumuz place'i o kullanıcı için tercih olarak alıyoruz.
    // ---------------------------------------------------------
    // Her kullanıcı için placePreference doğrudan dokümandan okunur
    const userPlacePreference = new Map(); // userId -> place (örn: "NAR")

    allSchedules.forEach(schedule => {
        const place = schedule.placePreference || null;
        userPlacePreference.set(schedule.userId, place);
    });

    const currentUserPlace = userPlacePreference.get(currentUserId) || null;


    // ---------------------------------------------------------
    // 1) Kullanıcının kendi programını ve diğerlerini ayır
    // ---------------------------------------------------------
    const currentUserSchedule = allSchedules.find(s => s.userId === currentUserId) || {
        userId: currentUserId,
        slots: []
    };

    const otherSchedules = allSchedules.filter(s => s.userId !== currentUserId);

    // ---------------------------------------------------------
    // 2) KULLANICININ MEŞGUL OLDUĞU SLOT'LARI İŞARETLE
    // ---------------------------------------------------------
    const currentUserBusySlots = new Set();

    currentUserSchedule.slots.forEach(slot => {
        const dayIndex = DAYS_ORDER.indexOf(slot.day);
        if (dayIndex === -1) return;

        if (!slot.startTime || !slot.endTime) {
            console.warn("timeToMinutes: invalid timeStr (currentUser slot):", slot);
            return;
        }

        let startMinutes = timeToMinutes(slot.startTime);
        let endMinutes = timeToMinutes(slot.endTime);

        for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
            currentUserBusySlots.add(`${dayIndex}_${currentMinutes}`);
        }
    });

    // ---------------------------------------------------------
    // 3) DİĞER KULLANICILARIN MEŞGUL SLOT HARİTASI
    //    userBusyMap: key = "dayIndex_minutes" -> Set(userId)
    // ---------------------------------------------------------
    const userBusyMap = new Map();

    otherSchedules.forEach(schedule => {
        schedule.slots.forEach(slot => {
            const dayIndex = DAYS_ORDER.indexOf(slot.day);
            if (dayIndex === -1) return;

            if (!slot.startTime || !slot.endTime) {
                console.warn("timeToMinutes: invalid timeStr (otherUser slot):", slot);
                return;
            }

            let startMinutes = timeToMinutes(slot.startTime);
            let endMinutes = timeToMinutes(slot.endTime);

            for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
                const slotKey = `${dayIndex}_${currentMinutes}`;
                if (!userBusyMap.has(slotKey)) {
                    userBusyMap.set(slotKey, new Set());
                }
                userBusyMap.get(slotKey).add(schedule.userId);
            }
        });
    });

    // ---------------------------------------------------------
    // 4) EŞLEŞTİRME: 08:30 - 18:30 ARASINDA
    //    + PLACE FİLTRESİ:
    //      - Hem sen boş olacaksın
    //      - Hem diğer user boş olacak
    //      - Ve place tercihleri eşit olacak (ikisi de tanımlı ise)
    // ---------------------------------------------------------
    const availableSlots = [];
    let currentAvailableSlot = null;

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += 30) {
            const slotKey = `${dayIndex}_${minutes}`;

            // 1) Sen bu 30 dakikada boş musun?
            const isUserFree = !currentUserBusySlots.has(slotKey);

            if (isUserFree) {
                const busyFriends = userBusyMap.get(slotKey) || new Set();

                // 2) Bu 30 dakikada boş olan diğer kullanıcılar
                const freeFriendIds = otherSchedules
                    .map(schedule => schedule.userId)
                    .filter(friendId => !busyFriends.has(friendId));

                // 3) PLACE FİLTRESİ
                const availableFriendIds = freeFriendIds.filter(friendId => {
                    const friendPlace = userPlacePreference.get(friendId) || null;

                    // Eğer ikisinden biri place belirtmemişse, çok katı davranmayalım:
                    // Böyle kullanıcıları "her yerde olurum" gibi kabul ediyoruz.
                    if (!currentUserPlace || !friendPlace) return true;

                    // İkisi de place belirttiyse, eşit olmalı
                    return friendPlace === currentUserPlace;
                });

                const availableFriendsCount = availableFriendIds.length;

                if (availableFriendsCount > 0) {
                    const slotInfo = {
                        day: DAYS_ORDER[dayIndex],
                        startMinutes: minutes,
                        endMinutes: minutes + 30,
                        availableCount: availableFriendsCount,
                        availableFriendsIds: availableFriendIds,
                        // Bu slot için ortak place bilgisi (şimdilik senin tercihin)
                        place: currentUserPlace || null,
                    };

                    // Aynı gündeki ardışık 30 dk blokları tek slotta birleştirme
                    const friendsMatch =
                        currentAvailableSlot &&
                        currentAvailableSlot.availableFriendsIds.length === availableFriendIds.length &&
                        currentAvailableSlot.availableFriendsIds.every(id =>
                            availableFriendIds.includes(id)
                        ) &&
                        currentAvailableSlot.place === slotInfo.place;

                    if (friendsMatch && currentAvailableSlot.day === slotInfo.day) {
                        currentAvailableSlot.endMinutes = minutes + 30;
                    } else {
                        if (currentAvailableSlot) {
                            availableSlots.push(currentAvailableSlot);
                        }
                        currentAvailableSlot = slotInfo;
                    }
                } else {
                    if (currentAvailableSlot) {
                        availableSlots.push(currentAvailableSlot);
                        currentAvailableSlot = null;
                    }
                }
            } else {
                if (currentAvailableSlot) {
                    availableSlots.push(currentAvailableSlot);
                    currentAvailableSlot = null;
                }
            }
        }

        // Gün sonu temizliği
        if (currentAvailableSlot) {
            availableSlots.push(currentAvailableSlot);
            currentAvailableSlot = null;
        }
    }

    // ---------------------------------------------------------
    // 5) Çıktıyı UI için formatla
    // ---------------------------------------------------------
    return availableSlots
        .map(slot => ({
            day: slot.day,
            startTime: minutesToTime(slot.startMinutes),
            endTime: minutesToTime(slot.endMinutes),
            availableCount: slot.availableCount,
            availableFriendsIds: slot.availableFriendsIds || [],
            place: slot.place || null,
        }))
        .filter(slot => slot.availableCount > 0);
};