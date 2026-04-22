import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { toast } from 'react-toastify';
import Icon, { Icons } from '../../components/ui/Icon';


const getNodeTypeLabel = (type) => {
    if (type === 'Header') return 'Bab';
    if (type === 'Statement') return 'Pasal';
    return 'Indicator';
};

const getNextChildType = (parentType) => {
    if (parentType === 'Header') return 'Statement';
    if (parentType === 'Statement') return 'Indicator';
    return null;
};

const getAddChildLabel = (nodeType) => {
    if (nodeType === 'Header') return 'Tambah Pasal';
    if (nodeType === 'Statement') return 'Tambah Indicator';
    return 'Tambah';
};

function insertNodeIntoTree(nodes, newNode) {
    if (!newNode.parent_id) {
        return [...nodes, { ...newNode, children_recursive: [] }];
    }

    return nodes.map((node) => {
        if (node.id === newNode.parent_id) {
            const nextChildren = [...(node.children_recursive || []), { ...newNode, children_recursive: [] }]
                .sort((left, right) => (left.order || 0) - (right.order || 0));

            return {
                ...node,
                children_recursive: nextChildren,
            };
        }

        if (node.children_recursive?.length) {
            return {
                ...node,
                children_recursive: insertNodeIntoTree(node.children_recursive, newNode),
            };
        }

        return node;
    });
}

function updateNodeInTree(nodes, updatedNode) {
    return nodes.map((node) => {
        if (node.id === updatedNode.id) {
            return {
                ...node,
                ...updatedNode,
                children_recursive: node.children_recursive || [],
            };
        }

        if (node.children_recursive?.length) {
            return {
                ...node,
                children_recursive: updateNodeInTree(node.children_recursive, updatedNode),
            };
        }

        return node;
    });
}

function removeNodeFromTree(nodes, nodeId) {
    return nodes
        .filter((node) => node.id !== nodeId)
        .map((node) => ({
            ...node,
            children_recursive: node.children_recursive?.length
                ? removeNodeFromTree(node.children_recursive, nodeId)
                : [],
        }));
}

function highlightText(text, query) {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
        return text;
    }

    const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = String(text).split(new RegExp(`(${escapedQuery})`, 'ig'));

    return parts.map((part, index) => {
        if (part.toLowerCase() === normalizedQuery.toLowerCase()) {
            return (
                <mark
                    key={`${part}-${index}`}
                    className="rounded bg-amber-200 px-1 text-gray-900"
                >
                    {part}
                </mark>
            );
        }

        return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
    });
}

