import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';
import Icon, { Icons } from '../../components/ui/Icon';

import StandardTargetConfig from './StandardTargetConfig';

// Sub Component to display read-only targets
const NodeTargetViewer = ({ metricId }) => {
    const [targets, setTargets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!metricId) return;
        const fetchTargets = async () => {
            try {
                setLoading(true);
                const [targetRes, levelRes] = await Promise.all([
                    api.get(`/metrics/${metricId}/targets`),
                    api.get(`/education-levels`)
                ]);

                const activeTargets = targetRes.data.data;
                const levels = levelRes.data.data;

                const mapped = activeTargets.map(t => {
                    const l = levels.find(lv => lv.id === t.level_id);
                    return { ...t, level_name: l ? l.name : 'Unknown' };
                });
                setTargets(mapped);
            } catch (err) {
                console.error("Gagal load target untuk viewer:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTargets();
    }, [metricId]);

    if (loading) return <div className="text-sm text-gray-500 py-2 animate-pulse">Memuat target matriks...</div>;

    if (targets.length === 0) {
        return <div className="text-sm text-gray-500 py-2 italic">Belum ada target spesifik untuk jenjang manapun.</div>;
    }

    return (
        <div className="space-y-3">
            {targets.map(t => (
                <div key={t.id} className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 flex justify-between items-center mb-1">
                        <span>{t.level_name}</span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">{t.data_source}</span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                        <div><span className="text-gray-400 dark:text-gray-500 font-medium text-xs uppercase">Target:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{t.target_value}</span> {t.measure_unit}</div>
                        <div><span className="text-gray-400 dark:text-gray-500 font-medium text-xs uppercase">Bukti:</span> {t.evidence_type}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const MetricNode = ({ node, level, onAddChild, onEdit, onDelete, onConfigTarget, onViewNode, isTerbit }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const getIcon = () => {
        if (node.type === 'Header') return Icons.folder;
        if (node.type === 'Statement') return Icons.document;
        return Icons.target;
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
                        <Icon icon={isExpanded ? Icons.expand : Icons.collapse} width={20} />
                    </button>
                ) : (
                    <span className="w-6 inline-block"></span>
                )}

                <div
                    className="flex-1 cursor-pointer group"
                    onClick={() => onViewNode(node)}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <Icon icon={getIcon()} width={20} />
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColor()}`}>
                            {node.type}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">ID: {node.id}</span>
                        <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 hidden sm:inline-block">Lihat Detail →</span>
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {node.content}
                    </div>
                </div>

                {!isTerbit && (
                    <div className="ml-4 flex flex-wrap justify-end gap-2 shrink-0 items-center">
                        {(node.type === 'Header' || node.type === 'Statement') && (
                            <button
                                onClick={() => onAddChild(node)}
                                className="p-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/50 flex items-center gap-1"
                                title="Tambah Sub-Butir"
                            >
                                <Icon icon={Icons.add} width={14} />
                                Tambah
                            </button>
                        )}
                        {node.type === 'Indicator' && (
                            <button
                                onClick={() => onConfigTarget(node)}
                                className="p-1 px-2 font-medium text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 flex items-center gap-1"
                                title="Konfigurasi Target Per Jenjang"
                            >
                                <Icon icon={Icons.target} width={14} />
                                Target Indikator
                            </button>
                        )}
                        <button
                            onClick={() => onEdit(node)}
                            className="p-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-900/50 flex items-center gap-1"
                        >
                            <Icon icon={Icons.edit} width={14} />
                            Edit
                        </button>
                        <button
                            onClick={() => onDelete(node)}
                            className="p-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/50 flex items-center gap-1"
                        >
                            <Icon icon={Icons.delete} width={14} />
                            Hapus
                        </button>
                    </div>
                )}
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
                            onConfigTarget={onConfigTarget}
                            onViewNode={onViewNode}
                            isTerbit={isTerbit}
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
    const [parentNode, setParentNode] = useState(null);
    const [formData, setFormData] = useState({
        standard_id: id,
        parent_id: '',
        content: '',
        type: 'Header',
    });

    // Target Config Modal state
    const [isTargetConfigOpen, setIsTargetConfigOpen] = useState(false);
    const [selectedIndicator, setSelectedIndicator] = useState(null);
    const [selectedIndicatorView, setSelectedIndicatorView] = useState(null);

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
            toast.error('Gagal memuat struktur standar.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleConfigTarget = (node) => {
        setSelectedIndicator(node);
        setIsTargetConfigOpen(true);
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
                toast.success('Node berhasil dihapus.');
                fetchData();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Gagal menghapus node.');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            if (!payload.parent_id) payload.parent_id = null;

            if (editingNode) {
                await api.put(`/metrics/${editingNode.id}`, payload);
                toast.success('Node berhasil diperbarui.');
            } else {
                await api.post('/metrics', payload);
                toast.success('Node baru berhasil ditambahkan.');
            }
            fetchData();
            setIsModalOpen(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan node.');
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
                        className="mb-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                    >
                        <Icon icon={Icons.back} width={18} />
                        Kembali ke Daftar Standar
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Builder: {standard?.name}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Periode: {standard?.periode_tahun} | Kategori: {standard?.category}
                        {['WAITING_APPROVAL', 'TERBIT'].includes(standard?.status) && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 gap-1">
                                <Icon icon={Icons.shield} width={14} />
                                Mode Baca (Terkunci)
                            </span>
                        )}
                    </p>
                </div>
                {!['WAITING_APPROVAL', 'TERBIT'].includes(standard?.status) && (
                    <button
                        onClick={handleAddRoot}
                        className="inline-flex items-center gap-1 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                        <Icon icon={Icons.add} width={18} />
                        Tambah Akar Baru
                    </button>
                )}
            </div>

            <div className={`flex gap-6 items-start transition-all duration-300`}>
                {/* Left Column: Tree Builder */}
                <div className={`transition-all duration-300 ${selectedIndicatorView ? 'w-2/3' : 'w-full'}`}>
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
                                        onConfigTarget={handleConfigTarget}
                                        onViewNode={setSelectedIndicatorView}
                                        isTerbit={['WAITING_APPROVAL', 'TERBIT'].includes(standard?.status)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Node Detail Viewer */}
                {selectedIndicatorView && (
                    <div className="w-1/3 sticky top-6">
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-900 shadow-lg overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/40 border-b border-blue-100 dark:border-blue-800 flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                    <Icon icon={Icons.info} width={18} />
                                    Detail Informasi
                                </h3>
                                <button onClick={() => setSelectedIndicatorView(null)} className="text-blue-400 hover:text-blue-600">
                                    <Icon icon={Icons.close} width={20} />
                                </button>
                            </div>
                            <div className="p-5 overflow-y-auto">
                                <div className="mb-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedIndicatorView.type === 'Header' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                        selectedIndicatorView.type === 'Statement' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' :
                                            'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                        }`}>
                                        {selectedIndicatorView.type}
                                    </span>
                                    <span className="ml-2 text-xs text-gray-500">ID: #{selectedIndicatorView.id}</span>
                                </div>
                                <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap mb-6">
                                    {selectedIndicatorView.content}
                                </div>

                                {selectedIndicatorView.type === 'Indicator' && (
                                    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Target Jenjang</h4>
                                            <button
                                                onClick={() => handleConfigTarget(selectedIndicatorView)}
                                                className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded flex items-center gap-1"
                                            >
                                                <Icon icon={Icons.edit} width={12} />
                                                Edit Target
                                            </button>
                                        </div>
                                        <NodeTargetViewer metricId={selectedIndicatorView.id} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Form Modal (Add/Edit Nodes) */}
            {isModalOpen && (
                <div className="fixed z-[60] inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                        <div className="relative z-[60] inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
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

            {/* Target Configuration Modal */}
            <StandardTargetConfig
                metric={selectedIndicator}
                isOpen={isTargetConfigOpen}
                onClose={() => setIsTargetConfigOpen(false)}
                isTerbit={['WAITING_APPROVAL', 'TERBIT'].includes(standard?.status)}
            />
        </div>
    );
}
