import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    token: localStorage.getItem('espmi_token') || null,
    user: JSON.parse(localStorage.getItem('espmi_user')) || null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (state, action) => {
            const { token, user } = action.payload;
            state.token = token;
            state.user = user;
            // Persist to localStorage
            localStorage.setItem('espmi_token', token);
            localStorage.setItem('espmi_user', JSON.stringify(user));
        },
        logout: (state) => {
            state.token = null;
            state.user = null;
            localStorage.removeItem('espmi_token');
            localStorage.removeItem('espmi_user');
        },
        updateUser: (state, action) => {
            state.user = action.payload;
            localStorage.setItem('espmi_user', JSON.stringify(action.payload));
        }
    },
});

export const { setCredentials, logout, updateUser } = authSlice.actions;

export default authSlice.reducer;
