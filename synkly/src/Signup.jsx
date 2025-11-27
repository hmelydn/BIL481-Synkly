import React, { useState } from 'react';
import { handleSignup } from './authService'; 
import { AlertTriangle } from 'lucide-react'; // Hata ikonunu kullanmak için Lucide'ı içe aktar

const Signup = () => {
    // State tanımlamaları
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(''); 
    const [isLoading, setIsLoading] = useState(false); // Yüklenme durumu

    // Form gönderimini yönetecek asenkron fonksiyon
    const handleSubmit = async (e) => {
        e.preventDefault(); 
        setError(''); 
        setIsLoading(true); // Yüklenmeyi başlat

        try {
            // handleSignup fonksiyonuna üç parametre (email, password, username) gönderiliyor.
            const user = await handleSignup(email, password, username);
            
            // Eğer kayıt başarılıysa, kullanıcıyı bilgilendir
            // NOT: alert() yerine daha iyi bir UI feedback mekanizması kullanabilirsiniz.
            alert(`Sign-up Successful! User UID: ${user.uid}. Welcome, ${username}!`);
            
            // Kayıt başarılı olduktan sonra formu temizle
            setUsername('');
            setEmail('');
            setPassword('');
            
        } catch (err) {
            // Hata yakalama
            let errorMessage = "An error occurred during sign-up. Please check your details.";
            
            if (err.code === 'auth/weak-password') {
                errorMessage = "Password is too weak. It must be at least 6 characters long and meet security standards.";
            } else if (err.code === 'auth/email-already-in-use') {
                errorMessage = "This email address is already in use.";
            } else if (err.message) {
                 errorMessage = err.message;
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false); // Yüklenmeyi durdur
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">Synkly Sign Up</h2>
                <p className="text-center text-sm text-gray-600 mb-8">
                    Create your account to sync free time slots with friends.
                </p>

                {/* Hata Mesajı Alanı */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center mb-4" role="alert">
                        <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
                        <span className="block sm:inline">{error}</span>
                    </div>
                )} 

                <form onSubmit={handleSubmit} className="space-y-4"> 
                    
                    {/* Username Alanı */}
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Enter a unique username"
                        />
                    </div>
                    
                    {/* Email Alanı */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="e.g., user@uni.edu"
                        />
                    </div>
                    
                    {/* Parola Alanı */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Min 6 characters"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                           Minimum 6 characters, required for security.
                        </p>
                    </div>
                    
                    <button 
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                            isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150'
                        }`}
                    >
                        {isLoading ? 'Signing Up...' : 'Sign Up'}
                    </button> 
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Already have an account? <a href="#" className="font-medium text-blue-600 hover:text-blue-500">Log In</a> 
                </p>
            </div>
        </div>
    );
};

export default Signup;