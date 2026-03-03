import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';

const MetricNode = ({ node, level, onAddChild, onEdit, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const getIcon = () => {
        if (node.type === 'Header') return '📁';
        if (node.type === 'Statement') return '📄';
        return '🎯'; // Indicator
    };

    const getTypeColor = () => {
        if (node.type === 'Header') return 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30';
        if (node.type === 'Statement') return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30';
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30';
    };

    return (
        <div className="mb-2">
            <div
                className={`flex items-start p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors bg-white dark:bg-gray-800 shadow-sm`}
                style={{ marginLeft: `${level * 2}rem` }}
            >
                {node.children_recursive && node.children_recursive.length > 0 ? (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="mr-2 mt-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        {isExpanded ? '▼' : '▶'}
                    </button>
                ) : (
                    <span className="w-6 inline-block"></span>
                )}

                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getIcon()}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColor()}`}>
                            {node.type}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">ID: {node.id}</span>
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {node.content}
                    </div>
                </div>

                <div className="ml-4 flex items-center space-x-2 opacity-100 sm:opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {(node.type === 'Header' || node.type === 'Statement') && (
                        <button
                            onClick={() => onAddChild(node)}
                            className="p-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/50"
                            title="Tambah Sub-Butir"
                        >
                            +Tambah
                        </button>
                    )}
                    <button
                        onClick={() => onEdit(node)}
                        className="p-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-900/50"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => onDelete(node)}
                        className="p-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/50"
                    >
                        Hapus
                    </button>
                </div>
            </div>

            {isExpanded && node.children_recursive && node.children_recursive.length > 0 && (
                <div className="mt-2">
                    {node.children_recursive.map(child => (
                        <MetricNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            onAddChild={onAddChild}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function StandardBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [standard, setStandard] = useState(null);
    const [tree, setTree] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNode, setEditingNode] = useState(null);
    const [parentNode, setParentNode] = useState(null); // Node yang sedang ditambahi child
    const [formData, setFormData] = useState({
        standard_id: id,
        parent_id: '',
        content: '',
        type: 'Header',
    });

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [stdRes, treeRes] = await Promise.all([
                api.get(`/standards/${id}`),
                api.get(`/standards/${id}/metrics/tree`)
            ]);
            setStandard(stdRes.data.data);
            setTree(treeRes.data.data);
        } catch (err) {
            alert('Gagal memuat struktur standar.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRoot = () => {
        setEditingNode(null);
        setParentNode(null);
        setFormData({
            standard_id: id,
            parent_id: '',
            content: '',
            type: 'Header',
        });
        setIsModalOpen(true);
    };

    const handleAddChild = (parent) => {
        setEditingNode(null);
        setParentNode(parent);

        // Auto default next type based on parent logic mapping hierarchy 
        let nextType = 'Statement';
        if (parent.type === 'Header') nextType = 'Header';
        if (parent.type === 'Statement') nextType = 'Indicator';

        setFormData({
            standard_id: id,
            parent_id: parent.id,
            content: '',
            type: nextType,
        });
        setIsModalOpen(true);
    };

    const handleEdit = (node) => {
        setEditingNode(node);
        setParentNode(null);
        setFormData({
            standard_id: id,
            parent_id: node.parent_id || '',
            content: node.content,
            type: node.type,
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (node) => {
        if (window.confirm(`Hapus node "${node.content.substring(0, 30)}..."?\nPeringatan: Menghapus ini akan memusnahkan SEMUA data di bawah hirarkinya!`)) {
            try {
                await api.delete(`/metrics/${node.id}`);
                fetchData();
            } catch (err) {
                alert(err.response?.data?.message || 'Gagal menghapus node.');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            if (!payload.parent_id) payload.parent_id = null; // nullify empty string

            if (editingNode) {
                await api.put(`/metrics/${editingNode.id}`, payload);
            } else {
                await api.post('/metrics', payload);
            }
            fetchData();
            setIsModalOpen(false);
        } catch (err) {
            alert(err.response?.data?.message || 'Gagal menyimpan node.');
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Memuat struktur standar...</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <button
                        onClick={() => navigate('/standards')}
                        className="mb-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                    >
                        ← Kembali ke Daftar Standar
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Builder: {standard?.name}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Periode: {standard?.periode_tahun} | Kategori: {standard?.category}
                    </p>
                </div>
                <button
                    onClick={handleAddRoot}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                    + Tambah Akar Baru
                </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 min-h-[500px]">
                {tree.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">Belum ada struktur hirarki di standar ini.</p>
                        <button
                            onClick={handleAddRoot}
                            className="text-blue-600 font-medium hover:underline"
                        >
                            Mulai susun standar baru
                        </button>
                    </div>
                ) : (
                    <div>
                        {tree.map(node => (
                            <MetricNode
                                key={node.id}
                                node={node}
                                level={0}
                                onAddChild={handleAddChild}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                                {editingNode ? 'Edit Node' : parentNode ? `Tambah Sub-Butir untuk ID #${parentNode.id}` : 'Tambah Akar Utama'}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipe Komponen</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="Header">Header (Folder/Kategori)</option>
                                        <option value="Statement">Statement (Pernyataan Kinerja)</option>
                                        <option value="Indicator">Indicator (Tolak Ukur Target)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Isi (Konten)</label>
                                    <textarea
                                        required
                                        rows="4"
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"
                                        placeholder="Masukkan isi uraian di sini..."
                                    ></textarea>
                                </div>
                                <div className="mt-5 sm:mt-6 flex space-x-3">
                                    <button
                                        type="submit"
                                        className="flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                                    >
                                        Simpan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                                    >
                                        Batal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
