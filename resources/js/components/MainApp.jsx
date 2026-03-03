import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from '../store';
import AppLayout from './layout/AppLayout';
import LoginPage from '../pages/auth/LoginPage';
import Dashboard from '../pages/Dashboard';

const PrivateRoute = ({ children }) => {
    const token = useSelector((state) => state.auth.token);
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

const GuestRoute = ({ children }) => {
    const token = useSelector((state) => state.auth.token);
    if (token) {
        return <Navigate to="/" replace />;
    }
    return children;
};

export default function MainApp() {
    return (
        <Provider store={store}>
            <Router>
                <Routes>
                    {/* Guest Route: Login */}
                    <Route
                        path="/login"
                        element={
                            <GuestRoute>
                                <LoginPage />
                            </GuestRoute>
                        }
                    />

                    {/* Protected Routes under AppLayout */}
                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <AppLayout />
                            </PrivateRoute>
                        }
                    >
                        <Route index element={<Dashboard />} />
                        {/* Placeholder untuk rute lain nanti */}
                        <Route path="*" element={
                            <div className="p-8 text-center text-gray-500">
                                <h2 className="text-2xl font-bold mb-2">404 Not Found</h2>
                                <p>Halaman tidak ditemukan atau sedang dalam pengembangan.</p>
                            </div>
                        } />
                    </Route>
                </Routes>
            </Router>
        </Provider>
    );
}

