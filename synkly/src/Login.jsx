import React, { useState } from 'react';
import { handleLogin } from './authService'; 
import { User, Lock, ArrowRight } from 'lucide-react';

const Login = ({ onLoginSuccess, onNavigateToSignup }) => { 
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault(); 
        setLoading(true);
        try {
            await handleLogin(email, password);
            onLoginSuccess();
        } catch (err) {
            alert("Giriş Hatası: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
            {/* Logo Alanı */}
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-extrabold text-indigo-600 tracking-tight">Synkly.</h1>
                <p className="text-slate-500 mt-2">Programını eşle, sosyalleş.</p>
            </div>
            
            {/* DIŞ KUTU (Gölge ve Beyaz Alan) */}
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
                
                {/* İÇ FORM ALANI */}
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-slate-800">Giriş Yap</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">E-posta</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                                <input 
                                    type="email" 
                                    placeholder="ornek@mail.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-slate-800"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Şifre</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                                <input 
                                    type="password" 
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-slate-800"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all transform active:scale-95 flex items-center justify-center shadow-lg shadow-indigo-200"
                        >
                            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                        </button>

                    </form>
                </div>
            </div>

            {/* Alt Link */}
            <div className="mt-8 text-center">
                <p className="text-slate-600">Hesabın yok mu?</p>
                <button onClick={onNavigateToSignup} className="text-indigo-600 font-semibold hover:text-indigo-800 flex items-center justify-center mx-auto mt-1 group">
                    Kayıt Ol <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"/>
                </button>
            </div>
        </div>
    );
};

export default Login;