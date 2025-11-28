import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'; 
import { app } from './firebaseConfig';
import Login from './Login';
import Signup from './Signup';
import ScheduleInput from './ScheduleInput'; 
import { getAllSchedules, findFreeSlots } from './matchingService'; 
import { Loader2 } from 'lucide-react'; 

// -----------------------------------------------------
// Main Application Component (Routing and Auth State Management)
// -----------------------------------------------------
const App = () => {
    const [currentScreen, setCurrentScreen] = useState('login'); 
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [commonSlots, setCommonSlots] = useState([]); 
    const [isMatchingLoading, setIsMatchingLoading] = useState(false); 


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

    // Matching Logic: Fetch Schedules and Find Free Slots
    useEffect(() => {
        const runMatching = async () => {
            if (!user) return;
            
            setIsMatchingLoading(true); 
            console.log("Matching process starting...");
            
            try {
                const schedules = await getAllSchedules();
                
                if (schedules.length > 0) {
                    const result = findFreeSlots(schedules);
                    setCommonSlots(result); 
                    console.log(`Common Free Slots found: ${result.length} items`);
                } else {
                     setCommonSlots([]);
                     console.log("No schedule data found for matching.");
                }
            } catch (error) {
                console.error("Critical error during matching:", error);
                setCommonSlots([]);
            } finally {
                setIsMatchingLoading(false); 
            }
        };
        
        if (isAuthReady && user) {
            runMatching();
        }
    }, [isAuthReady, user]); 

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
                <ScheduleInput userId={user.uid} /> 
                
                {/* MATCHING RESULTS */}
                <div className="w-full max-w-4xl mt-6 p-6 bg-white rounded-xl shadow-2xl border border-dashed border-green-300">
                    <h2 className="text-3xl font-extrabold mb-4 flex items-center text-green-700">
                        <span className="mr-3">🤝</span> Common Free Slots
                    </h2>
                    <p className="text-gray-600 mb-4 border-b pb-4">
                        Common time slots when all registered users (you and dummy friends) are available.
                    </p>

                    {isMatchingLoading ? (
                        <div className="flex items-center justify-center h-24 text-blue-500">
                            <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                            Analyzing Schedules...
                        </div>
                    ) : commonSlots.length === 0 ? (
                        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 p-4 rounded-lg text-center">
                            <p className="font-semibold">No common free time slots found.</p>
                            <p className="text-sm mt-1">This might be because everyone has classes or not enough schedules are saved.</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {commonSlots.map((slot, index) => (
                                <div 
                                    key={index} 
                                    className="flex justify-between items-center p-3 bg-green-50 border border-green-300 rounded-lg hover:bg-green-100 transition duration-150"
                                >
                                    <span className="font-bold text-gray-800 w-24">{slot.day}</span>
                                    <span className="text-green-700 font-extrabold text-lg">{slot.startTime} - {slot.endTime}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Information Footer */}
                <div className="w-full max-w-4xl mt-6 p-6 bg-white rounded-lg shadow-lg">
                    <h2 className="text-2xl font-semibold mb-3 text-blue-800">Next Steps: Finding Matches</h2>
                    <p className="text-gray-600">
                        The results above will update after you save your own schedule. Enter your classes to start finding common free times!
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