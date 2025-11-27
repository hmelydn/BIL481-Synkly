import React, { useState } from 'react';
import { handleLogin } from './authService'; 
import { AlertTriangle, LogIn } from 'lucide-react'; 

const Login = ({ onLoginSuccess, onNavigate }) => { // onNavigate prop'u eklendi
    // State tanımlamaları
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
            // handleLogin fonksiyonunu çağır
            const user = await handleLogin(email, password);
            
            // Başarılı giriş sonrası kullanıcıyı bilgilendir (alert yerine daha iyi bir yöntem kullanılmalı, ancak şimdilik bırakıldı)
            // alert(`Login Successful! User UID: ${user.uid}. Redirecting...`);
            
            // Eğer varsa, ana sayfaya yönlendirme callback'ini çağır
            if (onLoginSuccess) {
                onLoginSuccess(user);
            }

            // Formu temizle
            setEmail('');
            setPassword('');
            
        } catch (err) {
            // Hata yakalama
            let errorMessage = "Login failed. Please check your email and password.";
            
            if (err.code === 'auth/invalid-credential') {
                errorMessage = "Invalid login credentials. User not found or bad password.";
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
                <h2 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">Synkly Login</h2>
                <p className="text-center text-sm text-gray-600 mb-8">
                    Sign in to access your schedule and find matches.
                </p>

                {/* Hata Mesajı Alanı */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center mb-4" role="alert">
                        <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
                        <span className="block sm:inline">{error}</span>
                    </div>
                )} 

                <form onSubmit={handleSubmit} className="space-y-4"> 
                    
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
                            placeholder="Your secure password"
                        />
                    </div>
                    
                    <button 
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                            isLoading ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150'
                        }`}
                    >
                        {isLoading ? 'Logging In...' : <><LogIn className="w-5 h-5 mr-2" /> Log In</>}
                    </button> 
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Don't have an account? 
                    <button 
                        onClick={() => onNavigate('signup')} 
                        className="font-medium text-blue-600 hover:text-blue-500 ml-1"
                    >
                        Sign Up
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Login;