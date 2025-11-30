// src/chatService.js
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

// --------------------------------------------------------------------
// 1. Belirli bir davet (invitation) için chat aç / varsa onu kullan
// --------------------------------------------------------------------
export const getOrCreateChatForInvitation = async (invitation) => {
  // Davet id'sini chat id olarak kullanıyoruz
  const chatId = invitation.id;
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);

  if (!snap.exists()) {
    await setDoc(chatRef, {
      createdAt: serverTimestamp(),
      invitationId: invitation.id,
      users: [invitation.fromUserId, invitation.toUserId],
      slot: invitation.slot || null,
    });
  }

  return chatId;
};

// --------------------------------------------------------------------
// 2. Mesaj gönder
// --------------------------------------------------------------------
export const sendChatMessage = async (chatId, senderId, text) => {
  const messagesCol = collection(db, "chats", chatId, "messages");
  await addDoc(messagesCol, {
    senderId,
    text,
    createdAt: serverTimestamp(),
  });
};

// --------------------------------------------------------------------
// 3. Mesajları gerçek zamanlı dinle
// --------------------------------------------------------------------
export const subscribeToChatMessages = (chatId, callback) => {
  const messagesCol = collection(db, "chats", chatId, "messages");
  const q = query(messagesCol, orderBy("createdAt", "asc"));

  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    callback(msgs);
  });
};
