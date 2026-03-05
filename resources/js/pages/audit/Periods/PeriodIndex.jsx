import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiCalendar, FiCheckCircle, FiClock, FiSettings } from 'react-icons/fi';
import api from '../../../services/api';
import { useNavigate } from 'react-router-dom';

export default function PeriodIndex() {
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, name: '', start_date: '', end_date: '', status: 'PLANNED' });
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    const fetchPeriods = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/audit/periods');
            setPeriods(data.data);
        } catch (error) {
            toast.error('Gagal memuat data periode audit.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPeriods();
    }, []);

    const handleOpenModal = (period = null) => {
        if (period) {
            setFormData({
                id: period.id,
                name: period.name,
                start_date: period.start_date,
                end_date: period.end_date,
                status: period.status
            });
        } else {
            setFormData({ id: null, name: '', start_date: '', end_date: '', status: 'PLANNED' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            const payload = { ...formData };

            if (payload.id) {
                await api.put(`/audit/periods/${payload.id}`, payload);
                toast.success('Periode Audit berhasil diperbarui.');
            } else {
                await api.post('/audit/periods', payload);
                toast.success('Periode Audit berhasil dibuat.');
            }

            setIsModalOpen(false);
            fetchPeriods();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal menyimpan periode audit.');
        } finally {
            setSaving(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PLANNED':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"><FiCalendar className="mr-1" /> Terjadwal</span>;
            case 'ONGOING':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"><FiClock className="mr-1" /> Berlangsung</span>;
            case 'COMPLETED':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"><FiCheckCircle className="mr-1" /> Selesai</span>;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Siklus Audit Mutu Internal</h1>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        Kelola periode pelaksanaan Audit Mutu Internal (AMI) dan tetapkan jadwal evaluasi untuk setiap periode.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 flex space-x-3">
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                    >
                        <FiPlus className="-ml-1 mr-2 h-4 w-4" />
                        Buka Periode Baru
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {periods.length === 0 ? (
                    <div className="text-center py-12">
                        <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Belum Ada Siklus AMI</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Silakan buka siklus audit mutu baru.</p>
                    </div>
                ) : (
                    <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
                        {periods.map((period) => (
                            <li key={period.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400 truncate">
                                                {period.name}
                                            </p>
                                            {getStatusBadge(period.status)}
                                        </div>
                                        <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-6">
                                            <div>
                                                <span className="font-medium text-gray-700 dark:text-gray-300">Mulai:</span> {period.start_date}
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-700 dark:text-gray-300">Berakhir:</span> {period.end_date}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ml-4 flex-shrink-0 flex items-center space-x-3">
                                        <button
                                            onClick={() => handleOpenModal(period)}
                                            className="px-3 py-1.5 flex items-center text-sm font-medium border border-gray-300 rounded shadow-sm bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                                            title="Edit Siklus"
                                        >
                                            <FiEdit2 className="h-4 w-4 sm:mr-2" />
                                            <span className="hidden sm:inline">Edit</span>
                                        </button>
                                        <button
                                            onClick={() => navigate(`/audit/${period.id}/plotting`)}
                                            className="px-3 py-1.5 flex items-center text-sm font-medium border border-transparent rounded shadow-sm bg-indigo-600 text-white hover:bg-indigo-700"
                                            title="Atur Plotting / Asesor"
                                        >
                                            <FiSettings className="h-4 w-4 sm:mr-2" />
                                            <span className="hidden sm:inline">Plotting Audit</span>
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-500/75 dark:bg-gray-900/80 p-4 transition-opacity" onClick={() => setIsModalOpen(false)}>
                    <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-700 transform transition-all" onClick={(e) => e.stopPropagation()}>
                        <form onSubmit={handleSave}>
                            <div className="px-6 pt-6 pb-4">
                                <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white mb-4">
                                    {formData.id ? 'Edit Periode AMI' : 'Buka Periode AMI Baru'}
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nama Periode</label>
                                        <input
                                            type="text" required
                                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            placeholder="Contoh: AMI Siklus 2025 Genap"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal Mulai</label>
                                            <input
                                                type="date" required
                                                value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                                className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal Berakhir</label>
                                            <input
                                                type="date" required
                                                value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                                className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status Siklus</label>
                                        <select
                                            required value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                            className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        >
                                            <option value="PLANNED">Direncanakan (PLANNED)</option>
                                            <option value="ONGOING">Sedang Berlangsung (ONGOING)</option>
                                            <option value="COMPLETED">Selesai (COMPLETED)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                                <button type="submit" disabled={saving} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm" >
                                    {saving ? 'Menyimpan...' : 'Simpan Siklus'}
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" >
                                    Batal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
