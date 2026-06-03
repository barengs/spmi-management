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
import BorangProdiDetailPage from '../pages/borang/BorangProdiDetailPage';
import PelaksanaanPage from '../pages/pelaksanaan/PelaksanaanPage';
import ExecutionRepositoryPage from '../pages/execution/ExecutionRepositoryPage';
import StandardIndex from '../pages/standards/StandardIndex';
import StandardBuilder from '../pages/standards/StandardBuilder';
import StandardDetailPage from '../pages/standards/StandardDetailPage';
import StandardReviewPage from '../pages/standards/StandardReviewPage';
import PermissionMatrixPage from '../pages/settings/PermissionMatrixPage';
import PermissionIndexPage from '../pages/settings/PermissionIndexPage';
import PermissionFormPage from '../pages/settings/PermissionFormPage';
import UserManagementPage from '../pages/settings/UserManagementPage';
import FacultyMasterPage from '../pages/settings/FacultyMasterPage';
import ProdiMasterPage from '../pages/settings/ProdiMasterPage';
import CycleSettingPage from '../pages/settings/CycleSettingPage';
import PtkPage from '../pages/ptk/PtkPage';
import ReportPage from '../pages/report/ReportPage';
import ReportDetailPage from '../pages/report/ReportDetailPage';
import NotificationPage from '../pages/notifications/NotificationPage';
import AccountPage from '../pages/account/AccountPage';
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
                        <Route path="account" element={<AccountPage />} />
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
                            path="borang/prodi/:prodiId"
                            element={
                                <PermissionRoute permissions={['standard.update', 'audit.score.update', 'audit.view']}>
                                    <BorangProdiDetailPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="borang/:borangItemId"
                            element={
                                <PermissionRoute permissions={['standard.update', 'audit.score.update', 'audit.view']}>
                                    <BorangDetailPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="standards"
                            element={
                                <PermissionRoute permissions={['standard.view', 'standard.create', 'standard.update', 'standard.publish', 'report.export']}>
                                    <StandardIndex />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="standards/:id"
                            element={
                                <PermissionRoute permissions={['standard.view', 'standard.create', 'standard.update', 'standard.publish', 'report.export']}>
                                    <StandardDetailPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="standards/:id/builder"
                            element={
                                <PermissionRoute permissions={['standard.create', 'standard.update']}>
                                    <StandardBuilder />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="standards/:id/review"
                            element={
                                <PermissionRoute permissions={['standard.publish']} roles={['Pimpinan', 'Kepala LPMI', 'Wakil Rektor 1', 'Wakil Rektor 2', 'Wakil Rektor 3', 'Rektor']}>
                                    <StandardReviewPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="pelaksanaan"
                            element={
                                <PermissionRoute permissions={['standard.update', 'audit.score.update', 'audit.view']}>
                                    <PelaksanaanPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="pelaksanaan/prodis/:prodiId/standards"
                            element={
                                <PermissionRoute permissions={['standard.update', 'audit.score.update', 'audit.view']}>
                                    <PelaksanaanPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="pelaksanaan/items/:itemId"
                            element={
                                <PermissionRoute permissions={['standard.update', 'audit.score.update', 'audit.view']}>
                                    <PelaksanaanPage />
                                </PermissionRoute>
                            }
                        />
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
                            path="audit/prodi/:prodiId"
                            element={
                                <PermissionRoute permission="audit.score.update">
                                    <EvidenceAuditPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="audit/:standardId/review"
                            element={
                                <PermissionRoute permission="audit.score.update">
                                    <StandardAuditReviewPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="ptk"
                            element={
                                <PermissionRoute permission="ptk.view" roles={['Auditor']}>
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
                            path="settings/cycle"
                            element={
                                <PermissionRoute permission="role.manage">
                                    <CycleSettingPage />
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
                        <Route
                            path="settings/permissions"
                            element={
                                <PermissionRoute permission="role.manage">
                                    <PermissionIndexPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="settings/permissions/add"
                            element={
                                <PermissionRoute permission="role.manage">
                                    <PermissionFormPage />
                                </PermissionRoute>
                            }
                        />
                        <Route
                            path="settings/permissions/:id/edit"
                            element={
                                <PermissionRoute permission="role.manage">
                                    <PermissionFormPage />
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
