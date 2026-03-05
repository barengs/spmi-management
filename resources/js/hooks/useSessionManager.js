import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout, setLocked, updateToken } from '../store/authSlice';
import api from '../services/api';
import { toast } from 'react-toastify';

const LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 mins
const LOGOUT_TIMEOUT_MS = 60 * 60 * 1000; // 60 mins
const REFRESH_INTERVAL_MS = 45 * 60 * 1000; // Refresh token every 45 mins of active session

export default function useSessionManager() {
    const dispatch = useDispatch();
    const { token, isLocked } = useSelector(state => state.auth);
    const lastActive = useRef(Date.now());
    const isTokenRefreshing = useRef(false);

    // Update last active timestamp
    const updateActivity = useCallback(() => {
        lastActive.current = Date.now();
    }, []);

    useEffect(() => {
        if (!token) return;

        // Attach global listeners
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }));

        // Check for inactivity every minute
        const activityCheckInterval = setInterval(() => {
            const now = Date.now();
            const timeIdle = now - lastActive.current;

            if (timeIdle >= LOGOUT_TIMEOUT_MS) {
                // Completely inactive for 60 mins -> auto logout
                toast.error('Sesi Anda telah berakhir karena tidak aktif.', { duration: 5000 });
                dispatch(logout());
                return;
            }

            if (timeIdle >= LOCK_TIMEOUT_MS && !isLocked) {
                // Inactive for 30 mins -> lock screen
                dispatch(setLocked(true));
                toast('Layar terkunci karena tidak ada aktivitas.', { 
                    icon: '🔒',
                    className: 'dark:bg-gray-800 dark:text-white'
                });
            }
        }, 60 * 1000);

        // Schedule token refresh 
        const tokenRefreshInterval = setInterval(async () => {
            if (isTokenRefreshing.current) return;

            const timeIdle = Date.now() - lastActive.current;
            // Only refresh if user is somewhat active (not idle > 60 mins, which is already handled above)
            if (timeIdle < LOGOUT_TIMEOUT_MS) {
                try {
                    isTokenRefreshing.current = true;
                    const res = await api.post('/auth/refresh');
                    if (res.data?.data?.token) {
                        dispatch(updateToken(res.data.data.token));
                        console.log('Session token refreshed in background');
                    }
                } catch (err) {
                    // Refresh failed (e.g. token expired on server)
                    console.error('Failed to refresh token', err);
                    dispatch(logout());
                    toast.error('Sesi Kadaluarsa. Silakan login kembali.');
                } finally {
                    isTokenRefreshing.current = false;
                }
            }
        }, REFRESH_INTERVAL_MS);

        return () => {
            events.forEach(event => window.removeEventListener(event, updateActivity));
            clearInterval(activityCheckInterval);
            clearInterval(tokenRefreshInterval);
        };
    }, [token, isLocked, dispatch, updateActivity]);
}
