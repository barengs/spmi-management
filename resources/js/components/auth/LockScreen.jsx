import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setLocked } from '../../store/authSlice';
import api from '../../services/api';
import { toast } from 'react-toastify';
import Icon, { Icons } from '../ui/Icon';

export default function LockScreen() {
    const isLocked = useSelector(state => state.auth.isLocked);
    const user = useSelector(state => state.auth.user);
    const dispatch = useDispatch();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isLocked || !user) return null;

    const handleUnlock = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            // Re-verify password by attempting login
            const res = await api.post('/auth/login', {
                email: user.email,
                password: password
            });

            if (res.data.status === 'success') {
                dispatch(setLocked(false));
                toast.success('Sesi pulih kembali. Layar terbuka.');
            }
        } catch (err) {
            toast.error('Password salah. Gagal membuka layar.');
        } finally {
            setLoading(false);
            setPassword('');
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-gray-900/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden w-full max-w-sm border border-gray-200 dark:border-gray-700 p-8 transform transition-all">
                <div className="text-center mb-6">
                    <div className="h-20 w-20 rounded-full bg-blue-100 dark:bg-blue-900/50 flex flex-col items-center justify-center mx-auto mb-4 border-2 border-blue-500">
                        <Icon icon={Icons.locked} width={40} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Layar Terkunci</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Sesi Anda ({user.name}) ditangguhkan karena tidak ada aktivitas selama 30 menit.
                    </p>
                </div>

                <form onSubmit={handleUnlock} className="space-y-4">
                    <div>
                        <label className="sr-only">Password</label>
                        <input
                            type="password"
                            required
                            placeholder="Masukkan Password Anda"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 rounded-lg transition-colors flex justify-center shadow-lg shadow-blue-500/30"
                    >
                        {loading ? 'Memverifikasi...' : 'Buka Kunci'}
                    </button>

                    <div className="text-center mt-4">
                        <button type="button" onClick={() => window.location.href = '/login'} className="text-xs text-gray-500 hover:text-red-500 transition-colors">
                            Bukan saya? Logout & Ganti Akun
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
