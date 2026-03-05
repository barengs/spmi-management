import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiPlus, FiUsers, FiEdit2, FiTrash2, FiFileText } from 'react-icons/fi';
import api from '../../../services/api';

export default function AuditorPlotting() {
    const { id: periodId } = useParams();
    const navigate = useNavigate();

    const [period, setPeriod] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);

    const [units, setUnits] = useState([]);
    const [auditors, setAuditors] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, unit_id: '', auditor_ids: [], status: 'SCHEDULED', scheduled_date: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, [periodId]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            // Fetch period details
            const periodRes = await api.get(`/audit/periods/${periodId}`);
            setPeriod(periodRes.data.data);

            // Fetch schedules mapping for this period
            await fetchSchedules();

            // Fetch all Flat Units for Dropdown
            const unitsRes = await api.get('/units/flat');
            // Hanya aktifkan unit level Prodi/Fakultas (department/faculty)
            setUnits(unitsRes.data.data.filter(u => u.level === 'department' || u.level === 'faculty'));

            // Fetch list users with role Auditor
            const usersRes = await api.get('/users?role=Auditor');
            const extractedAuditors = Array.isArray(usersRes.data?.data?.data)
                ? usersRes.data.data.data
                : (Array.isArray(usersRes.data?.data) ? usersRes.data.data : []);
            setAuditors(extractedAuditors);

        } catch (error) {
            toast.error('Gagal memuat data persiapan plotting.');
        } finally {
            setLoading(false);
        }
    };

    const fetchSchedules = async () => {
        const schedRes = await api.get(`/audit/schedules?audit_period_id=${periodId}`);
        setSchedules(schedRes.data.data);
    };

    const handleOpenModal = (schedule = null) => {
        if (schedule) {
            setFormData({
                id: schedule.id,
                unit_id: schedule.unit_id,
                auditor_ids: schedule.auditors.map(a => a.id),
                status: schedule.status,
                scheduled_date: schedule.scheduled_date || ''
            });
        } else {
            setFormData({ id: null, unit_id: '', auditor_ids: [], status: 'SCHEDULED', scheduled_date: '' });
        }
        setIsModalOpen(true);
    };

    const handleAuditorSelection = (e) => {
        const value = Array.from(e.target.selectedOptions, option => parseInt(option.value));
        setFormData({ ...formData, auditor_ids: value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (formData.auditor_ids.length === 0) {
            toast.warning('Pilih minimal 1 orang auditor!');
            return;
        }

        try {
            setSaving(true);

            if (formData.id) {
                // Update Schedule (Status, Date & Auditors)
                await api.put(`/ audit / schedules / ${formData.id} `, {
                    status: formData.status,
                    scheduled_date: formData.scheduled_date || null,
                    auditor_ids: formData.auditor_ids
                });
                toast.success('Pembaruan jadwal & plotting auditor berhasil.');
            } else {
                // Create Schedule Plotting
                await api.post('/audit/schedules', {
                    audit_period_id: periodId,
                    unit_id: formData.unit_id,
                    status: formData.status,
                    scheduled_date: formData.scheduled_date || null,
                    auditor_ids: formData.auditor_ids
                });
                toast.success('Prodi berhasil diplot dengan asesor terkait.');
            }

            setIsModalOpen(false);
            fetchSchedules();
        } catch (error) {
            // Tangkap Constraint atau COI Exception dari Controller
            console.log(error.response);
            if (error.response?.data?.errors) {
                const msgs = Object.values(error.response.data.errors).flat().join('\n');
                toast.error(msgs);
            } else {
                toast.error(error.response?.data?.message || 'Gagal merancang plotting audit.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Hapus plotting jadwal ini?')) return;
        try {
            await api.delete(`/ audit / schedules / ${id} `);
            toast.success('Jadwal plotting dihapus.');
            fetchSchedules();
        } catch (error) {
            toast.error('Gagal menghapus plotting.');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <div className="flex items-center space-x-4">
                <Link to="/audit/periods" className="p-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors">
                    <FiArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plotting Jadwal Auditor</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Periode: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{period?.name}</span>
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mt-6">
                <div className="px-4 py-4 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Daftar Penugasan Audit</h3>
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                    >
                        <FiPlus className="-ml-1 mr-2 h-4 w-4" /> Tambah Jadwal & Asesor
                    </button>
                </div>

                {schedules.length === 0 ? (
                    <div className="text-center py-12">
                        <FiUsers className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Belum Ada Plotting</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Anda belum menugaskan Auditor manapun ke Prodi (Unit Kerja).</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800/80">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Unit Direview (Auditee)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Tim Auditor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Status</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                {schedules.map((schedule) => (
                                    <tr key={schedule.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">{schedule.unit?.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">Tgl: {schedule.scheduled_date || 'TBD'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col space-y-1">
                                                {schedule.auditors.map((auditor, i) => (
                                                    <span key={auditor.id} className={`inline - flex items - center px - 2 py - 0.5 rounded text - xs font - medium ${auditor.pivot.is_lead ? 'bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-700 dark:text-gray-300'} `}>
                                                        {auditor.name} {auditor.pivot.is_lead ? '(Lead)' : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                {schedule.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <Link
                                                to={`/audit/${schedule.id}/working-paper`}
                                                className="inline-flex items-center text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300 mr-4 font-bold"
                                                title="Buka Kertas Kerja Audit"
                                            >
                                                <FiFileText className="mr-1 h-4 w-4" /> Kertas Kerja
                                            </Link>
                                            <button onClick={() => handleOpenModal(schedule)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4">
                                                Edit
                                            </button>
                                            <button onClick={() => handleDelete(schedule.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                                                Hapus
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Formulir Plotting */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-500/75 dark:bg-gray-900/80 p-4 transition-opacity" onClick={() => setIsModalOpen(false)}>
                        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl border border-gray-200 dark:border-gray-700 transform transition-all" onClick={(e) => e.stopPropagation()}>
                            <form onSubmit={handleSave}>
                                <div className="px-6 pt-6 pb-4">
                                    <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white border-b pb-2 mb-4 border-gray-200 dark:border-gray-700">
                                        {formData.id ? 'Perbarui Jadwal & Tim Asesor' : 'Assign Asesor ke Auditee (Prodi)'}
                                    </h3>
                                    <div className="space-y-4">
                                        {/* Jika update, unit_id sebaiknya disabled atau biarkan read-only buat aman */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pilih Unit (Auditee)</label>
                                            <select
                                                required disabled={formData.id !== null}
                                                value={formData.unit_id} onChange={e => setFormData({ ...formData, unit_id: e.target.value })}
                                                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
                                            >
                                                <option value="" disabled>-- Pilih Prodi --</option>
                                                {units.map(u => (
                                                    <option key={u.id} value={u.id}>{u.name} (Tingkat {u.level})</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Visitasi/Audit (Opsional)</label>
                                            <input
                                                type="date"
                                                value={formData.scheduled_date} onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })}
                                                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                        </div>

                                        {formData.id && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status Progres</label>
                                                <select
                                                    value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                                                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                >
                                                    <option value="SCHEDULED">SCHEDULED (Terjadwal)</option>
                                                    <option value="IN_PROGRESS">IN_PROGRESS (Berlangsung)</option>
                                                    <option value="DESK_EVALUATION">DESK_EVALUATION (Audit Dokumen)</option>
                                                    <option value="FIELD_EVALUATION">FIELD_EVALUATION (Audit Lapangan)</option>
                                                    <option value="COMPLETED">COMPLETED (Selesai Evaluasi)</option>
                                                </select>
                                            </div>
                                        )}

                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded border border-indigo-100 dark:border-indigo-800">
                                            <label className="block text-sm font-medium text-indigo-800 dark:text-indigo-300 mb-2">
                                                Penunjukan Tim Auditor (Bisa Lebih Dari 1)
                                            </label>
                                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-3 block">
                                                * Tahan tombol CTRL / CMD sambil klik untuk memilih multpel asesor. Orang pertama yang dipilih akan diset sebagai *Lead Auditor*.
                                            </p>
                                            <select
                                                multiple required size={6}
                                                value={formData.auditor_ids}
                                                onChange={handleAuditorSelection}
                                                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2"
                                            >
                                                {auditors.map(a => (
                                                    <option key={a.id} value={a.id} className="py-1">{a.name} ({a.unit?.name || 'Unit Eksternal'})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
                                    <button type="submit" disabled={saving} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm" >
                                        {saving ? 'Loading...' : 'Simpan Plotting'}
                                    </button>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" >
                                        Batal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
