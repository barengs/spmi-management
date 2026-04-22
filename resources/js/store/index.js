import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import borangReducer from './borangSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        borang: borangReducer,
    },
});
