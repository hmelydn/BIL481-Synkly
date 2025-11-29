// scheduleService.js
import { getDoc, setDoc } from "firebase/firestore";
import { getUserScheduleDocRef } from './firebaseConfig';

/**
 * Kullanıcının ders programını Firestore'a kaydeder veya günceller.
 */
export const saveSchedule = async (userId, scheduleSlots) => {
    const scheduleDocRef = getUserScheduleDocRef(userId);

    try {
        await setDoc(scheduleDocRef, {
            userId: userId,
            slots: scheduleSlots, 
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
 */
export const getSchedule = async (userId) => {
    const scheduleDocRef = getUserScheduleDocRef(userId);

    try {
        const docSnap = await getDoc(scheduleDocRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Schedule retrieved for user:", userId);
            return data.slots || []; 
        } else {
            console.log("No schedule found for user:", userId);
            return [];
        }
    } catch (error) {
        console.error("Error fetching schedule:", error);
        throw new Error("An error occurred while fetching the schedule.");
    }
};