// Sub Component to display read-only targets
const IndicatorTimeline = ({ metricId }) => {
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!metricId) {
            return;
        }

        const fetchTimeline = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/metrics/${metricId}/timeline`);
                setTimeline(response.data.data || []);
            } catch (error) {
                setTimeline([]);
            } finally {
                setLoading(false);
            }
        };

        fetchTimeline();
    }, [metricId]);

    const getActionLabel = (action) => {
        if (action === 'POST') return 'Indikator dibuat';
        if (action === 'PUT') return 'Indikator diperbarui';
        if (action === 'DELETE') return 'Indikator dihapus';
        if (action === 'REVIEW') return 'Review indikator';
        if (action === 'TGT_SYNC') return 'Target indikator diperbarui';
        return action;
    };

    if (loading) {
        return <div className="text-sm text-gray-500 py-2 animate-pulse">Memuat timeline indikator...</div>;
    }

    if (timeline.length === 0) {
        return <div className="text-sm text-gray-500 py-2 italic">Belum ada riwayat indikator.</div>;
    }

    return (
        <div className="space-y-3">
            {timeline.map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold text-gray-900">{getActionLabel(item.action)}</div>
                            <div className="mt-1 text-xs text-gray-500">
                                {item.user?.name || 'Sistem'} • {new Date(item.created_at).toLocaleString('id-ID')}
                            </div>
                        </div>
                        <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-600">
                            {item.action}
                        </span>
                    </div>
                    {item.new_data && (
                        <div className="mt-3 text-xs leading-5 text-gray-600">
                            {item.new_data.content && <div>Konten: {item.new_data.content}</div>}
                            {Object.prototype.hasOwnProperty.call(item.new_data, 'iku') && <div>IKU: {item.new_data.iku || '-'}</div>}
                            {Object.prototype.hasOwnProperty.call(item.new_data, 'ikt') && <div>IKT: {item.new_data.ikt || '-'}</div>}
                            {item.new_data.review_status && <div>Status review: {item.new_data.review_status}</div>}
                            {item.new_data.targets && <div>Jumlah target aktif: {item.new_data.targets.length}</div>}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

const MetricNode = ({
    node,
    level,
    onAddChild,
    onEdit,
    onDelete,
    onViewNode,
    isTerbit,
    expandedIds,
    onToggleExpand,
    activeNodeId,
    registerNodeRef,
    searchQuery,
}) => {
    const isExpanded = expandedIds.has(node.id);
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
                ref={(element) => registerNodeRef(node.id, element)}
                className={`flex items-start rounded-lg border p-3 shadow-sm transition-colors ${
                    activeNodeId === node.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 dark:border-blue-400 dark:bg-blue-900/30 dark:ring-blue-900'
                        : 'border-gray-200 bg-white hover:border-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500'
                }`}
                style={{ marginLeft: `${level * 2}rem` }}
            >
                {node.children_recursive && node.children_recursive.length > 0 ? (
                    <button
                        onClick={() => onToggleExpand(node.id)}
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
                            {getNodeTypeLabel(node.type)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">ID: {node.id}</span>
                        <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 hidden sm:inline-block">Lihat Detail →</span>
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {highlightText(node.content, searchQuery)}
                    </div>
                    {node.type === 'Indicator' && (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 font-semibold text-sky-700">
                                IKU: {node.iku || '-'}
                            </span>
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">
                                IKT: {node.ikt || '-'}
                            </span>
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                                PJ: {node.pj || '-'}
                            </span>
                        </div>
                    )}
                </div>

                {!isTerbit && (
                    <div className="ml-4 flex flex-wrap justify-end gap-2 shrink-0 items-center">
                        {(node.type === 'Header' || node.type === 'Statement') && (
                            <button
                                onClick={() => onAddChild(node)}
                                className="p-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/50 flex items-center gap-1"
                                title={getAddChildLabel(node.type)}
                            >
                                <Icon icon={Icons.add} width={14} />
                                {getAddChildLabel(node.type)}
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
                            onViewNode={onViewNode}
                            isTerbit={isTerbit}
                            expandedIds={expandedIds}
                            onToggleExpand={onToggleExpand}
                            activeNodeId={activeNodeId}
                            registerNodeRef={registerNodeRef}
                            searchQuery={searchQuery}
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
    const user = useSelector((state) => state.auth.user);
    const roles = user?.roles || [];
    const hasRole = (roleName) => roles.some((role) => (typeof role === 'string' ? role === roleName : role?.name === roleName));
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
        iku: '',
        ikt: '',
        pj: '',
        type: 'Header',
    });

    const [selectedIndicatorView, setSelectedIndicatorView] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedIds, setExpandedIds] = useState(new Set());
    const nodeRefs = useRef({});
    const canManageStructure = hasRole('SuperAdmin')
        || user?.permissions?.includes('standard.update')
        || user?.permissions?.includes('standard.delete');

    const statementWarnings = [];
    const flatNodes = [];
    const parentMap = {};
    const expandableIds = [];

    const collectNodeMetadata = (nodes, parentId = null) => {
        nodes.forEach((node) => {
            flatNodes.push(node);
            parentMap[node.id] = parentId;

            if (node.children_recursive?.length) {
                expandableIds.push(node.id);
            }

            if (node.type === 'Statement') {
                const directIndicators = (node.children_recursive || []).filter((child) => child.type === 'Indicator');
                if (directIndicators.length === 0) {
                    statementWarnings.push(node);
                }
            }

            if (node.children_recursive?.length) {
                collectNodeMetadata(node.children_recursive, node.id);
            }
        });
    };

    collectNodeMetadata(tree);

    const searchResults = searchQuery.trim()
        ? flatNodes
            .filter((node) => {
                const haystack = `${node.content} ${node.type} ${node.id}`.toLowerCase();
                return haystack.includes(searchQuery.trim().toLowerCase());
            })
            .slice(0, 8)
        : [];

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async (showLoader = true) => {
        try {
            if (showLoader) {
                setLoading(true);
            }
            const [stdRes, treeRes] = await Promise.all([
                api.get(`/standards/${id}`),
                api.get(`/standards/${id}/metrics/tree`)
            ]);
            setStandard(stdRes.data.data);
            setTree(treeRes.data.data);
            setSelectedIndicatorView(null);
            setExpandedIds(new Set(
                (function collectExpandable(nodes, carry = []) {
                    nodes.forEach((node) => {
                        if (node.children_recursive?.length) {
                            carry.push(node.id);
                            collectExpandable(node.children_recursive, carry);
                        }
                    });
                    return carry;
                })(treeRes.data.data)
            ));
        } catch (err) {
            toast.error('Gagal memuat struktur standar.');
            console.error(err);
        } finally {
            if (showLoader) {
                setLoading(false);
            }
        }
    };

    const toggleExpand = (nodeId) => {
        setExpandedIds((current) => {
            const next = new Set(current);

            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }

            return next;
        });
    };

    const registerNodeRef = (nodeId, element) => {
        if (element) {
            nodeRefs.current[nodeId] = element;
        } else {
            delete nodeRefs.current[nodeId];
        }
    };

    const focusNode = (node) => {
        const branchIds = [];
        let cursor = node.id;

        while (cursor) {
            branchIds.push(cursor);
            cursor = parentMap[cursor];
        }

        setExpandedIds((current) => {
            const next = new Set(current);
            branchIds.forEach((id) => next.add(id));
            return next;
        });
        setSelectedIndicatorView(node);

        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                nodeRefs.current[node.id]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            });
        });
    };

    const handleAddRoot = () => {
        setEditingNode(null);
        setParentNode(null);
        setFormData({
            standard_id: id,
            parent_id: '',
            content: '',
            iku: '',
            ikt: '',
            pj: '',
            type: 'Header',
        });
        setIsModalOpen(true);
    };

    const handleAddChild = (parent) => {
        setEditingNode(null);
        setParentNode(parent);

        const nextType = getNextChildType(parent.type);

        if (!nextType) {
            toast.error('Indicator tidak dapat memiliki child node.');
            return;
        }

        setFormData({
            standard_id: id,
            parent_id: parent.id,
            content: '',
            iku: '',
            ikt: '',
            pj: nextType === 'Indicator' ? 'Kaprodi' : '',
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
            iku: node.iku || '',
            ikt: node.ikt || '',
            pj: node.pj || '',
            type: node.type,
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (node) => {
        if (window.confirm(`Hapus node "${node.content.substring(0, 30)}..."?\nPeringatan: Menghapus ini akan memusnahkan SEMUA data di bawah hirarkinya!`)) {
            try {
                await api.delete(`/metrics/${node.id}`);
                setTree((current) => removeNodeFromTree(current, node.id));
                setSelectedIndicatorView((current) => (current?.id === node.id ? null : current));
                toast.success('Node berhasil dihapus.');
                fetchData(false);
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
            if (payload.type !== 'Indicator') {
                payload.iku = null;
                payload.ikt = null;
                payload.pj = null;
            }

            if (editingNode) {
                const response = await api.put(`/metrics/${editingNode.id}`, payload);
                const updatedNode = response.data.data;
                setTree((current) => updateNodeInTree(current, updatedNode));
                setSelectedIndicatorView((current) => (current?.id === updatedNode.id ? { ...current, ...updatedNode } : current));
                toast.success('Node berhasil diperbarui.');
            } else {
                const response = await api.post('/metrics', payload);
                const createdNode = response.data.data;
                setTree((current) => insertNodeIntoTree(current, createdNode));
                setExpandedIds((current) => {
                    const next = new Set(current);
                    if (createdNode.parent_id) {
                        next.add(createdNode.parent_id);
                    }
                    return next;
                });
                toast.success('Node baru berhasil ditambahkan.');
            }
            setIsModalOpen(false);
            setEditingNode(null);
            setParentNode(null);
            fetchData(false);
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
                        {(!canManageStructure || ['WAITING_APPROVAL', 'TERBIT'].includes(standard?.status)) && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 gap-1">
                                <Icon icon={Icons.shield} width={14} />
                                Mode Baca (Terkunci)
                            </span>
                        )}
                    </p>
                </div>
                {canManageStructure && !['WAITING_APPROVAL', 'TERBIT'].includes(standard?.status) && (
                    <button
                        onClick={handleAddRoot}
                        className="inline-flex items-center gap-1 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                        <Icon icon={Icons.add} width={18} />
                        Tambah Bab
                    </button>
                )}
            </div>

            <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Pencarian Struktur
                </label>
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Icon icon={Icons.search} width={16} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Cari isi node, tipe, atau ID seperti Algolia..."
                        className="w-full rounded-2xl border border-gray-300 py-2.5 pl-10 pr-12 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                        >
                            <Icon icon={Icons.close} width={16} />
                        </button>
                    )}
                </div>
                {searchQuery && (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                        {searchResults.length > 0 ? (
                            <div className="divide-y divide-gray-200">
                                {searchResults.map((node) => (
                                    <button
                                        key={node.id}
                                        type="button"
                                        onClick={() => focusNode(node)}
                                        className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition hover:bg-blue-50"
                                    >
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium text-gray-900">{highlightText(node.content, searchQuery)}</div>
                                            <div className="mt-1 text-xs text-gray-500">
                                                {highlightText(`${node.type} • ID ${node.id}`, searchQuery)}
                                            </div>
                                        </div>
                                        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">
                                            Buka
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="px-4 py-3 text-sm text-gray-500">
                                Tidak ada node yang cocok dengan pencarian ini.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {statementWarnings.length > 0 && (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <div className="flex items-start gap-2">
                        <Icon icon={Icons.warning} width={18} className="mt-0.5 shrink-0 text-amber-700" />
                        <div>
                            <div className="font-semibold">Validasi struktur Sprint 3 belum terpenuhi.</div>
                            <div className="mt-1">
                                {statementWarnings.length} statement masih belum memiliki minimal satu indicator. Standar belum bisa diajukan
                                sebelum struktur ini dilengkapi.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className={`flex gap-6 items-start transition-all duration-300`}>
                {/* Left Column: Tree Builder */}
                <div className={`transition-all duration-300 ${selectedIndicatorView ? 'w-2/3' : 'w-full'}`}>
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 min-h-[500px]">
                        <div className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Tree Generator</div>
                                <div className="mt-1 text-sm font-semibold text-blue-900">Susun struktur standar dari Bab, lalu Pasal, lalu Indicator.</div>
                                <div className="mt-1 text-sm leading-6 text-blue-800">
                                    Tambah <strong>Bab</strong> di level utama. Setelah itu, setiap Bab dapat berisi <strong>Pasal</strong>, dan setiap Pasal dapat berisi <strong>Indicator</strong>.
                                </div>
                            </div>
                            {canManageStructure && !['WAITING_APPROVAL', 'TERBIT'].includes(standard?.status) && (
                                <button
                                    onClick={handleAddRoot}
                                    className="inline-flex shrink-0 items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                                >
                                    <Icon icon={Icons.add} width={16} />
                                    Tambah Bab
                                </button>
                            )}
                        </div>

                        {tree.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                                    <Icon icon={Icons.folder} width={26} />
                                </div>
                                <h2 className="mt-4 text-lg font-semibold text-gray-900">Struktur standar masih kosong</h2>
                                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                                    Standar baru mulai dari tree kosong. Tambahkan <strong>Bab</strong> terlebih dahulu, lalu isi <strong>Pasal</strong> di dalamnya, dan lanjutkan dengan <strong>Indicator</strong> pada setiap Pasal.
                                </p>
                                {canManageStructure ? (
                                    <button
                                        onClick={handleAddRoot}
                                        className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                                    >
                                        <Icon icon={Icons.add} width={16} />
                                        Tambah Bab Pertama
                                    </button>
                                ) : (
                                    <div className="mt-4 text-sm text-gray-500">Standar ini hanya dapat dibaca oleh role Anda.</div>
                                )}
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
                                        onViewNode={focusNode}
                                        isTerbit={!canManageStructure || ['WAITING_APPROVAL', 'TERBIT'].includes(standard?.status)}
                                        expandedIds={expandedIds}
                                        onToggleExpand={toggleExpand}
                                        activeNodeId={selectedIndicatorView?.id}
                                        registerNodeRef={registerNodeRef}
                                        searchQuery={searchQuery}
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
                                        {getNodeTypeLabel(selectedIndicatorView.type)}
                                    </span>
                                    <span className="ml-2 text-xs text-gray-500">ID: #{selectedIndicatorView.id}</span>
                                </div>
                                <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap mb-6">
                                    {selectedIndicatorView.content}
                                </div>

                                {selectedIndicatorView.type === 'Indicator' && (
                                    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <div className="mb-4 grid gap-3 sm:grid-cols-2">
                                            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">IKU</div>
                                                <div className="mt-1 text-sm font-semibold text-sky-900">{selectedIndicatorView.iku || '-'}</div>
                                            </div>
                                            <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">IKT</div>
                                                <div className="mt-1 text-sm font-semibold text-violet-900">{selectedIndicatorView.ikt || '-'}</div>
                                            </div>
                                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 sm:col-span-2">
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">PJ</div>
                                                <div className="mt-1 text-sm font-semibold text-emerald-900">{selectedIndicatorView.pj || '-'}</div>
                                            </div>
                                        </div>
                                        <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                            Target indikator diisi saat indikator dimasukkan ke borang per prodi, bukan saat penyusunan standar.
                                        </div>

                                        <div className="mt-6 border-t border-gray-200 pt-4">
                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Timeline Indikator</h4>
                                            <IndicatorTimeline metricId={selectedIndicatorView.id} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Form Modal (Add/Edit Nodes) */}
            {canManageStructure && isModalOpen && (
                <div className="fixed z-[60] inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                        <div className="relative z-[60] inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                                {editingNode
                                    ? `Edit ${getNodeTypeLabel(editingNode.type)}`
                                    : parentNode
                                        ? `${getAddChildLabel(parentNode.type)} untuk ${getNodeTypeLabel(parentNode.type)} #${parentNode.id}`
                                        : 'Tambah Bab Utama'}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {editingNode && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipe Komponen</label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        >
                                            <option value="Header">Bab (Folder/Kategori)</option>
                                            <option value="Statement">Pasal (Pernyataan Kinerja)</option>
                                            <option value="Indicator">Indicator (Tolak Ukur Target)</option>
                                        </select>
                                    </div>
                                )}
                                {!editingNode && parentNode && (
                                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                                        Tipe node ditentukan otomatis dari tombol yang dipilih: Bab -&gt; Pasal -&gt; Indicator.
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {formData.type === 'Header'
                                            ? 'Nama Bab'
                                            : formData.type === 'Statement'
                                                ? 'Nama Pasal'
                                                : 'Nama Indicator'}
                                    </label>
                                    <textarea
                                        required
                                        rows="4"
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"
                                        placeholder="Masukkan isi uraian di sini..."
                                    ></textarea>
                                </div>
                                {formData.type === 'Indicator' && (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">IKU</label>
                                            <input
                                                type="text"
                                                value={formData.iku}
                                                onChange={(e) => setFormData({ ...formData, iku: e.target.value })}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                placeholder="Contoh: IKU 1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">IKT</label>
                                            <input
                                                type="text"
                                                value={formData.ikt}
                                                onChange={(e) => setFormData({ ...formData, ikt: e.target.value })}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                placeholder="Contoh: IKT 1.1"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">PJ</label>
                                            <select
                                                value={formData.pj}
                                                onChange={(e) => setFormData({ ...formData, pj: e.target.value })}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            >
                                                <option value="">Pilih PJ</option>
                                                <option value="Dekan">Dekan</option>
                                                <option value="Kaprodi">Kaprodi</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
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
