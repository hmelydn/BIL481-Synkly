// src/ChatScreen.jsx
import React, { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import {
  sendChatMessage,
  subscribeToChatMessages,
} from "./chatService";

// 1. BAŞLANGIÇ MESAJLARI (Sadece Yemek/Kahve Odaklı)
const STARTER_MESSAGES = [
  "Hey! Let's grab some food? Meet in front of the venue? 🍔",      // Yemek yiyelim mi?
  "Hi! I'm heading for coffee. Meet me at the entrance? ☕",        // Kahveye gidiyorum, girişte buluşalım?
  "Hey! Let's meet at the entrance for a quick bite? 🥪",           // Hızlıca bir şeyler yiyelim?
  "Hi! I'm free. Let's meet in front of the food place. 📍",        // Yemek yerinin önünde buluşalım.
];

// 2. CEVAP MESAJLARI (Karar Odaklı: Kabul/Red)
const REPLY_MESSAGES = [
  "Perfect! See you in front of the place. 👍",    // Tamam, mekanın önünde görüşürüz.
  "Great! I'm heading to the entrance now. 🏃‍♂️",    // Harika, girişe geçiyorum.
  "Sounds good! I'll wait for you at the door. 🤝", // Kapıda bekleyeceğim.
  "Sorry, I'm not hungry right now. 😔",           // Aç değilim.
  "I'm busy at the moment, maybe next time. ⏳",   // Meşgulüm.
];

const ChatScreen = ({ user, chatId, invitation, onBack }) => {
  const [messages, setMessages] = useState([]);

  const otherUserId =
    invitation.fromUserId === user.uid
      ? invitation.toUserId
      : invitation.fromUserId;

  useEffect(() => {
    if (!chatId) return;
    // Gerçek zamanlı mesaj dinleme
    const unsubscribe = subscribeToChatMessages(chatId, setMessages);
    return () => unsubscribe && unsubscribe();
  }, [chatId]);

  const handleSend = async (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;

    try {
      await sendChatMessage(chatId, user.uid, trimmed);
    } catch (error) {
      console.error("Error sending chat message:", error);
      alert("Could not send message.");
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gray-50 flex flex-col items-center">
      {/* HEADER */}
      <div className="w-full max-w-3xl flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center text-sm text-gray-700 hover:text-gray-900 font-bold"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <div className="text-center">
             <h1 className="text-lg font-bold text-indigo-900 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                Chat
             </h1>
             <p className="text-xs text-indigo-600">
                {invitation.slot?.day} • {invitation.slot?.startTime}
             </p>
        </div>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      {/* CHAT AREA */}
      <div className="w-full max-w-3xl flex-1 flex flex-col bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-4">
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm italic opacity-60">
               <MessageCircle className="w-12 h-12 mb-2"/>
               <p>No messages yet.</p>
               <p>Choose a starter below!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === user.uid;

              return (
                <div
                  key={msg.id}
                  className={`flex ${
                    isMe ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className={`max-w-[80%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <span
                      className={`text-[10px] mb-1 uppercase tracking-wide ${
                        isMe
                          ? "text-indigo-500 self-end"
                          : "text-gray-500 self-start"
                      }`}
                    >
                      {isMe ? "You" : `Friend`}
                    </span>

                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                        isMe
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* PREDEFINED MESSAGES AREA */}
      <div className="w-full max-w-3xl space-y-5 pb-2">
          
          {/* 1. STARTERS (Üst Kısım - Başlatıcılar) */}
          <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Start Conversation</h3>
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {STARTER_MESSAGES.map((msg, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(msg)}
                        className="flex-shrink-0 bg-white border border-indigo-100 text-indigo-700 text-xs font-medium py-2.5 px-4 rounded-xl shadow-sm hover:bg-indigo-50 hover:border-indigo-300 transition-all whitespace-nowrap"
                      >
                        {msg}
                      </button>
                  ))}
              </div>
          </div>

          {/* 2. REPLIES (Alt Kısım - Cevaplar) */}
          <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Quick Replies</h3>
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {REPLY_MESSAGES.map((msg, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(msg)}
                        className="flex-shrink-0 bg-slate-800 text-white text-xs font-medium py-2.5 px-4 rounded-xl shadow-sm hover:bg-slate-700 transition-all whitespace-nowrap flex items-center"
                      >
                        {msg} <Send className="w-3 h-3 ml-2 opacity-70"/>
                      </button>
                  ))}
              </div>
          </div>

      </div>
    </div>
  );
};

export default ChatScreen;