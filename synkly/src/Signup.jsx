// src/Signup.js
import React, { useState } from 'react';
import { handleSignup } from './authService';
import { User, Mail, Lock, ArrowRight, CheckCircle, Loader2, FileText, X, AlertTriangle } from 'lucide-react';
import { KVKK_DATA } from './legalContent'; 

const Signup = ({ onNavigateToLogin }) => {
    // Form verilerini tutuyoruz
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordAgain, setPasswordAgain] = useState('');
    
    // Sözleşme ve modal durumları
    const [isAgreed, setIsAgreed] = useState(false);
    const [showModal, setShowModal] = useState(false);
    
    // Yüklenme ve hata durumları
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(''); 

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Her denemede hatayı sıfırla

        // Sözleşme onayı kontrolü
        if (!isAgreed) {
            setError("Lütfen Aydınlatma Metni ve Kullanım Şartlarını kabul et.");
            return;
        }

        // Şifre eşleşme kontrolü
        if(password !== passwordAgain) {
            setError("Girdiğin şifreler eşleşmiyor!");
            return;
        }

        setLoading(true);
        try {
            // Kayıt işlemini başlat
            await handleSignup(email, password, username);
            alert("Kayıt Başarılı! Giriş yapabilirsin.");
            onNavigateToLogin(); // Giriş ekranına at
        } catch (err) {
            // Hata kodlarını yakalayıp düzgün mesaj gösterelim
            let msg = "Kayıt sırasında bir hata oluştu.";
            if (err.code === 'auth/weak-password') msg = "Şifren çok zayıf (en az 6 karakter olmalı).";
            else if (err.code === 'auth/email-already-in-use') msg = "Bu e-posta adresi zaten kullanılıyor.";
            else if (err.code === 'auth/invalid-email') msg = "Geçersiz e-posta formatı.";
            else if (err.message) msg = err.message;
            
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 relative">
            
            {/* --- AYDINLATMA METNİ MODAL (POP-UP) --- */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        {/* Modal Başlık */}
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                <FileText className="w-5 h-5"/> {KVKK_DATA.title}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <X className="w-6 h-6"/>
                            </button>
                        </div>
                        
                        {/* Modal İçerik - Scroll edilebilir alan */}
                        <div className="p-6 overflow-y-auto text-sm text-slate-600 space-y-4">
                            {KVKK_DATA.sections.map((item, index) => (
                                <p key={index}>
                                    <strong className="text-slate-800">{item.header}</strong> {item.text}
                                </p>
                            ))}
                        </div>

                        {/* Alt Buton */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button 
                                onClick={() => { setShowModal(false); setIsAgreed(true); }}
                                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Okudum, Anladım
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* --- ANA SIGNUP FORMU --- */}
            <div className="w-full max-w-[600px]">
                
                <h1 className="text-3xl font-extrabold text-indigo-600 mb-4 pl-2 tracking-tight">Sign-Up</h1>
                
                {/* Tasarım Kutusu: Yuvarlatılmış köşeler ve gölge */}
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 md:p-10 relative overflow-hidden">
                    
                    {/* Arkadaki dekoratif blur efekti */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-50"></div>

                    {/* İçerik Alanı (Glass efektli) */}
                    <div className="bg-slate-50/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 md:p-8 relative z-10">
                        
                        <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Hesap Oluştur</h2>

                        {/* Hata Mesajı Alanı - Varsa göster */}
                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center text-sm">
                                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            
                            {/* Kullanıcı Adı */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Kullanıcı Adı</label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-indigo-600 w-5 h-5 transition-colors" />
                                    <input 
                                        type="text" 
                                        placeholder="Kullanıcı adınız"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm text-slate-700 font-medium"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">E-posta</label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-indigo-600 w-5 h-5 transition-colors" />
                                    <input 
                                        type="email" 
                                        placeholder="ornek@mail.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm text-slate-700 font-medium"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Şifre */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Şifre</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-indigo-600 w-5 h-5 transition-colors" />
                                    <input 
                                        type="password" 
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm text-slate-700 font-medium"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Şifre Tekrar */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Şifre Tekrar</label>
                                <div className="relative group">
                                    <CheckCircle className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-indigo-600 w-5 h-5 transition-colors" />
                                    <input 
                                        type="password" 
                                        placeholder="••••••••"
                                        value={passwordAgain}
                                        onChange={(e) => setPasswordAgain(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm text-slate-700 font-medium"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Onay Kutusu */}
                            <div className="flex items-start mt-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                <div className="flex items-center h-5">
                                    <input
                                        id="consent"
                                        type="checkbox"
                                        checked={isAgreed}
                                        onChange={(e) => setIsAgreed(e.target.checked)}
                                        className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                    />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor="consent" className="font-medium text-slate-700 cursor-pointer select-none">
                                        <button 
                                            type="button" 
                                            onClick={() => setShowModal(true)}
                                            className="text-indigo-600 hover:text-indigo-800 underline font-bold"
                                        >
                                            {KVKK_DATA.title}
                                        </button>
                                        'ni okudum, kişisel verilerimin işlenmesini ve <span className="text-slate-900 font-bold">Kullanım Şartları</span>'nı kabul ediyorum.
                                    </label>
                                </div>
                            </div>

                            {/* Kayıt Butonu */}
                            <div className="pt-2">
                                <button 
                                    type="submit" 
                                    disabled={loading || !isAgreed}
                                    className={`w-full font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center transition-all transform 
                                        ${isAgreed 
                                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 active:scale-[0.98]' 
                                            : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                                        }`}
                                >
                                    {loading ? (
                                        <><Loader2 className="w-5 h-5 animate-spin mr-2"/> Kayıt Yapılıyor...</>
                                    ) : (
                                        'Kayıt Ol'
                                    )}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <button 
                        onClick={onNavigateToLogin} 
                        className="inline-flex items-center text-slate-500 hover:text-indigo-600 font-semibold transition-colors group"
                    >
                        Login Sayfasına Dön <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"/>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Signup;