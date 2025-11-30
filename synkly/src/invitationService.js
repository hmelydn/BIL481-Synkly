// invitationService.js
// ---------------------------------------------------
// 1. Firestore importları ve temel ayarlar
// ---------------------------------------------------
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    doc, 
    updateDoc, 
    serverTimestamp,
    getDoc 
} from "firebase/firestore";
import { db, getUserProfileDocRef } from "./firebaseConfig"; 

// ---------------------------------------------------
// 2. Yardımcı: invitation koleksiyonu referansı
// ---------------------------------------------------
const getInvitationsCollectionRef = () => {
    return collection(db, "invitations");
};


// -------------------------------------------------------------
// YARDIMCI FONKSİYON: UID'den kullanıcı adını çeker
// -------------------------------------------------------------
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

// ---------------------------------------------------
// 3. checkExistingInvitation ❗ YENİ FONKSİYON
//    - Aynı slot için daha önce davet gönderilip gönderilmediğini kontrol eder.
// ---------------------------------------------------
export const checkExistingInvitation = async ({ fromUserId, toUserId, slot }) => {
    const invitationsRef = getInvitationsCollectionRef();
    
    // Sadece "pending" veya "accepted" durumundaki davetleri kontrol et.
    // "rejected" olanlar tekrar davet göndermeye izin verebilir (isteğe bağlı).
    const q = query(
        invitationsRef,
        where("fromUserId", "==", fromUserId),
        where("toUserId", "==", toUserId),
        where("day", "==", slot.day),
        where("startTime", "==", slot.startTime),
        where("endTime", "==", slot.endTime),
        where("status", "in", ["pending", "accepted"]) // Kontrol edilecek durumlar
    );

    const snap = await getDocs(q);
    
    // snap.empty false ise (doküman bulunduysa) zaten davet var demektir.
    return !snap.empty; 
};


// ---------------------------------------------------
// 4. createInvitation - GÜNCELLENDİ (Kontrol Eklendi)
// ---------------------------------------------------
export const createInvitation = async ({ fromUserId, fromUserName, toUserId, slot }) => {
    try {
        // ❗ KRİTİK KONTROL
        const exists = await checkExistingInvitation({ fromUserId, toUserId, slot });
        if (exists) {
            // Eğer zaten varsa hata fırlat
            throw new Error("An existing pending or accepted invitation already exists for this slot.");
        }

        const invitationsRef = getInvitationsCollectionRef();

        const docRef = await addDoc(invitationsRef, {
            fromUserId,
            fromUserName: fromUserName || null,
            toUserId,
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            place: null,             
            status: "pending",       
            createdAt: serverTimestamp()
        });

        console.log("Invitation created with ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error creating invitation:", error);
        // Hata mesajını daha anlaşılır hale getir
        throw new Error(error.message || "Failed to create invitation.");
    }
};

// ---------------------------------------------------
// 5. getIncomingInvitations
// ---------------------------------------------------
export const getIncomingInvitations = async (userId) => {
    try {
        const invitationsRef = getInvitationsCollectionRef();
        const q = query(invitationsRef, where("toUserId", "==", userId));
        const snap = await getDocs(q);

        const resultsPromises = snap.docs.map(async (docSnap) => {
            const data = docSnap.data();

            let senderName = data.fromUserName;
            if (!senderName) {
                senderName = await fetchUserName(data.fromUserId); 
            }

            return {
                id: docSnap.id,
                ...data,
                fromUserName: senderName, 
                day: data.slot?.day ?? data.day,
                startTime: data.slot?.startTime ?? data.startTime,
                endTime: data.slot?.endTime ?? data.endTime,
            };
        });

        return Promise.all(resultsPromises);
    } catch (error) {
        console.error("Error fetching incoming invites:", error);
        throw error;
    }
};


// ---------------------------------------------------
// 6. getSentInvitations
// ---------------------------------------------------
export const getSentInvitations = async (userId) => {
    try {
        const invitationsRef = getInvitationsCollectionRef();
        const q = query(invitationsRef, where("fromUserId", "==", userId));
        const snap = await getDocs(q);

        const resultsPromises = snap.docs.map(async (docSnap) => {
            const data = docSnap.data();

            const receiverName = await fetchUserName(data.toUserId); 
            
            return {
                id: docSnap.id,
                ...data,
                toUserName: receiverName, 
                day: data.slot?.day ?? data.day,
                startTime: data.slot?.startTime ?? data.startTime,
                endTime: data.slot?.endTime ?? data.endTime,
            };
        });

        return Promise.all(resultsPromises);
    } catch (error) {
        console.error("Error fetching sent invites:", error);
        throw error;
    }
};


// ---------------------------------------------------
// 7. updateInvitationStatus
// ---------------------------------------------------
export const updateInvitationStatus = async (invitationId, newStatus) => {
    try {
        const invitationDocRef = doc(db, "invitations", invitationId);
        await updateDoc(invitationDocRef, {
            status: newStatus
        });

        console.log("Invitation status updated:", invitationId, newStatus);
    } catch (error) {
        console.error("Error updating invitation status:", error);
        throw new Error("Failed to update invitation status.");
    }
};