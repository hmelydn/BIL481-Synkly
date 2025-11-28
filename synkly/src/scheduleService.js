import { db } from './firebaseConfig';
import { doc, getDoc, setDoc } from "firebase/firestore";

// Constants for Firestore paths
const SCHEDULE_COLLECTION = "schedule";
const SCHEDULE_DOC_ID = "current"; // Only one schedule document per user

// Path builder (using the simpler 'users' collection structure now)
const getUserScheduleDocRef = (userId) => {
    // Path: users/{userId}/schedule/current
    return doc(db, "users", userId, SCHEDULE_COLLECTION, SCHEDULE_DOC_ID);
};

/**
 * Saves or updates the user's class schedule to Firestore.
 * @param {string} userId - The current user's UID.
 * @param {Array<Object>} scheduleSlots - Array of {day, startTime, endTime} objects.
 */
export const saveSchedule = async (userId, scheduleSlots) => {
    const scheduleDocRef = getUserScheduleDocRef(userId);

    try {
        await setDoc(scheduleDocRef, {
            userId: userId,
            // Saving the schedule slots as an array
            slots: scheduleSlots, 
            lastUpdated: new Date().toISOString(),
        });
        console.log("Schedule successfully saved for user:", userId);
        return true;
    } catch (error) {
        console.error("Error saving schedule:", error);
        throw new Error("An error occurred while saving the schedule."); // English error message
    }
};

/**
 * Fetches the user's existing class schedule from Firestore.
 * @param {string} userId - The current user's UID.
 * @returns {Array<Object>} - The saved schedule slots or an empty array.
 */
export const getSchedule = async (userId) => {
    const scheduleDocRef = getUserScheduleDocRef(userId);

    try {
        const docSnap = await getDoc(scheduleDocRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Schedule retrieved for user:", userId);
            // Return only the slots array
            return data.slots || []; 
        } else {
            console.log("No schedule found for user:", userId);
            return [];
        }
    } catch (error) {
        console.error("Error fetching schedule:", error);
        throw new Error("An error occurred while fetching the schedule."); // English error message
    }
};