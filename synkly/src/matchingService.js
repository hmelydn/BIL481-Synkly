import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig"; 

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
// ✅ Eşleştirme aralığı 08:30'da başlar ve 18:30'da biter.
const MATCHING_START_TIME = '08:30'; 
const MATCHING_END_TIME = '18:30';   

// -------------------------------------------------------------
// HELPER FUNCTIONS 
// -------------------------------------------------------------

const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
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
// -------------------------------------------------------------


// -------------------------------------------------------------
// 1. DATA FETCHING (Veri Çekme)
// -------------------------------------------------------------

export const getAllSchedules = async () => {
    try {
        const usersCollectionRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollectionRef); 

        const allSchedules = [];
        
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            
            const scheduleDocRef = doc(db, "users", userId, "schedule", "current");
            const scheduleDoc = await getDoc(scheduleDocRef);

            if (scheduleDoc.exists()) {
                const scheduleData = scheduleDoc.data();
                
                allSchedules.push({
                    userId: userId,
                    slots: scheduleData.slots || [], 
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
// 2. MATCHING LOGIC (Eşleştirme Mantığı)
// -------------------------------------------------------------

export const findAvailableFriends = (currentUserId, allSchedules) => {
    
    const currentUserSchedule = allSchedules.find(s => s.userId === currentUserId) || {
        userId: currentUserId,
        slots: [] 
    };
    
    const otherSchedules = allSchedules.filter(s => s.userId !== currentUserId);

    // 1. Kullanıcının MEŞGUL olduğu slotları işaretler
    const currentUserBusySlots = new Set();
    currentUserSchedule.slots.forEach(slot => {
        const dayIndex = DAYS_ORDER.indexOf(slot.day);
        if (dayIndex === -1) return;

        let startMinutes = timeToMinutes(slot.startTime);
        let endMinutes = timeToMinutes(slot.endTime);

        for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
            currentUserBusySlots.add(`${dayIndex}_${currentMinutes}`);
        }
    });


    // 2. Diğer kullanıcıların MEŞGUL olduğu slotların haritasını çıkarır
    const userBusyMap = new Map(); 

    otherSchedules.forEach(schedule => {
        schedule.slots.forEach(slot => {
            const dayIndex = DAYS_ORDER.indexOf(slot.day);
            if (dayIndex === -1) return; 

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

    // 3. Eşleştirme yapılır (08:30 - 18:30 arası sınırlandı)
    const availableSlots = [];
    let currentAvailableSlot = null;
    
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        // Döngü 08:30 (START_MINUTES) ile 18:30 (END_MINUTES) arasında çalışır
        for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += 30) { 
            
            const slotKey = `${dayIndex}_${minutes}`;
            
            // KONTROL 1: Sen müsait misin?
            const isUserFree = !currentUserBusySlots.has(slotKey); 
            
            if (isUserFree) {
                
                const busyFriends = userBusyMap.get(slotKey) || new Set();
                const availableFriendIds = Array.from(otherSchedules)
                        .map(schedule => schedule.userId) 
                        .filter(friendId => !busyFriends.has(friendId)); 
                        
                const availableFriendsCount = availableFriendIds.length;
                
                if (availableFriendsCount > 0) {
                    
                    const slotInfo = {
                        day: DAYS_ORDER[dayIndex],
                        startMinutes: minutes,
                        endMinutes: minutes + 30,
                        availableCount: availableFriendsCount,
                        availableFriendsIds: availableFriendIds
                    };
                    
                    const friendsMatch = (currentAvailableSlot && currentAvailableSlot.availableFriendsIds.length === availableFriendIds.length && currentAvailableSlot.availableFriendsIds.every(id => availableFriendIds.includes(id)));

                    if (currentAvailableSlot && currentAvailableSlot.day === slotInfo.day && friendsMatch) {
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
};