import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiLayers } from 'react-icons/fi';
import api from '../../../services/api';

export default function UnitIndex() {
    const [units, setUnits] = useState([]);
    const [flatUnits, setFlatUnits] = useState([]); // For parent dropdown
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const initialFormState = {
        id: null,
        parent_id: '',
        name: '',
        code: '',
        level: 'faculty', // default
        is_active: true
    };
    const [formData, setFormData] = useState(initialFormState);

    const levels = [
        { value: 'university', label: 'Universitas' },
        { value: 'faculty', label: 'Fakultas' },
        { value: 'department', label: 'Program Studi' },
        { value: 'bureau', label: 'Biro / Lembaga' }
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [treeRes, flatRes] = await Promise.all([
                api.get('/units'),
                api.get('/units/flat')
            ]);
            setUnits(treeRes.data.data);
            setFlatUnits(flatRes.data.data);
        } catch (error) {
            toast.error('Gagal memuat data unit kerja');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (unit = null) => {
        if (unit) {
            setFormData({
                id: unit.id,
                parent_id: unit.parent_id || '',
                name: unit.name,
                code: unit.code || '',
                level: unit.level,
                is_active: unit.is_active
            });
        } else {
            setFormData(initialFormState);
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            const payload = {
                ...formData,
                parent_id: formData.parent_id ? parseInt(formData.parent_id) : null
            };

            if (formData.id) {
                await api.put(`/units/${formData.id}`, payload);
                toast.success('Data unit berhasil diperbarui');
            } else {
                await api.post('/units', payload);
                toast.success('Unit baru berhasil ditambahkan');
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Gagal menyimpan data unit');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Yakin ingin menghapus unit ini?')) return;
        try {
            await api.delete(`/units/${id}`);
            toast.success('Unit berhasil dihapus');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal menghapus unit');
        }
    };

    // Recursive component to render tree nodes nicely
    const renderNode = (node, depth = 0) => {
        const hasChildren = node.all_children && node.all_children.length > 0;
        return (
            <React.Fragment key={node.id}>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center" style={{ paddingLeft: `${depth * 2}rem` }}>
                            <div className="flex-shrink-0 h-6 w-6 text-indigo-500 mr-2">
                                {depth === 0 ? <FiLayers className="h-5 w-5" /> : <div className="border-l-2 border-b-2 border-gray-300 dark:border-gray-600 h-4 w-4 rounded-bl" />}
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {node.name}
                                </div>
                                {node.code && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Kode: {node.code}</div>
                                )}
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 capitalize">
                            {node.level === 'department' ? 'Program Studi' : node.level === 'faculty' ? 'Fakultas' : node.level === 'university' ? 'Universitas' : 'Biro/Lembaga'}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${node.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                            {node.is_active ? 'Aktif' : 'NonAktif'}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleOpenModal(node)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3" title="Edit Unit">
                            <FiEdit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(node.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Hapus Unit">
                            <FiTrash2 className="h-4 w-4" />
                        </button>
                    </td>
                </tr>
                {hasChildren && node.all_children.map((child) => renderNode(child, depth + 1))}
            </React.Fragment>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Master Data: Unit Kerja</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Manajemen struktur organisasi Fakultas, Program Studi, Biro, dan Lembaga.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                    >
                        <FiPlus className="-ml-1 mr-2 h-4 w-4" /> Tambah Unit
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-left">
                {units.length === 0 ? (
                    <div className="text-center py-12">
                        <FiLayers className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Belum Ada Data Unit</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Silakan tambahkan unit universitas atau fakultas pertama Anda.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800/80">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Nama Organisasi / Unit Kerja</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Tingkat</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                {units.map(unit => renderNode(unit))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Tambah/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-500/75 dark:bg-gray-900/80 p-4 transition-opacity" onClick={() => setIsModalOpen(false)}>
                    <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-700 transform transition-all" onClick={(e) => e.stopPropagation()}>
                        <form onSubmit={handleSave}>
                            <div className="px-6 pt-6 pb-4">
                                <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white border-b pb-2 mb-4 border-gray-200 dark:border-gray-700">
                                    {formData.id ? 'Edit Unit Kerja' : 'Tambah Unit Baru'}
                                </h3>
                                <div className="space-y-4 text-left">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Induk Organisasi (Parent)</label>
                                        <select
                                            value={formData.parent_id} onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
                                            className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        >
                                            <option value="">-- Tidak Ada Induk (Root/Univ) --</option>
                                            {flatUnits.map(u => (
                                                <option key={u.id} value={u.id} disabled={formData.id === u.id}>
                                                    {u.name} ({u.level})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nama Unit</label>
                                        <input
                                            type="text" required
                                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            placeholder="Cth: Fakultas Teknik"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tingkat Struktur</label>
                                            <select
                                                required value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })}
                                                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            >
                                                {levels.map(l => (
                                                    <option key={l.value} value={l.value}>{l.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kode PDDikti (Opt)</label>
                                            <input
                                                type="text"
                                                value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })}
                                                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                placeholder="Cth: 55201"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center mt-4">
                                        <input
                                            id="is_active" type="checkbox"
                                            checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                            Status Unit Aktif
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
                                <button type="submit" disabled={saving} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm" >
                                    {saving ? 'Loading...' : 'Simpan Unit'}
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
