import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useAuth } from '../../services/authStore';
import Icon, { Icons } from '../../components/ui/Icon';
import TanStackDataTable from '../../components/ui/TanStackDataTable';

export default function BorangManagementPage() {
    const PAGE_SIZE = 10;
    const { user } = useAuth();
    const permissions = user?.permissions || [];
    const roles = user?.roles || [];
    const hasRole = (roleName) => roles.some((role) => (typeof role === 'string' ? role === roleName : role?.name === roleName));
    const canManageBorang = hasRole('SuperAdmin') || permissions.includes('standard.update');
    const canAuditBorang = permissions.includes('audit.score.update');
    const canViewBorang = permissions.includes('audit.view');
    const isReadOnlyBorang = !canManageBorang && !canAuditBorang && canViewBorang;
    const [units, setUnits] = useState([]);
    const [assignedSchedules, setAssignedSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pairsPage, setPairsPage] = useState(1);
    const [pairsSearch, setPairsSearch] = useState('');
    const [pairsFacultyFilter, setPairsFacultyFilter] = useState('ALL');

    const fetchPageData = async () => {
        try {
            setLoading(true);

            if (canManageBorang) {
                const [unitsResponse, schedulesResponse] = await Promise.all([
                    api.get('/units/flat'),
                    permissions.includes('audit.view') || hasRole('SuperAdmin') || hasRole('LPM-Admin')
                        ? api.get('/audit-schedules')
                        : Promise.resolve({ data: { data: [] } }),
                ]);
                setUnits(unitsResponse.data.data || []);
                setAssignedSchedules(schedulesResponse.data.data || []);
            } else if (canAuditBorang || canViewBorang) {
                const [unitsResponse, schedulesResponse] = await Promise.all([
                    api.get('/units/flat'),
                    api.get('/audit-schedules'),
                ]);
                setUnits(unitsResponse.data.data || []);
                setAssignedSchedules(schedulesResponse.data.data || []);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Data borang gagal dimuat.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPageData();
    }, [canManageBorang, canAuditBorang, canViewBorang, permissions, roles]);

    const facultyRows = useMemo(() => {
        if (canManageBorang) {
            return units
                .filter((unit) => unit.level === 'faculty')
                .sort((left, right) => left.name.localeCompare(right.name, 'id-ID'));
        }

        const facultyMap = new Map();
        assignedSchedules.forEach((schedule) => {
            if (schedule?.faculty?.id && !facultyMap.has(String(schedule.faculty.id))) {
                facultyMap.set(String(schedule.faculty.id), schedule.faculty);
            }
        });

        return Array.from(facultyMap.values()).sort((left, right) => left.name.localeCompare(right.name, 'id-ID'));
    }, [assignedSchedules, canManageBorang, units]);

    const facultyProdiRows = useMemo(() => {
        if (canManageBorang) {
            return facultyRows.flatMap((faculty) => (
                units
                    .filter((unit) => unit.level === 'department' && String(unit.parent_id) === String(faculty.id))
                    .sort((left, right) => left.name.localeCompare(right.name, 'id-ID'))
                    .map((prodi) => ({
                        faculty,
                        prodi,
                        schedule: null,
                    }))
            ));
        }

        return assignedSchedules
            .filter((schedule) => schedule?.faculty?.id && schedule?.prodi?.id)
            .map((schedule) => ({
                faculty: schedule.faculty,
                prodi: schedule.prodi,
                schedule,
            }))
            .sort((left, right) => left.prodi.name.localeCompare(right.prodi.name, 'id-ID'));
    }, [assignedSchedules, canManageBorang, facultyRows, units]);

    const filteredFacultyProdiRows = useMemo(() => (
        facultyProdiRows.filter(({ faculty, prodi, schedule }) => (
            (pairsFacultyFilter === 'ALL' || String(faculty.id) === pairsFacultyFilter)
            && `${faculty.name} ${faculty.code || ''} ${prodi.name} ${prodi.code || ''} ${schedule?.standard?.name || ''}`.toLowerCase().includes(pairsSearch.trim().toLowerCase())
        ))
    ), [facultyProdiRows, pairsFacultyFilter, pairsSearch]);

    const pairTotalPages = Math.max(1, Math.ceil(filteredFacultyProdiRows.length / PAGE_SIZE));
    const facultyProdiColumns = useMemo(() => [
        {
            accessorKey: 'prodi.name',
            header: 'Nama Prodi',
            cell: ({ row }) => <span className="font-semibold text-gray-900">{row.original.prodi.name}</span>,
        },
        {
            accessorKey: 'faculty.name',
            header: 'Nama Fakultas',
            cell: ({ row }) => row.original.faculty.name,
        },
        ...(!canManageBorang ? [{
            accessorKey: 'schedule.standard.name',
            header: 'Standar',
            cell: ({ row }) => row.original.schedule?.standard?.name || '-',
        }] : []),
        {
            id: 'actions',
            header: 'Aksi',
            meta: {
                headerClassName: 'px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-gray-500',
                cellClassName: 'px-6 py-4 text-right',
            },
            cell: ({ row }) => (
                <button
                    type="button"
                    onClick={() => window.location.assign(`/borang/prodi/${row.original.prodi.id}`)}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                >
                    <Icon icon={Icons.eye} width={16} />
                    {canManageBorang || isReadOnlyBorang ? 'Lihat Dokumen' : 'Lihat Checklist'}
                </button>
            ),
        },
    ], [canManageBorang, isReadOnlyBorang]);

    useEffect(() => {
        setPairsPage(1);
    }, [pairsFacultyFilter, pairsSearch]);

    useEffect(() => {
        setPairsPage((currentPage) => Math.min(currentPage, pairTotalPages));
    }, [pairTotalPages]);

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                            canManageBorang ? 'bg-amber-50 text-amber-700' : isReadOnlyBorang ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                            <Icon icon={Icons.document} width={14} />
                            {canManageBorang ? 'LPM-Admin' : isReadOnlyBorang ? 'Read Only' : 'Audit Mode'}
                        </div>
                        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Borang Fakultas dan Prodi</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                            Halaman ini hanya menampilkan daftar fakultas dan prodi. Detail dokumen borang per prodi sekarang dibuka pada halaman terpisah.
                        </p>
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                            {canManageBorang ? 'Daftar Fakultas dan Prodi' : isReadOnlyBorang ? 'Daftar Prodi Borang' : 'Daftar Prodi Audit'}
                        </h2>
                        <span className="text-sm text-gray-500">{filteredFacultyProdiRows.length} baris</span>
                    </div>
                </div>
                <div className="grid gap-4 border-b border-gray-200 px-6 py-4 md:grid-cols-[220px_minmax(0,1fr)]">
                    <select
                        value={pairsFacultyFilter}
                        onChange={(event) => setPairsFacultyFilter(event.target.value)}
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                    >
                        <option value="ALL">Semua Fakultas</option>
                        {facultyRows.map((faculty) => (
                            <option key={faculty.id} value={String(faculty.id)}>
                                {faculty.name}
                            </option>
                        ))}
                    </select>
                    <input
                        type="text"
                        value={pairsSearch}
                        onChange={(event) => setPairsSearch(event.target.value)}
                        placeholder={canManageBorang ? 'Filter faculty name, prodi name, atau kode...' : 'Filter fakultas, prodi, standar, atau kode...'}
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                    />
                </div>

                <TanStackDataTable
                    columns={facultyProdiColumns}
                    data={filteredFacultyProdiRows}
                    loading={loading}
                    loadingMessage="Memuat data borang..."
                    emptyMessage={canManageBorang ? 'Belum ada data fakultas dan prodi.' : isReadOnlyBorang ? 'Belum ada prodi borang yang ditugaskan kepada Anda.' : 'Belum ada prodi audit yang ditugaskan kepada Anda.'}
                    page={pairsPage}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPairsPage}
                />
            </section>

            <section className={`rounded-3xl border border-dashed p-5 text-sm leading-6 ${
                canManageBorang
                    ? 'border-amber-200 bg-amber-50/60 text-amber-900'
                    : isReadOnlyBorang
                        ? 'border-sky-200 bg-sky-50/60 text-sky-900'
                        : 'border-rose-200 bg-rose-50/60 text-rose-900'
            }`}>
                {canManageBorang
                    ? 'LPMI Admin menambahkan item borang per prodi dengan memilih indikator dari standar yang sudah disusun. Klik Lihat Dokumen untuk membuka halaman detail prodi.'
                    : isReadOnlyBorang
                        ? 'Mode baca menampilkan borang untuk prodi yang ditugaskan kepada auditee. Klik Lihat Dokumen untuk membuka daftar indikator dan status bukti pada halaman terpisah.'
                        : 'Dalam audit mode, auditor hanya melihat borang untuk prodi yang ditugaskan. Klik Lihat Checklist untuk membuka halaman checklist audit pada route terpisah.'}
            </section>
        </div>
    );
}
