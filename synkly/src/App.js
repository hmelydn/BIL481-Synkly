import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'; 
import { app } from './firebaseConfig';
import Login from './Login';
import Signup from './Signup';
import ScheduleInput from './ScheduleInput'; 
import { getAllSchedules, findAvailableFriends } from './matchingService'; 
import { Loader2, Users } from 'lucide-react'; 
import { 
    createInvitation, 
    getIncomingInvitations, 
    getSentInvitations,
    updateInvitationStatus,
    cancelInvitation
} from "./invitationService";

import ChatScreen from "./ChatScreen";
import { getOrCreateChatForInvitation } from "./chatService";



// -----------------------------------------------------
// Main Application Component (Routing and Auth State Management)
// -----------------------------------------------------
const App = () => {
    const [currentScreen, setCurrentScreen] = useState('login'); 
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [matchingResults, setMatchingResults] = useState([]); 
    const [isMatchingLoading, setIsMatchingLoading] = useState(false); 
    const [totalSchedulesCount, setTotalSchedulesCount] = useState(0); // DEBUG STATE
    const [incomingInvitations, setIncomingInvitations] = useState([]);  //Davet state'leri
    const [isLoadingInvites, setIsLoadingInvites] = useState(false);
    const [scheduleVersion, setScheduleVersion] = useState(0);
    const [showPredefinedTexts, setShowPredefinedTexts] = useState(false);
    const [activeInvitation, setActiveInvitation] = useState(null);
    const [activeChatId, setActiveChatId] = useState(null);
    const [activeChatInvitation, setActiveChatInvitation] = useState(null);
    const [sentInvitations, setSentInvitations] = useState([]);



    // Kullanıcıya önereceğimiz basit ve nazik mesajlar
    const PREDEFINED_MESSAGES = [
    "Hey! I saw we’re both free at this time. Would you like to grab a coffee or lunch? 🙂",
    "Hi! Looks like we share a free slot. Would you like to meet up and study together?",
    "Hey! I'm free at this time – would you like to catch up for a quick chat?",
    "Hi! If you’re still free, we could meet on campus around this time. What do you think?"
    ];



    // Listen to Firebase Auth State
    useEffect(() => {
        const auth = getAuth(app);
        
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthReady(true);
            console.log('Auth State Changed:', currentUser ? currentUser.uid : 'Logged out');
        });

        return () => unsubscribe();
    }, []);

    // Matching Logic: Fetch Schedules and Find Friends
    useEffect(() => {
        const runMatching = async () => {
            if (!user) return;
            
            setIsMatchingLoading(true); 
            console.log("Matching process starting...");
            
            try {
                const schedules = await getAllSchedules(); 
                
                // ✅ KRİTİK DEBUG: Çekilen veri setini konsola yazdır
                console.log("DEBUG: Fetched Schedules Array:", schedules); 
                
                // Debug bilgisini state'e kaydet (ekranda görmek için)
                setTotalSchedulesCount(schedules.length);
                
                if (schedules.length <= 1) { 
                     setMatchingResults([]);
                     console.log("Not enough schedules found for matching (Needs more than 1 user). Found:", schedules.length);
                } else {
                    const results = findAvailableFriends(user.uid, schedules);
                    setMatchingResults(results); 
                    console.log(`Matched ${results.length} available slots.`);
                }
            } catch (error) {
                // Hatanın kendisini yakala ve konsola yazdır (Bu, PERMISSION DENIED hatasını görmemizi sağlayabilir)
                console.error("CRITICAL ERROR DURING DATA FETCH:", error);
                setMatchingResults([]);
            } finally {
                setIsMatchingLoading(false); 
            }

        };
        
        if (isAuthReady && user) {
            runMatching();
        }
    }, [isAuthReady, user, scheduleVersion]); 

    // Fetch incoming invitations when user logs in
    // Kullanıcı login olduğunda hem gelen hem gönderilen davetleri çek
    useEffect(() => {
        if (!user) return;

        const loadInvites = async () => {
            try {
                setIsLoadingInvites(true);

                const incoming = await getIncomingInvitations(user.uid);
                const sent = await getSentInvitations(user.uid);

                setIncomingInvitations(incoming);
                setSentInvitations(sent);
            } catch (error) {
                console.error("Error loading invitations:", error);
            } finally {
                setIsLoadingInvites(false);
            }
        };

        loadInvites();
    }, [user]);




    const handleNavigate = (screenName) => {
        setCurrentScreen(screenName);
    };

    const handleAuthSuccess = (loggedInUser) => {
        setUser(loggedInUser);
        setCurrentScreen('dashboard'); 
    };

    const handleLogout = async () => {
        try {
            const auth = getAuth(app);
            await signOut(auth);
            setUser(null);
            handleNavigate('login');
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    // -----------------------------------------------------
    // FONKSİYON: Hazır mesajı panoya kopyala
    // -----------------------------------------------------
    const handleUseMessage = async (message) => {
        try {
            await navigator.clipboard.writeText(message);
            alert("Message copied to clipboard. You can paste it into WhatsApp, email, etc.");
        } catch (error) {
            console.error("Clipboard error:", error);
            alert("Could not copy automatically. You can manually select and copy the text.");
        }
    };
    

    // ---------------------------------------------------
    // FONKSİYON: Ortak slot üzerinden belirli bir kullanıcıya davet gönder
    // ---------------------------------------------------
    const handleSendInvite = async (friendUserId, slot) => {
        if (!user) return;

        try {
            // Kullanıcının görünen adı varsa (profile'dan) onu da gönderebilirsin.
            // Şimdilik sadece email'i kullanmak bile yeterli.
            const fromUserName = user.email; 

            await createInvitation({
                fromUserId: user.uid,
                fromUserName,
                toUserId: friendUserId,
                slot,
            });

            alert("Invitation sent!");
        } catch (error) {
            console.error("Error sending invitation:", error);
            alert("An error occurred while sending the invitation.");
        }
    };

    // ---------------------------------------------------
    // FONKSİYON: Gelen davete cevap ver (accept / reject)
    // ---------------------------------------------------
    const handleRespondToInvite = async (invitationId, newStatus) => {
        try {
            await updateInvitationStatus(invitationId, newStatus);

            // Kabul edilirse chat aç
            if (newStatus === "accepted") {
                const acceptedInv =
                    incomingInvitations.find((inv) => inv.id === invitationId) || null;

                if (acceptedInv) {
                    const chatId = await getOrCreateChatForInvitation(acceptedInv);

                    setActiveChatId(chatId);
                    setActiveChatInvitation(acceptedInv);
                    setCurrentScreen("chat");
                }
            }

            // ✅ Listeyi yenile (hem gelen hem gönderilen davetler)
            const incoming = await getIncomingInvitations(user.uid);
            const sent = await getSentInvitations(user.uid);

            setIncomingInvitations(incoming);
            setSentInvitations(sent);

        } catch (error) {
            console.error("Error responding to invitation:", error);
            alert("An error occurred while updating the invitation.");
        }
    };

    // ---------------------------------------------------
    // FONKSİYON: Daveti geri çek (sadece gönderen yapar)
    // ---------------------------------------------------
    const handleCancelInvite = async (invitationId) => {
        if (!user) return;

        const confirmCancel = window.confirm(
            "Are you sure you want to cancel this invitation?"
        );
        if (!confirmCancel) return;

        try {
            await cancelInvitation(invitationId);

            // 🔄 Listeleri yenile
            const incoming = await getIncomingInvitations(user.uid);
            const sent = await getSentInvitations(user.uid);

            setIncomingInvitations(incoming);
            setSentInvitations(sent);
        } catch (error) {
            console.error("Error cancelling invitation:", error);
            alert("An error occurred while cancelling the invitation.");
        }
    };


    // ---------------------------------------------------
    // FONKSİYON: Davete bağlı chat ekranını aç
    // ---------------------------------------------------
    const handleOpenChat = async (invitation) => {
        try {
            const chatId = await getOrCreateChatForInvitation(invitation);
            setActiveChatId(chatId);
            setActiveChatInvitation(invitation);
            setCurrentScreen("chat");
        } catch (error) {
            console.error("Error opening chat:", error);
            alert("Could not open chat.");
        }
    };




    // -----------------------------------------------------
    // RENDER PHASE
    // -----------------------------------------------------

    if (!isAuthReady) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-700 bg-gray-50">
                Application Loading...
            </div>
        );
    }

    // 2. Dashboard View (Authenticated User)
    if (user) {

        if (currentScreen === "chat" && activeChatId && activeChatInvitation) {
            return (
                <ChatScreen
                    user={user}
                    chatId={activeChatId}
                    invitation={activeChatInvitation}
                    onBack={() => setCurrentScreen("dashboard")}
                />
            );
        }
        return (
            <div className="min-h-screen p-4 bg-gray-50 flex flex-col items-center">
                {/* Header and Logout Button */}
                <div className="w-full max-w-4xl bg-white p-6 rounded-xl shadow-lg mb-4 flex justify-between items-center border-b pb-4">
                    <h1 className="text-3xl font-bold text-blue-800">Synkly</h1>
                    <div className="flex items-center space-x-4">
                        <p className="text-sm text-gray-600 truncate max-w-xs">Welcome: {user.email}</p>
                        <button 
                            onClick={handleLogout}
                            className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-1.5 px-3 rounded-lg transition duration-150"
                        >
                            Log Out
                        </button>
                    </div>
                </div>

                {/* Main Content: Schedule Input */}
                <ScheduleInput 
                    userId={user.uid} 
                    onScheduleUpdated={() => setScheduleVersion(v => v + 1)} 
                />

                
                {/* MATCHING RESULTS (AVAILABILITY) */}
                <div className="w-full max-w-4xl mt-6 p-6 bg-white rounded-xl shadow-2xl border border-dashed border-blue-300">
                    <h2 className="text-3xl font-extrabold mb-4 flex items-center text-blue-700">
                        <span className="mr-3">🕒</span> Your Available Slots & Friends
                    </h2>
                    <p className="text-gray-600 mb-4 border-b pb-4">
                        Time slots when <strong>you are free</strong> and at least one other friend is available to meet.
                    </p>

                    {isMatchingLoading ? (
                        <div className="flex items-center justify-center h-24 text-blue-500">
                            <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                            Analyzing Friend Schedules...
                        </div>
                    ) : matchingResults.length === 0 ? (
                        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 p-4 rounded-lg text-center">
                            <p className="font-semibold">No available slots found with others.</p>
                            <p className="text-sm mt-1">
                                Please ensure your schedule is saved and data is loaded.  
                                (Total Schedules Found: {totalSchedulesCount})
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {matchingResults.map((slot, index) => (
                                <div 
                                    key={index} 
                                    className="p-3 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 transition duration-150"
                                >
                                    {/* ÜST KISIM */}
                                    <div className="flex justify-between items-center">
                                        <div className="font-bold text-gray-800 w-24">{slot.day}</div>
                                        <div className="text-blue-700 font-extrabold text-lg flex-1">
                                            {slot.startTime} - {slot.endTime}
                                        </div>
                                        <div className="flex items-center text-sm text-gray-600">
                                            <Users className="w-4 h-4 mr-1 text-green-600" />
                                            {slot.availableCount} Friends Available
                                        </div>
                                    </div>

                                    {/* INVITE BUTTONS */}
                                    <div className="flex space-x-2 mt-3">
                                        {slot.availableFriendsIds?.map((friendId) => (
                                            <button
                                                key={friendId}
                                                onClick={() => handleSendInvite(friendId, slot)}
                                                className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1 px-3 rounded-lg shadow-md transition"
                                            >
                                                Invite Friend ({friendId.substring(0, 5)}…)
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>


                {/*INCOMING INVITATIONS SECTION*/}
                <div className="w-full max-w-4xl mt-6 p-6 bg-white rounded-xl shadow-lg border">
                    <h2 className="text-2xl font-bold text-blue-700 mb-3">
                        Incoming Invitations
                    </h2>

                    {isLoadingInvites && <p className="text-gray-600">Loading invitations...</p>}

                    {!isLoadingInvites && incomingInvitations.length === 0 && (
                        <p className="text-gray-500 italic">You have no invitations.</p>
                    )}

                   {incomingInvitations.map((invitation) => {
                    // Bu davetteki rolün: davet edilen misin (receiver) yoksa daveti gönderen mi?
                    const isReceiver = invitation.toUserId === user.uid;

                    return (
                        <div
                            key={invitation.id}
                            className="p-4 mt-3 border rounded-lg bg-gray-50 shadow-sm"
                        >
                            <p>
                                <strong>From:</strong>{" "}
                                {invitation.fromUserName || invitation.fromUserId}
                            </p>
                            <p>
                                <strong>Time:</strong>{" "}
                                {invitation.day} {invitation.startTime} - {invitation.endTime}
                            </p>
                            <p>
                                <strong>Status:</strong> {invitation.status}
                            </p>

                            {/* Sadece davet edilen kişi ve status = pending ise Accept/Reject görecek */}
                            {isReceiver && invitation.status === "pending" && (
                                <div className="flex space-x-3 mt-3">
                                    <button
                                        onClick={() =>
                                            handleRespondToInvite(invitation.id, "accepted")
                                        }
                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                                    >
                                        Accept
                                    </button>

                                    <button
                                        onClick={() =>
                                            handleRespondToInvite(invitation.id, "rejected")
                                        }
                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                                    >
                                        Reject
                                    </button>
                                </div>
                            )}

                            {/* Davet kabul edildiyse HER İKİ TARAF da "Open Chat" butonunu görsün */}
                            {invitation.status === "accepted" && (
                                <div className="mt-3">
                                    <button
                                        onClick={() => handleOpenChat(invitation)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                                    >
                                        Open Chat
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}

                </div>

                {/* SENT INVITATIONS SECTION */}
                <div className="w-full max-w-4xl mt-6 p-6 bg-white rounded-xl shadow-lg border">
                    <h2 className="text-2xl font-bold text-purple-700 mb-3">
                        Sent Invitations
                    </h2>

                    {sentInvitations.length === 0 ? (
                        <p className="text-gray-500 italic">
                            You haven't sent any invitations yet.
                        </p>
                    ) : (
                        sentInvitations.map((invitation) => (
                            <div
                                key={invitation.id}
                                className="p-4 mt-3 border rounded-lg bg-gray-50 shadow-sm"
                            >
                                <p>
                                    <strong>To:</strong>{" "}
                                    {invitation.toUserName || invitation.toUserId}
                                </p>
                                <p>
                                    <strong>Time:</strong>{" "}
                                    {invitation.day} {invitation.startTime} - {invitation.endTime}
                                </p>
                                <p>
                                    <strong>Status:</strong> {invitation.status}
                                </p>

                                <div className="mt-3 flex space-x-3">
                                    {/* Accepted → Chat açılabilir */}
                                    {invitation.status === "accepted" && (
                                        <button
                                            onClick={() => handleOpenChat(invitation)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                                        >
                                            Open Chat
                                        </button>
                                    )}

                                    {/* Pending → Geri çekme butonu */}
                                    {invitation.status === "pending" && (
                                        <button
                                            onClick={() => handleCancelInvite(invitation.id)}
                                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                                        >
                                            Cancel Invitation
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>



                {/* PRE-DEFINED TEXT PANEL (Invitation accepted olduğunda gösterilir) */}
                {showPredefinedTexts && activeInvitation && (
                    <div className="w-full max-w-4xl mt-6 p-6 bg-blue-50 rounded-xl shadow-lg border border-blue-200">
                        <h2 className="text-2xl font-semibold mb-2 text-blue-800">
                            Suggested Messages
                        </h2>

                        <p className="text-sm text-gray-700 mb-4">
                            You accepted an invitation for{" "}
                            <strong>
                                {activeInvitation.slot?.day}{" "}
                                {activeInvitation.slot?.startTime} - {activeInvitation.slot?.endTime}
                            </strong>
                            . You can copy one of the polite messages below and paste it into WhatsApp, e-mail, etc.
                        </p>

                        <div className="space-y-3">
                            {PREDEFINED_MESSAGES.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-start justify-between p-3 bg-white rounded-lg border border-blue-100"
                                >
                                    <p className="text-sm text-gray-800 pr-3">
                                        {msg}
                                    </p>
                                    <button
                                        onClick={() => handleUseMessage(msg)}
                                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md shadow-sm"
                                    >
                                        Copy
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                
                {/* Information Footer */}
                <div className="w-full max-w-4xl mt-6 p-6 bg-white rounded-lg shadow-lg">
                    <h2 className="text-2xl font-semibold mb-3 text-blue-800">Note on Matching</h2>
                    <p className="text-gray-600">
                        The results above show times when you are free, and others are free. The ultimate goal is for users to click a time slot to indicate they are "free for lunch" at that moment.
                    </p>
                </div>


                

            </div>
        );
    }

    // 3. Login/Signup View (Not Authenticated)
    switch (currentScreen) {
        case 'signup':
            return (
                <Signup 
                    onAuthSuccess={handleAuthSuccess} 
                    onNavigate={() => handleNavigate('login')} 
                />
            );
        case 'login':
        default:
            return (
                <Login 
                    onLoginSuccess={handleAuthSuccess} 
                    onNavigate={() => handleNavigate('signup')} 
                />
            );
    }



    

};

export default App;