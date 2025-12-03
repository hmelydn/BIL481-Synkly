import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig"; 

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
// Eşleştirme aralığı 08:30 da başlar ve 18:30 da biter
const MATCHING_START_TIME = '08:30'; 
const MATCHING_END_TIME = '18:30';   

// helper functions

// Zaman stringini dakikaya çevirirken null/undefined kontrolü yap
const timeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") {
        console.warn("timeToMinutes: invalid timeStr:", timeStr);
        return null; // bozuk slotları atlamak için null
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

// Eşleştirme döngüsünün başlangıç ve bitiş dakikalarını hesaplama
const START_MINUTES = timeToMinutes(MATCHING_START_TIME); // 510 dakika (08:30)
const END_MINUTES = timeToMinutes(MATCHING_END_TIME);     // 1110 dakika (18:30)


// data fetching (Veri Çekme)

// matchingService.js
export const getAllSchedules = async () => {
    try {
        const usersCollectionRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollectionRef); 

        const allSchedules = [];
        
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            
            const scheduleDocRef = doc(db, "users", userId, "schedule", "current");
            const scheduleDoc = await getDoc(scheduleDocRef);

            // Profil dokümanından isim çek
            const profileDocRef = doc(db, "users", userId, "profile", "user-details");
            const profileDoc = await getDoc(profileDocRef);

            let displayName = null;
            if (profileDoc.exists()) {
                const p = profileDoc.data();
                displayName = p.name || p.username || p.email || null;
            }

            if (scheduleDoc.exists()) {
                const scheduleData = scheduleDoc.data();
                
                allSchedules.push({
                displayName: displayName,
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


export const findAvailableFriends = (currentUserId, allSchedules) => {
    // 0) Her kullanıcı için place + isim map lerini çıkar
    const userPlacePreference = new Map(); // userId -> place 
    const userNameMap = new Map();        // userId -> displayName

    allSchedules.forEach(schedule => {
        const place = schedule.placePreference || null;
        userPlacePreference.set(schedule.userId, place);

        // displayName yoksa fallback olarak userId
        userNameMap.set(
            schedule.userId,
            schedule.displayName || schedule.userId
        );
    });

    const currentUserPlace = userPlacePreference.get(currentUserId) || null;

    
    // 1) Kullanıcının kendi programını ve diğerlerini ayır
    
    const currentUserSchedule = allSchedules.find(s => s.userId === currentUserId) || {
        userId: currentUserId,
        slots: []
    };

    const otherSchedules = allSchedules.filter(s => s.userId !== currentUserId);

    // kullanicinin bos oldugu slotlari isaretle
    
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


    // diger kullanicilarin slot filtresi
    // userBusyMap: key = "dayIndex_minutes" -> Set(userId)

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

    // eslestirme 08:30 - 18:30 arasinda + place filtresi
 
    const availableSlots = [];
    let currentAvailableSlot = null;

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += 30) {
            const slotKey = `${dayIndex}_${minutes}`;

            // bu 30 dakikada boş musun
            const isUserFree = !currentUserBusySlots.has(slotKey);

            if (isUserFree) {
                const busyFriends = userBusyMap.get(slotKey) || new Set();

                // 30 dakikada boş olan diğer kullanıcılar
                const freeFriendIds = otherSchedules
                    .map(schedule => schedule.userId)
                    .filter(friendId => !busyFriends.has(friendId));

                // place filtresi
                const availableFriendIds = freeFriendIds.filter(friendId => {
                    const friendPlace = userPlacePreference.get(friendId) || null;

                    //if (!currentUserPlace || !friendPlace) return true;
                    if (currentUserPlace && currentUserPlace !== "Farketmez") { //farketmez duzeltildi
                    return friendPlace === currentUserPlace;
                    }
                    return true;
                });

                const availableFriendsCount = availableFriendIds.length;

                if (availableFriendsCount > 0) {
                    // isim-objelerini oluşturuyoruz
                    const availableFriendObjs = availableFriendIds.map(friendId => ({
                        userId: friendId,
                        name: userNameMap.get(friendId) || friendId,
                    }));

                    const slotInfo = {
                        day: DAYS_ORDER[dayIndex],
                        startMinutes: minutes,
                        endMinutes: minutes + 30,
                        availableCount: availableFriendsCount,
                        availableFriendsIds: availableFriendIds,
                        availableFriends: availableFriendObjs,
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

        // son temizlik
        if (currentAvailableSlot) {
            availableSlots.push(currentAvailableSlot);
            currentAvailableSlot = null;
        }
    }

    // Çıktıyı UI için formatla

    return availableSlots
        .map(slot => ({
            day: slot.day,
            startTime: minutesToTime(slot.startMinutes),
            endTime: minutesToTime(slot.endMinutes),
            availableCount: slot.availableCount,
            availableFriendsIds: slot.availableFriendsIds || [],
            availableFriends: slot.availableFriends || [],  //dışarıya veriyoruz
            place: slot.place || null,
        }))
        .filter(slot => slot.availableCount > 0);
};