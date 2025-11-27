import { db, getPrivateUserCollectionPath } from './firebaseConfig';
import { doc, getDoc, setDoc } from "firebase/firestore";

// Program verilerini saklamak için sabit koleksiyon adı
const SCHEDULE_COLLECTION = "schedules";
const SCHEDULE_DOC_ID = "weekly-schedule"; // Her kullanıcının tek bir program dökümanı olacak

/**
 * Kullanıcının ders programını Firestore'a kaydeder veya günceller.
 * @param {string} userId - Güncel kullanıcının UID'si.
 * @param {Array<Object>} scheduleSlots - {day, startTime, endTime, courseId} objelerinden oluşan program listesi.
 */
export const saveSchedule = async (userId, scheduleSlots) => {
    // Kullanıcının özel program dökümanına giden yolu oluştur (artifacts/{appId}/users/{userId}/schedules/weekly-schedule)
    const docPath = getPrivateUserCollectionPath(userId, SCHEDULE_COLLECTION);
    const scheduleDocRef = doc(db, docPath, SCHEDULE_DOC_ID);

    try {
        await setDoc(scheduleDocRef, {
            userId: userId,
            // Programı doğrudan bir dizi olarak kaydetme
            slots: scheduleSlots, 
            lastUpdated: new Date().toISOString(),
        });
        console.log("Schedule successfully saved for user:", userId);
        return true;
    } catch (error) {
        console.error("Error saving schedule:", error);
        throw new Error("Ders programı kaydedilirken bir hata oluştu.");
    }
};

/**
 * Kullanıcının mevcut ders programını Firestore'dan çeker.
 * @param {string} userId - Güncel kullanıcının UID'si.
 * @returns {Array<Object>} - Kaydedilmiş program listesini (slots) veya boş bir dizi döner.
 */
export const getSchedule = async (userId) => {
    // Kullanıcının özel program dökümanına giden yolu oluştur
    const docPath = getPrivateUserCollectionPath(userId, SCHEDULE_COLLECTION);
    const scheduleDocRef = doc(db, docPath, SCHEDULE_DOC_ID);

    try {
        const docSnap = await getDoc(scheduleDocRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Schedule retrieved for user:", userId);
            // Sadece slot (program) dizisini döndür
            return data.slots || []; 
        } else {
            console.log("No schedule found for user:", userId);
            return [];
        }
    } catch (error) {
        console.error("Error fetching schedule:", error);
        throw new Error("Ders programı çekilirken bir hata oluştu.");
    }
};