import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    token: localStorage.getItem('espmi_token') || null,
    user: JSON.parse(localStorage.getItem('espmi_user')) || null,
    isLocked: localStorage.getItem('espmi_locked') === 'true' || false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (state, action) => {
            const { token, user } = action.payload;
            state.token = token;
            state.user = user;
            state.isLocked = false;
            // Persist to localStorage
            localStorage.setItem('espmi_token', token);
            localStorage.setItem('espmi_user', JSON.stringify(user));
            localStorage.setItem('espmi_locked', 'false');
        },
        logout: (state) => {
            state.token = null;
            state.user = null;
            state.isLocked = false;
            localStorage.removeItem('espmi_token');
            localStorage.removeItem('espmi_user');
            localStorage.removeItem('espmi_locked');
        },
        updateUser: (state, action) => {
            state.user = action.payload;
            localStorage.setItem('espmi_user', JSON.stringify(action.payload));
        },
        setLocked: (state, action) => {
            state.isLocked = action.payload;
            localStorage.setItem('espmi_locked', action.payload ? 'true' : 'false');
        },
        updateToken: (state, action) => {
            state.token = action.payload;
            localStorage.setItem('espmi_token', action.payload);
        }
    },
});

export const { setCredentials, logout, updateUser, setLocked, updateToken } = authSlice.actions;

export default authSlice.reducer;
