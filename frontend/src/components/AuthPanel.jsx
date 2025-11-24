import React, { useState, useEffect } from 'react';
import { Lock, LogIn, UserPlus } from 'lucide-react';

const AuthPanel = ({
    mode,
    onModeChange,
    onLogin,
    onRegister,
    loading,
    error,
}) => {
    const [form, setForm] = useState({
        email: '',
        password: '',
        defaultTopP: 0.9,
        defaultTemperature: 0.7,
    });

    const isLogin = mode === 'login';

    useEffect(() => {
        setForm((prev) => ({ ...prev, password: '' }));
    }, [mode]);

    const handleChange = (field) => (event) => {
        const value = ['defaultTopP', 'defaultTemperature'].includes(field)
            ? parseFloat(event.target.value)
            : event.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!form.email || !form.password) return;

        if (isLogin) {
            await onLogin({ email: form.email, password: form.password });
        } else {
            await onRegister({
                email: form.email,
                password: form.password,
                defaultTopP: form.defaultTopP,
                defaultTemperature: form.defaultTemperature,
            });
        }
    };

    return (
        <div className="w-full max-w-md p-8 rounded-3xl bg-black/70 border border-white/10 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col items-center gap-2 text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-color to-accent-color flex items-center justify-center text-white shadow-lg shadow-primary-color/40">
                    {isLogin ? <Lock size={28} /> : <UserPlus size={28} />}
                </div>
                <h1 className="text-2xl font-semibold text-white">
                    {isLogin ? 'Bienvenido a Antigravity' : 'Crea tu cuenta'}
                </h1>
                <p className="text-text-secondary text-sm">
                    {isLogin
                        ? 'Ingresa con tu correo y contraseña para continuar.'
                        : 'Regístrate para guardar tus preferencias y conversaciones.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-text-secondary">Correo</label>
                    <input
                        type="email"
                        required
                        value={form.email}
                        onChange={handleChange('email')}
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-color/60"
                        placeholder="tu@correo.com"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-text-secondary">Contraseña</label>
                    <input
                        type="password"
                        required
                        minLength={8}
                        value={form.password}
                        onChange={handleChange('password')}
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-color/60"
                        placeholder="Min. 8 caracteres"
                    />
                </div>

                {!isLogin && (
                    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 p-4 bg-white/5">
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between text-xs text-text-secondary">
                                <span>Top P</span>
                                <span>{form.defaultTopP.toFixed(2)}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={form.defaultTopP}
                                onChange={handleChange('defaultTopP')}
                                className="w-full"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between text-xs text-text-secondary">
                                <span>Temperature</span>
                                <span>{form.defaultTemperature.toFixed(1)}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.1"
                                value={form.defaultTemperature}
                                onChange={handleChange('defaultTemperature')}
                                className="w-full"
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="text-sm text-red-400 bg-red-400/10 border border-red-500/30 rounded-2xl px-4 py-3">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-primary-color text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors"
                >
                    {loading ? (
                        <span>Procesando...</span>
                    ) : (
                        <>
                            {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                            <span>{isLogin ? 'Iniciar sesión' : 'Registrarme'}</span>
                        </>
                    )}
                </button>
            </form>

            <div className="mt-6 text-center text-sm text-text-secondary">
                {isLogin ? '¿No tenés cuenta? ' : '¿Ya tenés cuenta? '}
                <button
                    type="button"
                    className="text-primary-color font-semibold hover:underline"
                    onClick={() => onModeChange(isLogin ? 'register' : 'login')}
                    disabled={loading}
                >
                    {isLogin ? 'Registrate acá' : 'Iniciá sesión'}
                </button>
            </div>
        </div>
    );
};

export default AuthPanel;
