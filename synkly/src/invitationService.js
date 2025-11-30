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
    serverTimestamp 
} from "firebase/firestore";
import { db } from "./firebaseConfig";

// ---------------------------------------------------
// 2. Yardımcı: invitation koleksiyonu referansı
//    Path: /invitations/{invitationId}
// ---------------------------------------------------
const getInvitationsCollectionRef = () => {
    return collection(db, "invitations");
};

// ---------------------------------------------------
// 3. createInvitation
//    - Ortak slot bulunduğunda davet oluşturan fonksiyon.
//    - Parametreler:
//        fromUserId   : Daveti gönderen kullanıcının UID'si
//        fromUserName : Gönderen kullanıcının görünen adı (opsiyonel ama UI için güzel)
//        toUserId     : Davetin gönderildiği arkadaşın UID'si
//        slot         : { day, startTime, endTime }
// ---------------------------------------------------
export const createInvitation = async ({ fromUserId, fromUserName, toUserId, slot }) => {
    try {
        const invitationsRef = getInvitationsCollectionRef();

        const docRef = await addDoc(invitationsRef, {
            fromUserId,
            fromUserName: fromUserName || null,
            toUserId,
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            place: null,             // Sonraki adımlarda dining place ekleyeceğiz
            status: "pending",       // "pending" | "accepted" | "rejected"
            createdAt: serverTimestamp()
        });

        console.log("Invitation created with ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error creating invitation:", error);
        throw new Error("Failed to create invitation.");
    }
};

// ---------------------------------------------------
// 4. getInvitationsForUser
//    - Belirli bir kullanıcıya gelen davetleri çeker.
//    - Kullanım: gelen kutusu (incoming invitations) için
// ---------------------------------------------------


export const getIncomingInvitations = async (userId) => {
    try {
        const invitationsRef = getInvitationsCollectionRef();
        const q = query(invitationsRef, where("toUserId", "==", userId));
        const snap = await getDocs(q);

        const results = [];
        snap.forEach(docSnap => {
            const data = docSnap.data();
            results.push({
                id: docSnap.id,
                ...data,
                day: data.slot?.day ?? data.day,
                startTime: data.slot?.startTime ?? data.startTime,
                endTime: data.slot?.endTime ?? data.endTime,
            });
        });

        return results;
    } catch (error) {
        console.error("Error fetching incoming invites:", error);
        throw error;
    }
};


export const getSentInvitations = async (userId) => {
    try {
        const invitationsRef = getInvitationsCollectionRef();
        const q = query(invitationsRef, where("fromUserId", "==", userId));
        const snap = await getDocs(q);

        const results = [];
        snap.forEach(docSnap => {
            const data = docSnap.data();
            results.push({
                id: docSnap.id,
                ...data,
                day: data.slot?.day ?? data.day,
                startTime: data.slot?.startTime ?? data.startTime,
                endTime: data.slot?.endTime ?? data.endTime,
            });
        });

        return results;
    } catch (error) {
        console.error("Error fetching sent invites:", error);
        throw error;
    }
};


// ---------------------------------------------------
// 5. updateInvitationStatus
//    - Davetin durumunu günceller (accepted / rejected).
//    - Kabul durumunda ileride pre-defined text sayfasına
//      yönlendirme için kullanılacak.
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
