import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from '../store';
import AppLayout from './layout/AppLayout';
import LoginPage from '../pages/auth/LoginPage';
import Dashboard from '../pages/Dashboard';
import EvidenceAuditPage from '../pages/audit/EvidenceAuditPage';
import AuditSchedulePage from '../pages/audit/AuditSchedulePage';
import StandardAuditReviewPage from '../pages/audit/StandardAuditReviewPage';
import BorangManagementPage from '../pages/borang/BorangManagementPage';
import BorangDetailPage from '../pages/borang/BorangDetailPage';
import ExecutionRepositoryPage from '../pages/execution/ExecutionRepositoryPage';
import StandardIndex from '../pages/standards/StandardIndex';
import StandardBuilder from '../pages/standards/StandardBuilder';
import StandardDetailPage from '../pages/standards/StandardDetailPage';
import StandardReviewPage from '../pages/standards/StandardReviewPage';
import PermissionMatrixPage from '../pages/settings/PermissionMatrixPage';
import UserManagementPage from '../pages/settings/UserManagementPage';
import FacultyMasterPage from '../pages/settings/FacultyMasterPage';
import ProdiMasterPage from '../pages/settings/ProdiMasterPage';
import PtkPage from '../pages/ptk/PtkPage';
import ReportPage from '../pages/report/ReportPage';
import ReportDetailPage from '../pages/report/ReportDetailPage';
import NotificationPage from '../pages/notifications/NotificationPage';
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

const PermissionRoute = ({ permission, permissions: allowedPermissions = [], roles: allowedRoles = [], children }) => {
    const user = useSelector((state) => state.auth.user);
    const permissions = user?.permissions || [];
    const roles = user?.roles || [];
    const hasRole = (roleName) => roles.some((role) => (typeof role === 'string' ? role === roleName : role?.name === roleName));

    if (
        hasRole('SuperAdmin')
        || allowedRoles.some((roleName) => hasRole(roleName))
        || (permission && permissions.includes(permission))
        || allowedPermissions.some((permissionName) => permissions.includes(permissionName))
    ) {
        return children;
    }

    return <Navigate to="/" replace />;
};

export default function MainApp() {
    return (
        <Provider store={store}>
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
                        <Route path="notifications" element={<NotificationPage />} />
                        <Route
                            path="borang"
                            element={
                                <PermissionRoute permissions={['standard.update', 'audit.score.update', 'audit.view']}>
                                    <BorangManagementPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="borang/items/:borangItemId/detail"
                            element={
                                <PermissionRoute permissions={['standard.update', 'audit.score.update', 'audit.view']}>
                                    <BorangDetailPage />
                                </PermissionRoute>
                            }
                        />
                        <Route path="standards" element={<StandardIndex />} />
                        <Route path="standards/:id/detail" element={<StandardDetailPage />} />
                        <Route path="standards/:id/builder" element={<StandardBuilder />} />
                        <Route path="standards/:id/review" element={<StandardReviewPage />} />
                        <Route
                            path="standards/:id/execution"
                            element={
                                <PermissionRoute
                                    roles={['LPM-Admin', 'Kepala LPMI', 'Wakil Rektor 1', 'Wakil Rektor 2', 'Wakil Rektor 3', 'Rektor', 'Auditee']}
                                >
                                    <ExecutionRepositoryPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="audit/schedules"
                            element={
                                <PermissionRoute permission="audit.view">
                                    <AuditSchedulePage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="audit"
                            element={
                                <PermissionRoute permission="audit.score.update">
                                    <EvidenceAuditPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="audit/standards/:standardId/review"
                            element={
                                <PermissionRoute permission="audit.score.update">
                                    <StandardAuditReviewPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="ptk"
                            element={
                                <PermissionRoute permission="ptk.view">
                                    <PtkPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="report"
                            element={
                                <PermissionRoute permission="report.view">
                                    <ReportPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="report/:id"
                            element={
                                <PermissionRoute permission="report.view">
                                    <ReportDetailPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="settings/users"
                            element={
                                <PermissionRoute permission="user.view">
                                    <UserManagementPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="settings/master/faculties"
                            element={
                                <PermissionRoute permission="user.view">
                                    <FacultyMasterPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="settings/master/prodis"
                            element={
                                <PermissionRoute permission="user.view">
                                    <ProdiMasterPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="settings"
                            element={
                                <PermissionRoute permission="role.manage">
                                    <PermissionMatrixPage />
                                </PermissionRoute>
                            }
                        />
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
