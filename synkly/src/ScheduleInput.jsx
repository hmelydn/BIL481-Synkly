import React, { useState, useEffect } from 'react';
import { saveSchedule, getSchedule } from './scheduleService';
import { Plus, Trash2, Save, Calendar, Clock, BookOpen, AlertTriangle } from 'lucide-react';

// Days used in the database and matching logic
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']; 
const TIMES = Array.from({ length: 25 }, (_, i) => 
    `${i < 10 ? '0' : ''}${i}:00`
);

// Schedule Input Component
const ScheduleInput = ({ userId }) => {
    const [schedule, setSchedule] = useState([]); 
    const [newSlot, setNewSlot] = useState({
        day: DAYS[0], 
        startTime: TIMES[8], 
        endTime: TIMES[9],   
        courseId: ''
    });
    const [message, setMessage] = useState(''); // Success/Error message state
    const [isLoading, setIsLoading] = useState(false);

    // Fetch existing schedule when component mounts
    useEffect(() => {
        const fetchExistingSchedule = async () => {
            if (!userId) return;
            try {
                const existingSchedule = await getSchedule(userId);
                setSchedule(existingSchedule);
            } catch (error) {
                setMessage({ type: 'error', text: 'Could not fetch existing schedule.' });
            }
        };
        fetchExistingSchedule();
    }, [userId]);

    // Add new slot to list
    const handleAddSlot = (e) => {
        e.preventDefault();
        
        if (newSlot.startTime >= newSlot.endTime) {
            setMessage({ type: 'error', text: 'Start time must be before end time.' });
            return;
        }

        setSchedule([...schedule, { ...newSlot, id: Date.now() }]); 
        
        setNewSlot({
            day: DAYS[0],
            startTime: TIMES[8],
            endTime: TIMES[9],
            courseId: ''
        });
        setMessage({ type: 'success', text: 'New slot added. Don\'t forget to save!' });
    };

    // Remove slot from list
    const handleRemoveSlot = (idToRemove) => {
        setSchedule(schedule.filter(slot => slot.id !== idToRemove));
        setMessage({ type: 'info', text: 'Slot removed. Remember to save!' });
    };

    // Save schedule to Firestore
    const handleSaveSchedule = async () => {
        if (!userId) {
            setMessage({ type: 'error', text: 'User session not found. Please log in again.' });
            return;
        }
        setIsLoading(true);
        setMessage('');

        try {
            await saveSchedule(userId, schedule);
            setMessage({ type: 'success', text: 'Schedule successfully saved!' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'An error occurred during saving.' });
        } finally {
            setIsLoading(false);
        }
    };

    const getMessageStyle = (type) => {
        switch (type) {
            case 'success': return 'bg-green-100 text-green-800 border-green-400';
            case 'error': return 'bg-red-100 text-red-800 border-red-400';
            case 'info': return 'bg-blue-100 text-blue-800 border-blue-400';
            default: return 'hidden';
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white shadow-2xl rounded-xl my-8">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center">
                <Calendar className="w-8 h-8 mr-3 text-blue-600"/> Weekly Schedule Input
            </h2>
            <p className="text-gray-600 mb-6">
                Please enter your weekly class hours. These times will be used to find common free slots.
            </p>

            {/* Message Area */}
            {message.text && (
                <div className={`p-3 mb-4 rounded-lg border flex items-center ${getMessageStyle(message.type)}`}>
                    <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span>{message.text}</span>
                </div>
            )}
            
            {/* New Slot Addition Form */}
            <form onSubmit={handleAddSlot} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg bg-gray-50 mb-6">
                {/* Day Selection */}
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><Calendar className="w-4 h-4 mr-1"/> Day</label>
                    <select
                        value={newSlot.day}
                        onChange={(e) => setNewSlot({ ...newSlot, day: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        {DAYS.map(day => <option key={day} value={day}>{day}</option>)} 
                    </select>
                </div>
                
                {/* Start Time */}
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><Clock className="w-4 h-4 mr-1"/> Start Time</label>
                    <select
                        value={newSlot.startTime}
                        onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        {TIMES.slice(0, 24).map(time => <option key={`start-${time}`} value={time}>{time}</option>)}
                    </select>
                </div>

                {/* End Time */}
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><Clock className="w-4 h-4 mr-1"/> End Time</label>
                    <select
                        value={newSlot.endTime}
                        onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        {TIMES.slice(1).map(time => <option key={`end-${time}`} value={time}>{time}</option>)}
                    </select>
                </div>

                {/* Course Name */}
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><BookOpen className="w-4 h-4 mr-1"/> Course Name (Opt.)</label>
                    <input
                        type="text"
                        value={newSlot.courseId}
                        onChange={(e) => setNewSlot({ ...newSlot, courseId: e.target.value })}
                        placeholder="E.g., CS 481"
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                
                {/* Add Button */}
                <div className="md:col-span-1 flex items-end">
                    <button
                        type="submit"
                        className="w-full h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-md transition duration-150 disabled:opacity-50"
                    >
                        <Plus className="w-5 h-5 mr-1" /> Add
                    </button>
                </div>
            </form>

            {/* Schedule List */}
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Schedule to be Saved (Total: {schedule.length})</h3>
                {schedule.length === 0 ? (
                    <p className="text-gray-500 italic p-4 border rounded-lg bg-gray-50">No class slots added yet.</p>
                ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {schedule.map((slot, index) => (
                            <div 
                                key={slot.id || index} 
                                className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"
                            >
                                <div className="text-sm font-medium text-gray-700 flex-1">
                                    <span className="font-bold text-blue-600 mr-2">{slot.day}</span> 
                                    {slot.startTime} - {slot.endTime}
                                </div>
                                <div className="text-sm text-gray-500 w-32 truncate">
                                    {slot.courseId || 'No Course Name'}
                                </div>
                                <button
                                    onClick={() => handleRemoveSlot(slot.id || index)}
                                    className="text-red-500 hover:text-red-700 p-1 rounded-full transition duration-150"
                                    title="Delete Slot"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Save Button */}
            <div className="mt-6 border-t pt-4">
                <button
                    onClick={handleSaveSchedule}
                    disabled={isLoading || schedule.length === 0}
                    className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition duration-150 disabled:opacity-50"
                >
                    {isLoading ? 'Saving...' : <><Save className="w-5 h-5 mr-2" /> Save Schedule</>}
                </button>
            </div>
        </div>
    );
};

export default ScheduleInput;