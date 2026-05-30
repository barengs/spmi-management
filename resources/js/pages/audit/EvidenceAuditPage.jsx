import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';
import TablePagination from '../../components/ui/TablePagination';

const initialFacultyForm = {
    name: '',
    code: '',
};

function getAmiStatus(schedule) {
    if (!schedule) {
        return {
            label: 'Belum Dijadwalkan',
            className: 'border-gray-200 bg-gray-100 text-gray-700',
        };
    }

    if (schedule.audit_period_status === 'ENDED') {
        return {
            label: 'Selesai',
            className: 'border-emerald-200 bg-emerald-100 text-emerald-700',
        };
    }

    const now = new Date();
    const start = schedule.scheduled_start ? new Date(schedule.scheduled_start) : null;

    if (start && start > now) {
        return {
            label: 'Belum Mulai',
            className: 'border-amber-200 bg-amber-100 text-amber-700',
        };
    }

    return {
        label: 'Sedang Berjalan',
        className: 'border-sky-200 bg-sky-100 text-sky-700',
    };
}

export default function EvidenceAuditPage() {
    const PAGE_SIZE = 10;
    const { prodiId } = useParams();
    const user = useSelector((state) => state.auth.user);
    const [units, setUnits] = useState([]);
    const [assignedSchedules, setAssignedSchedules] = useState([]);
    const [auditSchedules, setAuditSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
    const [facultyForm, setFacultyForm] = useState(initialFacultyForm);
    const [savingFaculty, setSavingFaculty] = useState(false);
    const [viewMode, setViewMode] = useState('pairs');
    const [selectedFaculty, setSelectedFaculty] = useState(null);
    const [selectedProdi, setSelectedProdi] = useState(null);
    const [requirementRows, setRequirementRows] = useState([]);
    const [activeRequirementTab, setActiveRequirementTab] = useState('DEKAN');
    const [pairsPage, setPairsPage] = useState(1);
    const [requirementsPage, setRequirementsPage] = useState(1);
    const [pairsSearch, setPairsSearch] = useState('');
    const [pairsFacultyFilter, setPairsFacultyFilter] = useState('ALL');
    const [requirementsSearch, setRequirementsSearch] = useState('');
    const [requirementsStandardFilter, setRequirementsStandardFilter] = useState('ALL');
    const [endAuditConclusion, setEndAuditConclusion] = useState('');
    const [endingAuditPeriod, setEndingAuditPeriod] = useState(false);
    const permissions = user?.permissions || [];
    const roles = user?.roles || [];
    const hasRole = (roleName) => roles.some((role) => (typeof role === 'string' ? role === roleName : role?.name === roleName));
    const canCreateFaculty = hasRole('SuperAdmin') || permissions.includes('unit.create');
    const canViewAllAuditUnits = hasRole('SuperAdmin') || hasRole('LPM-Admin');

    const fetchPageData = async () => {
        try {
            setLoading(true);

            if (canViewAllAuditUnits) {
                const [unitsResponse, schedulesResponse] = await Promise.all([
                    api.get('/units/flat'),
                    api.get('/audit-schedules'),
                ]);
                setUnits(unitsResponse.data.data || []);
                setAssignedSchedules(schedulesResponse.data.data || []);
                setAuditSchedules(schedulesResponse.data.data || []);
            } else {
                const schedulesResponse = await api.get('/audit-schedules');
                setAssignedSchedules(schedulesResponse.data.data || []);
                setAuditSchedules(schedulesResponse.data.data || []);
                setUnits([]);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Halaman audit gagal dimuat.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPageData();
    }, [canViewAllAuditUnits]);

    const facultyRows = useMemo(() => (
        units
            .filter((unit) => unit.level === 'faculty')
            .sort((left, right) => left.name.localeCompare(right.name, 'id-ID'))
    ), [units]);

    const facultyProdiRows = useMemo(() => {
        if (canViewAllAuditUnits) {
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
            .filter((schedule) => schedule?.prodi?.id && schedule?.faculty?.id)
            .sort((left, right) => {
                const leftName = left.prodi?.name || '';
                const rightName = right.prodi?.name || '';
                return leftName.localeCompare(rightName, 'id-ID');
            })
            .map((schedule) => ({
                faculty: schedule.faculty,
                prodi: schedule.prodi,
                schedule,
            }));
    }, [assignedSchedules, canViewAllAuditUnits, facultyRows, units]);

    useEffect(() => {
        if (!prodiId) {
            setSelectedFaculty(null);
            setSelectedProdi(null);
            setRequirementRows([]);
            setViewMode('pairs');
            return;
        }

        if (loading) {
            return;
        }

        const matchedPair = canViewAllAuditUnits
            ? facultyProdiRows.find(({ prodi }) => String(prodi?.id || '') === String(prodiId))
            : assignedSchedules
                .filter((schedule) => schedule?.prodi?.id && schedule?.faculty?.id)
                .map((schedule) => ({
                    faculty: schedule.faculty,
                    prodi: schedule.prodi,
                }))
                .find(({ prodi }) => String(prodi?.id || '') === String(prodiId));

        if (!matchedPair?.prodi || !matchedPair?.faculty) {
            toast.error('Prodi audit tidak ditemukan.');
            setSelectedFaculty(null);
            setSelectedProdi(null);
            setRequirementRows([]);
            setViewMode('pairs');
            return;
        }

        if (String(selectedProdi?.id || '') === String(matchedPair.prodi.id) && viewMode === 'requirements') {
            return;
        }

        openRequirementTable(matchedPair.faculty, matchedPair.prodi);
    }, [assignedSchedules, canViewAllAuditUnits, facultyProdiRows, loading, prodiId, selectedProdi?.id, viewMode]);

    const openFacultyModal = () => {
        setFacultyForm(initialFacultyForm);
        setIsFacultyModalOpen(true);
    };

    const closeFacultyModal = () => {
        if (savingFaculty) {
            return;
        }

        setIsFacultyModalOpen(false);
        setFacultyForm(initialFacultyForm);
    };

    const handleCreateFaculty = async (event) => {
        event.preventDefault();

        if (!facultyForm.name.trim()) {
            toast.warning('Nama fakultas wajib diisi.');
            return;
        }

        setSavingFaculty(true);

        try {
            const response = await api.post('/units', {
                name: facultyForm.name.trim(),
                code: facultyForm.code.trim() || null,
                level: 'faculty',
                parent_id: null,
                is_active: true,
            });

            toast.success(response.data.message || 'Fakultas berhasil ditambahkan.');
            closeFacultyModal();
            await fetchPageData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Fakultas gagal ditambahkan.');
        } finally {
            setSavingFaculty(false);
        }
    };

    const openRequirementTable = async (faculty, prodi) => {
        setSelectedFaculty(faculty);
        setSelectedProdi(prodi);
        setActiveRequirementTab('DEKAN');
        setLoading(true);

        try {
            const response = await api.get(`/borang/prodis/${prodi.id}`);
            const rows = (response.data.data || []).map((row) => ({
                id: row.id,
                standardName: row.standard_name,
                iku: row.iku,
                ikt: row.ikt,
                sasaranMutu: row.sasaran_mutu,
                indikator: row.indikator,
                targetSasaran: row.target_sasaran,
                pj: row.pj,
            }));

            setRequirementRows(rows);
            setViewMode('requirements');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Dokumen borang prodi gagal dimuat.');
        } finally {
            setLoading(false);
        }
    };

    const goBackToPairs = () => {
        setSelectedFaculty(null);
        setSelectedProdi(null);
        setViewMode('pairs');
    };

    const titleConfig = {
        pairs: {
            title: canViewAllAuditUnits ? 'Daftar Fakultas dan Prodi' : 'Daftar Prodi Tugas Audit',
            description: canViewAllAuditUnits
                ? 'Tampilan awal audit menampilkan tabel gabungan fakultas dan prodi. Auditor langsung membuka detail borang dari kombinasi fakultas dan prodi yang dipilih.'
                : 'Halaman ini menampilkan hanya prodi yang saat ini ditugaskan kepada Anda sebagai auditor atau lead auditor.',
        },
        requirements: {
            title: `Daftar Dokumen ${selectedFaculty?.name || '-'} / ${selectedProdi?.name || '-'}`.trim(),
            description: 'Tabel berikut berisi seluruh indikator dan target sasaran yang harus dipenuhi oleh prodi terpilih.',
        },
    };

    const pageMeta = titleConfig[viewMode];
    const filteredFacultyProdiRows = useMemo(() => (
        facultyProdiRows.filter(({ faculty, prodi, schedule }) => (
            (pairsFacultyFilter === 'ALL' || String(faculty.id) === pairsFacultyFilter)
            && `${faculty.name} ${faculty.code || ''} ${prodi.name} ${prodi.code || ''} ${schedule?.standard?.name || ''}`.toLowerCase().includes(pairsSearch.trim().toLowerCase())
        ))
    ), [facultyProdiRows, pairsFacultyFilter, pairsSearch]);

    const standardOptions = useMemo(() => (
        Array.from(new Set(requirementRows.map((row) => row.standardName))).sort((left, right) => left.localeCompare(right, 'id-ID'))
    ), [requirementRows]);

    const filteredRequirementRows = useMemo(() => (
        requirementRows
            .filter((row) => row.pj === (activeRequirementTab === 'DEKAN' ? 'Dekan' : 'Kaprodi'))
            .filter((row) => requirementsStandardFilter === 'ALL' || row.standardName === requirementsStandardFilter)
            .filter((row) => (
                `${row.standardName} ${row.iku} ${row.ikt} ${row.sasaranMutu} ${row.indikator} ${row.targetSasaran} ${row.pj}`.toLowerCase().includes(requirementsSearch.trim().toLowerCase())
            ))
            .map((row, index) => ({
                ...row,
                no: index + 1,
            }))
    ), [activeRequirementTab, requirementRows, requirementsSearch, requirementsStandardFilter]);

    const selectedSchedule = useMemo(() => (
        auditSchedules.find((schedule) => String(schedule?.prodi?.id || '') === String(selectedProdi?.id || '')) || null
    ), [auditSchedules, selectedProdi?.id]);

    const isAssignedLeadAuditor = String(selectedSchedule?.lead_auditor?.id || '') === String(user?.id || '');
    const isAssignedAuditor = String(selectedSchedule?.auditor?.id || '') === String(user?.id || '');
    const canManageAuditPeriod = isAssignedLeadAuditor || isAssignedAuditor;
    const auditAlreadyEnded = selectedSchedule?.audit_period_status === 'ENDED';
    const currentUserEndApprovalStatus = isAssignedLeadAuditor
        ? selectedSchedule?.audit_period_lead_status
        : isAssignedAuditor
            ? selectedSchedule?.audit_period_auditor_status
            : null;
    const otherAuditorEndApprovalStatus = isAssignedLeadAuditor
        ? selectedSchedule?.audit_period_auditor_status
        : isAssignedAuditor
            ? selectedSchedule?.audit_period_lead_status
            : null;
    const hasCurrentUserApprovedEndPeriod = currentUserEndApprovalStatus === 'APPROVED';

    const pairTotalPages = Math.max(1, Math.ceil(filteredFacultyProdiRows.length / PAGE_SIZE));
    const paginatedFacultyProdiRows = useMemo(() => (
        filteredFacultyProdiRows.slice((pairsPage - 1) * PAGE_SIZE, pairsPage * PAGE_SIZE)
    ), [filteredFacultyProdiRows, pairsPage]);

    const requirementTotalPages = Math.max(1, Math.ceil(filteredRequirementRows.length / PAGE_SIZE));
    const paginatedRequirementRows = useMemo(() => (
        filteredRequirementRows
            .slice((requirementsPage - 1) * PAGE_SIZE, requirementsPage * PAGE_SIZE)
            .map((row, index) => ({ ...row, no: (requirementsPage - 1) * PAGE_SIZE + index + 1 }))
    ), [filteredRequirementRows, requirementsPage]);

    useEffect(() => {
        setPairsPage((current) => Math.min(current, pairTotalPages));
    }, [pairTotalPages]);

    useEffect(() => {
        setPairsPage(1);
    }, [pairsFacultyFilter, pairsSearch]);

    useEffect(() => {
        setRequirementsPage(1);
    }, [activeRequirementTab, requirementsSearch, requirementsStandardFilter, selectedFaculty, selectedProdi]);

    useEffect(() => {
        setRequirementsPage((current) => Math.min(current, requirementTotalPages));
    }, [requirementTotalPages]);

    useEffect(() => {
        setEndAuditConclusion(selectedSchedule?.audit_period_conclusion || '');
    }, [selectedSchedule?.audit_period_conclusion, selectedSchedule?.id]);

    const handleEndAuditPeriod = async () => {
        if (!selectedSchedule?.id) {
            toast.error('Jadwal audit untuk prodi ini tidak ditemukan.');
            return;
        }

        if (!endAuditConclusion.trim()) {
            toast.warning('Kesimpulan audit wajib diisi sebelum mengakhiri periode.');
            return;
        }

        setEndingAuditPeriod(true);

        try {
            const response = await api.patch(`/audit-schedules/${selectedSchedule.id}/end-period`, {
                conclusion: endAuditConclusion.trim(),
            });

            setAuditSchedules((current) => current.map((schedule) => (
                String(schedule.id) === String(response.data.data?.id) ? response.data.data : schedule
            )));
            setAssignedSchedules((current) => current.map((schedule) => (
                String(schedule.id) === String(response.data.data?.id) ? response.data.data : schedule
            )));
            toast.success(response.data.message || 'Periode audit berhasil diakhiri.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Periode audit gagal diakhiri.');
        } finally {
            setEndingAuditPeriod(false);
        }
    };

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">
                            <Icon icon={Icons.audit} width={14} />
                            Audit Dokumen
                        </div>
                        <h1 className="mt-4 text-2xl font-semibold text-gray-900">{pageMeta.title}</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                            {pageMeta.description}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {viewMode !== 'pairs' && (
                            <Link
                                to="/audit"
                                onClick={goBackToPairs}
                                className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                            >
                                <Icon icon={Icons.back} width={16} />
                                Kembali
                            </Link>
                        )}

                        {viewMode === 'requirements' && selectedProdi?.id && (
                            <Link
                                to={`/borang/prodi/${selectedProdi.id}`}
                                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                            >
                                <Icon icon={Icons.eye} width={16} />
                                Buka Borang Prodi
                            </Link>
                        )}

                        {viewMode === 'pairs' && canCreateFaculty && (
                            <button
                                type="button"
                                onClick={openFacultyModal}
                                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                            >
                                <Icon icon={Icons.add} width={16} />
                                Tambah Fakultas
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {viewMode === 'pairs' && (
                <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                                {canViewAllAuditUnits ? 'Daftar Fakultas dan Prodi' : 'Daftar Prodi Penugasan'}
                            </h2>
                            <span className="text-sm text-gray-500">{filteredFacultyProdiRows.length} baris</span>
                        </div>
                    </div>
                    <div className="grid gap-4 border-b border-gray-200 px-6 py-4 md:grid-cols-[220px_minmax(0,1fr)]">
                        <select
                            value={pairsFacultyFilter}
                            onChange={(event) => setPairsFacultyFilter(event.target.value)}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
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
                            placeholder={canViewAllAuditUnits ? 'Filter faculty name, prodi name, atau kode...' : 'Filter prodi, fakultas, standar, atau kode...'}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Prodi Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Faculty Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Status AMI</th>
                                    {!canViewAllAuditUnits && (
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Standar / Jadwal</th>
                                    )}
                                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {loading ? (
                                    <tr>
                                        <td colSpan={canViewAllAuditUnits ? 4 : 5} className="px-6 py-10 text-center text-sm text-gray-500">Memuat data audit...</td>
                                    </tr>
                                ) : filteredFacultyProdiRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={canViewAllAuditUnits ? 4 : 5} className="px-6 py-10 text-center text-sm text-gray-500">
                                            {canViewAllAuditUnits ? 'Belum ada data fakultas dan prodi.' : 'Belum ada prodi audit yang ditugaskan kepada Anda.'}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedFacultyProdiRows.map(({ faculty, prodi, schedule }) => (
                                        <tr key={schedule?.id ? `schedule-${schedule.id}` : `${faculty.id}-${prodi.id}`} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">{prodi.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{faculty.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700">
                                                {(() => {
                                                    const amiStatus = getAmiStatus(schedule);

                                                    return (
                                                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${amiStatus.className}`}>
                                                            {amiStatus.label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            {!canViewAllAuditUnits && (
                                                <td className="px-6 py-4 text-sm text-gray-700">
                                                    <div className="font-medium text-gray-900">{schedule?.standard?.name || '-'}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {schedule?.scheduled_start
                                                            ? new Date(schedule.scheduled_start).toLocaleDateString('id-ID', { dateStyle: 'medium' })
                                                            : 'Tanpa jadwal'}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    to={`/audit/prodi/${prodi.id}`}
                                                    className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                                                >
                                                    <Icon icon={Icons.eye} width={16} />
                                                    Lihat Detail
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
            {viewMode === 'pairs' && (
                <section className="-mt-4 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <TablePagination
                        page={pairsPage}
                        totalPages={pairTotalPages}
                        totalItems={filteredFacultyProdiRows.length}
                        pageSize={PAGE_SIZE}
                        onPageChange={setPairsPage}
                    />
                </section>
            )}

            {viewMode === 'requirements' && (
                <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Daftar Kewajiban Indikator</h2>
                            <span className="text-sm text-gray-500">{filteredRequirementRows.length} baris</span>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Prodi</div>
                                    <div className="mt-2 text-sm font-semibold text-gray-900">{selectedProdi?.name || '-'}</div>
                                </div>
                                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Fakultas</div>
                                    <div className="mt-2 text-sm font-semibold text-gray-900">{selectedFaculty?.name || '-'}</div>
                                </div>
                                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Auditee</div>
                                    <div className="mt-2 text-sm font-semibold text-gray-900">
                                        {assignedSchedules.find((schedule) => String(schedule?.prodi?.id || '') === String(selectedProdi?.id || ''))?.auditee?.name || '-'}
                                    </div>
                                    <div className="mt-1 text-xs text-gray-500">
                                        {assignedSchedules.find((schedule) => String(schedule?.prodi?.id || '') === String(selectedProdi?.id || ''))?.auditee?.email || 'Belum ada auditee'}
                                    </div>
                                </div>
                        </div>
                        {selectedSchedule && (
                            <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50/70 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Penutupan Periode Audit</div>
                                        <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900">
                                            Salah satu auditor dapat memulai penutupan periode. Periode baru benar-benar berakhir setelah auditor lainnya ikut menyetujui, dan tidak ada PTK yang masih berjalan.
                                        </p>
                                    </div>
                                    <div className="rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                                        {auditAlreadyEnded ? 'Periode Ditutup' : 'Periode Masih Aktif'}
                                    </div>
                                </div>
                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                    <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-gray-700">
                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Lead Auditor</div>
                                        <div className="mt-2 font-semibold text-gray-900">{selectedSchedule.lead_auditor?.name || '-'}</div>
                                        <div className="mt-1 text-xs text-gray-500">Jadwal: {selectedSchedule.lead_auditor_status || 'PENDING'}</div>
                                        <div className="mt-1 text-xs text-gray-500">Akhiri Periode: {selectedSchedule.audit_period_lead_status || 'PENDING'}</div>
                                    </div>
                                    <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-gray-700">
                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Auditor</div>
                                        <div className="mt-2 font-semibold text-gray-900">{selectedSchedule.auditor?.name || '-'}</div>
                                        <div className="mt-1 text-xs text-gray-500">Jadwal: {selectedSchedule.auditor_status || 'PENDING'}</div>
                                        <div className="mt-1 text-xs text-gray-500">Akhiri Periode: {selectedSchedule.audit_period_auditor_status || 'PENDING'}</div>
                                    </div>
                                    <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-gray-700">
                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Penutupan</div>
                                        <div className="mt-2 font-semibold text-gray-900">
                                            {selectedSchedule.audit_period_status === 'ENDED'
                                                ? 'Selesai'
                                                : selectedSchedule.audit_period_status === 'PENDING_END_APPROVAL'
                                                    ? 'Menunggu Persetujuan Auditor Lain'
                                                    : 'Belum Ditutup'}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500">
                                            {selectedSchedule.audit_period_closed_at
                                                ? `Ditutup ${new Date(selectedSchedule.audit_period_closed_at).toLocaleString('id-ID')}`
                                                : 'Menunggu kesimpulan akhir audit'}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className="block space-y-2">
                                        <span className="text-sm font-medium text-gray-900">Kesimpulan Audit</span>
                                        <textarea
                                            value={endAuditConclusion}
                                            onChange={(event) => setEndAuditConclusion(event.target.value)}
                                            rows={4}
                                            readOnly={!canManageAuditPeriod || auditAlreadyEnded}
                                            placeholder="Tuliskan kesimpulan akhir audit sebelum periode ditutup."
                                            className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 read-only:cursor-not-allowed read-only:bg-gray-50"
                                        />
                                    </label>
                                    {selectedSchedule.period_closer?.name && (
                                        <p className="mt-2 text-xs text-gray-500">
                                            Ditutup oleh {selectedSchedule.period_closer.name}
                                        </p>
                                    )}
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleEndAuditPeriod}
                                        disabled={!canManageAuditPeriod || auditAlreadyEnded || endingAuditPeriod || hasCurrentUserApprovedEndPeriod}
                                        className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Icon icon={Icons.check} width={16} />
                                        {endingAuditPeriod ? 'Menyimpan...' : 'Akhiri Periode Audit'}
                                    </button>
                                    {hasCurrentUserApprovedEndPeriod && !auditAlreadyEnded && (
                                        <span className="text-xs text-amber-800">Persetujuan Anda sudah tersimpan. Menunggu auditor lainnya menyetujui penutupan periode.</span>
                                    )}
                                    {otherAuditorEndApprovalStatus === 'PENDING' && selectedSchedule.audit_period_status === 'PENDING_END_APPROVAL' && (
                                        <span className="text-xs text-amber-800">Status saat ini menunggu persetujuan auditor lainnya.</span>
                                    )}
                                    {auditAlreadyEnded && (
                                        <span className="text-xs text-emerald-700">Periode audit ini sudah ditutup.</span>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="mt-4 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => setActiveRequirementTab('DEKAN')}
                                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                    activeRequirementTab === 'DEKAN'
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                PJ Dekan
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveRequirementTab('KAPRODI')}
                                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                    activeRequirementTab === 'KAPRODI'
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                PJ Kaprodi
                            </button>
                        </div>
                    </div>
                    <div className="grid gap-4 border-b border-gray-200 px-6 py-4 md:grid-cols-[260px_minmax(0,1fr)]">
                        <select
                            value={requirementsStandardFilter}
                            onChange={(event) => setRequirementsStandardFilter(event.target.value)}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                        >
                            <option value="ALL">Semua Standar</option>
                            {standardOptions.map((standardName) => (
                                <option key={standardName} value={standardName}>
                                    {standardName}
                                </option>
                            ))}
                        </select>
                        <input
                            type="text"
                            value={requirementsSearch}
                            onChange={(event) => setRequirementsSearch(event.target.value)}
                            placeholder="Filter standar, IKU, IKT, sasaran mutu, indikator, target..."
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">NO.</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Standar Mutu</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">IKU</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">IKT</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Sasaran Mutu</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Indikator</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Target Sasaran</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">PJ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">Memuat daftar kewajiban indikator...</td>
                                    </tr>
                                ) : filteredRequirementRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                                            Belum ada indikator untuk tab {activeRequirementTab === 'DEKAN' ? 'PJ Dekan' : 'PJ Kaprodi'}.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRequirementRows.map((row) => (
                                        <tr key={`${row.standardName}-${row.no}`} className="align-top hover:bg-gray-50">
                                            <td className="px-4 py-4 text-sm text-gray-700">{row.no}</td>
                                            <td className="px-4 py-4 text-sm font-semibold text-gray-900">{row.standardName}</td>
                                            <td className="px-4 py-4 text-sm text-gray-700">{row.iku}</td>
                                            <td className="px-4 py-4 text-sm text-gray-700">{row.ikt}</td>
                                            <td className="px-4 py-4 text-sm leading-6 text-gray-700">{row.sasaranMutu}</td>
                                            <td className="px-4 py-4 text-sm leading-6 text-gray-700">{row.indikator}</td>
                                            <td className="px-4 py-4 text-sm leading-6 text-gray-700">{row.targetSasaran}</td>
                                            <td className="px-4 py-4 text-sm font-medium text-gray-700">{row.pj}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <TablePagination
                        page={requirementsPage}
                        totalPages={requirementTotalPages}
                        totalItems={filteredRequirementRows.length}
                        pageSize={PAGE_SIZE}
                        onPageChange={setRequirementsPage}
                    />
                </section>
            )}

            {isFacultyModalOpen && canCreateFaculty && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4">
                    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Master Data</div>
                                <h2 className="mt-2 text-xl font-semibold text-gray-900">Tambah Fakultas</h2>
                            </div>
                            <button
                                type="button"
                                onClick={closeFacultyModal}
                                className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:border-gray-300 hover:bg-gray-50"
                            >
                                <Icon icon={Icons.close} width={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateFaculty} className="mt-6 space-y-4">
                            <label className="block space-y-2">
                                <span className="text-sm font-medium text-gray-700">Nama Fakultas</span>
                                <input
                                    type="text"
                                    value={facultyForm.name}
                                    onChange={(event) => setFacultyForm((current) => ({ ...current, name: event.target.value }))}
                                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                                    placeholder="Contoh: Fakultas Teknik"
                                />
                            </label>

                            <label className="block space-y-2">
                                <span className="text-sm font-medium text-gray-700">Kode Fakultas</span>
                                <input
                                    type="text"
                                    value={facultyForm.code}
                                    onChange={(event) => setFacultyForm((current) => ({ ...current, code: event.target.value }))}
                                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                                    placeholder="Contoh: FT"
                                />
                            </label>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeFacultyModal}
                                    className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingFaculty}
                                    className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Icon icon={Icons.save} width={16} />
                                    {savingFaculty ? 'Menyimpan...' : 'Simpan Fakultas'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
