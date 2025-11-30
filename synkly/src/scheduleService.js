// scheduleService.js
import { getDoc, setDoc } from "firebase/firestore";
import { getUserScheduleDocRef } from './firebaseConfig';

/**
 * Kullanıcının ders programını Firestore'a kaydeder veya günceller.
 * 
 * @param {string} userId - Kullanıcının UID'i
 * @param {Array} scheduleSlots - [{ day, startTime, endTime, courseId?, ... }]
 * @param {string|null} placePreference - Kullanıcının tercih ettiği buluşma yeri (örn: "NAR")
 */
export const saveSchedule = async (userId, scheduleSlots, placePreference) => {
    const scheduleDocRef = getUserScheduleDocRef(userId);

    try {
        await setDoc(scheduleDocRef, {
            userId: userId,
            slots: scheduleSlots,
            placePreference: placePreference || null,
            lastUpdated: new Date().toISOString(),
        });
        console.log("Schedule successfully saved for user:", userId);
        return true;
    } catch (error) {
        console.error("Error saving schedule:", error);
        throw new Error("An error occurred while saving the schedule.");
    }
};

/**
 * Kullanıcının mevcut ders programını Firestore'dan çeker.
 * Yeni formatta:
 *   {
 *     slots: [...],
 *     placePreference: string | ""
 *   }
 * Eski kayıtlarda placePreference olmayabilir, o zaman "" döner.
 */
export const getSchedule = async (userId) => {
    const scheduleDocRef = getUserScheduleDocRef(userId);

    try {
        const docSnap = await getDoc(scheduleDocRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Schedule retrieved for user:", userId);

            return {
                slots: data.slots || [],
                placePreference: data.placePreference || "",
            };
        } else {
            console.log("No schedule found for user:", userId);
            return {
                slots: [],
                placePreference: "",
            };
        }
    } catch (error) {
        console.error("Error fetching schedule:", error);
        throw new Error("An error occurred while fetching the schedule.");
    }
};
