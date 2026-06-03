import { useQuery } from '@tanstack/react-query';
import { queryClient } from './queryClient';

const AUTH_QUERY_KEY = ['auth'];

function readStoredUser() {
    try {
        return JSON.parse(localStorage.getItem('espmi_user')) || null;
    } catch (error) {
        return null;
    }
}

const initialAuthState = {
    token: localStorage.getItem('espmi_token') || null,
    user: readStoredUser(),
    isLocked: localStorage.getItem('espmi_locked') === 'true',
};

function setAuthState(updater) {
    queryClient.setQueryData(AUTH_QUERY_KEY, (current = initialAuthState) => (
        typeof updater === 'function' ? updater(current) : updater
    ));
}

export function getAuthState() {
    return queryClient.getQueryData(AUTH_QUERY_KEY) || initialAuthState;
}

export function useAuth() {
    const { data } = useQuery({
        queryKey: AUTH_QUERY_KEY,
        queryFn: getAuthState,
        initialData: getAuthState,
        staleTime: Infinity,
    });

    return data;
}

export const authActions = {
    setCredentials({ token, user }) {
        localStorage.setItem('espmi_token', token);
        localStorage.setItem('espmi_user', JSON.stringify(user));
        localStorage.setItem('espmi_locked', 'false');

        setAuthState({
            token,
            user,
            isLocked: false,
        });
    },

    logout() {
        localStorage.removeItem('espmi_token');
        localStorage.removeItem('espmi_user');
        localStorage.removeItem('espmi_locked');

        setAuthState({
            token: null,
            user: null,
            isLocked: false,
        });
    },

    updateUser(user) {
        localStorage.setItem('espmi_user', JSON.stringify(user));

        setAuthState((current) => ({
            ...current,
            user,
        }));
    },

    setLocked(isLocked) {
        localStorage.setItem('espmi_locked', isLocked ? 'true' : 'false');

        setAuthState((current) => ({
            ...current,
            isLocked,
        }));
    },

    updateToken(token) {
        localStorage.setItem('espmi_token', token);

        setAuthState((current) => ({
            ...current,
            token,
        }));
    },
};
