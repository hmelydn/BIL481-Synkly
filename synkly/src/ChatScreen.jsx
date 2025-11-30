// src/ChatScreen.jsx
import React, { useEffect, useState } from "react";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import {
  sendChatMessage,
  subscribeToChatMessages,
} from "./chatService";

const PREDEFINED_MESSAGES = [
  "Hey! I saw we’re both free at this time. Would you like to grab a coffee or lunch? 🙂",
  "Hi! Looks like we share a free slot. Would you like to meet up and study together?",
  "Hey! I'm free at this time – would you like to catch up for a quick chat?",
  "Hi! If you’re still free, we could meet on campus around this time. What do you think?",
];

const ChatScreen = ({ user, chatId, invitation, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

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

  const handleSend = async (textFromButton) => {
    const text = (textFromButton ?? input).trim();
    if (!text) return;

    try {
      await sendChatMessage(chatId, user.uid, text);
      if (!textFromButton) {
        setInput("");
      }
    } catch (error) {
      console.error("Error sending chat message:", error);
      alert("Could not send message.");
    }
  };

  const handleUsePredefined = (msg) => {
    // Butona basınca direkt gönder
    handleSend(msg);
  };

  return (
    <div className="min-h-screen p-4 bg-gray-50 flex flex-col items-center">
      {/* HEADER */}
      <div className="w-full max-w-3xl flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center text-sm text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <h1 className="text-xl font-bold text-blue-800 flex items-center">
          <MessageCircle className="w-5 h-5 mr-2" />
          Chat for {invitation.slot?.day}{" "}
          {invitation.slot?.startTime} - {invitation.slot?.endTime}
        </h1>
        <div className="text-xs text-gray-500">
          with user: {otherUserId.substring(0, 6)}…
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="w-full max-w-3xl flex-1 flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto space-y-2">
          {messages.length === 0 ? (
            <p className="text-gray-400 text-sm italic">
              No messages yet. You can start with a polite predefined message
              below.
            </p>
          ) : (
            messages.map((msg) => {
    const isMe = msg.senderId === user.uid;

    return (
      <div
        key={msg.id}
        className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2`}
      >
        <div className="max-w-xs flex flex-col">
          {/* KİMDEN GELDİ ETİKETİ */}
          <span
            className={`text-[10px] mb-1 uppercase tracking-wide ${
              isMe ? "text-blue-500 self-end" : "text-gray-500 self-start"
            }`}
          >
            {isMe ? "You" : `Friend (${otherUserId.substring(0, 4)}…)`}
          </span>

          {/* MESAJ BALONU */}
          <div
            className={`px-3 py-2 rounded-lg text-sm ${
              isMe
                ? "bg-blue-600 text-white rounded-br-none self-end"
                : "bg-gray-200 text-gray-900 rounded-bl-none self-start"
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

        {/* INPUT BAR */}
        <div className="border-t p-3 flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={() => handleSend()}
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-md"
          >
            <Send className="w-4 h-4 mr-1" />
            Send
          </button>
        </div>
      </div>

      {/* PREDEFINED MESSAGES */}
      <div className="w-full max-w-3xl mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <h2 className="text-sm font-semibold text-blue-800 mb-2">
          Suggested polite messages
        </h2>
        <div className="space-y-2">
          {PREDEFINED_MESSAGES.map((msg, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between bg-white border border-blue-100 rounded-md px-3 py-2"
            >
              <p className="text-xs text-gray-800 pr-3">{msg}</p>
              <button
                onClick={() => handleUsePredefined(msg)}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-md"
              >
                Send
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
