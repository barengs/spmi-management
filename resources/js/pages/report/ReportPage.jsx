import React from 'react';
import { useSelector } from 'react-redux';
import Icon, { Icons } from '../../components/ui/Icon';

export default function ReportPage() {
    const user = useSelector((state) => state.auth.user);
    const permissions = user?.permissions || [];
    const canExport = user?.roles?.includes('SuperAdmin') || permissions.includes('report.export');

    return (
        <div className="p-6 sm:p-8 space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    <Icon icon={Icons.report} width={14} />
                    Report Eksekutif
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-gray-900">Laporan Eksekutif</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Halaman laporan sedang disiapkan. Akses sudah dibatasi berdasarkan permission agar pimpinan dan admin hanya melihat kemampuan yang memang tersedia.
                </p>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Akses Lihat Report</div>
                    <div className="mt-3 text-lg font-semibold text-gray-900">Aktif</div>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                        Role Anda sudah memiliki izin untuk membuka modul laporan.
                    </p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Akses Export</div>
                    <div className="mt-3 text-lg font-semibold text-gray-900">{canExport ? 'Aktif' : 'Tidak Aktif'}</div>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                        Ekspor laporan akan dibuka hanya untuk role yang memiliki izin `report.export`.
                    </p>
                </div>
            </section>

            <section className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-8 text-sm text-gray-500 shadow-sm">
                Modul report belum tersedia di sprint ini. Route ini disediakan agar navigasi sidebar konsisten dan tidak jatuh ke placeholder 404 umum.
            </section>
        </div>
    );
}
