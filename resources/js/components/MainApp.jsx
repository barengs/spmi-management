import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from '../store';
import AppLayout from './layout/AppLayout';
import LoginPage from '../pages/auth/LoginPage';
import Dashboard from '../pages/Dashboard';
import StandardIndex from '../pages/standards/StandardIndex';
import StandardBuilder from '../pages/standards/StandardBuilder';
import SelfAssessmentPage from '../pages/audit/SelfAssessmentPage';
import PeriodIndex from '../pages/audit/Periods/PeriodIndex';
import AuditorPlotting from '../pages/audit/Plotting/AuditorPlotting';
import DeskEvaluation from '../pages/audit/WorkingPaper/DeskEvaluation';
import UnitIndex from '../pages/master/UnitIndex';
import UserIndex from '../pages/master/UserIndex';
import { ErrorBoundary } from './ErrorBoundary';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
            <ErrorBoundary>
                <ToastContainer position="top-right" autoClose={3000} />
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
                            <Route path="standards" element={<StandardIndex />} />
                            <Route path="standards/:id/builder" element={<StandardBuilder />} />

                            {/* Audit / Pelaksanaan */}
                            <Route path="self-assessments" element={<SelfAssessmentPage />} />
                            <Route path="audit">
                                <Route index element={<Navigate to="periods" replace />} />
                                <Route path="periods" element={<PeriodIndex />} />
                                <Route path=":id/plotting" element={<AuditorPlotting />} />
                                <Route path=":id/working-paper" element={<DeskEvaluation />} />
                            </Route>

                            {/* Master Data */}
                            <Route path="master">
                                <Route path="units" element={<UnitIndex />} />
                                <Route path="users" element={<UserIndex />} />
                            </Route>

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
            </ErrorBoundary>
        </Provider>
    );
}

