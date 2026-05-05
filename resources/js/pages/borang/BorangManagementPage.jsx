import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api, { getCached } from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';
import TablePagination from '../../components/ui/TablePagination';
import {
    addRequirementRow,
    closeAddModal,
    openAddModal,
    removeRequirementRow,
    resetBorangView,
    setActiveRequirementTab,
    setAllIndicators,
    setIndicatorSearch,
    setLoading,
    setLoadingIndicators,
    setLoadingRequirements,
    setPairsFacultyFilter,
    setPairsPage,
    setPairsSearch,
    setRequirementRows,
    setRequirementsPage,
    setRequirementsSearch,
    setRequirementsStandardFilter,
    setSelectedFaculty,
    setSelectedIndicatorId,
    setSelectedPj,
    setSelectedTargetSasaran,
    setSelectedProdi,
    setUnits,
    setViewMode,
} from '../../store/borangSlice';

function walkMetrics(nodes, standard, rows = [], ancestors = []) {
    nodes.forEach((node) => {
        const nextAncestors = [...ancestors, node];

        if (node.type === 'Indicator') {
            const statement = [...ancestors].reverse().find((item) => item.type === 'Statement') || null;
            rows.push({
                id: node.id,
                standard,
                indicator: node,
                statement,
            });
        }

        if (node.children_recursive?.length) {
            walkMetrics(node.children_recursive, standard, rows, nextAncestors);
        }
    });

    return rows;
}

export default function BorangManagementPage() {
    const dispatch = useDispatch();
    const PAGE_SIZE = 10;
    const {
        units,
        loading,
        loadingRequirements,
        viewMode,
        selectedFaculty,
        selectedProdi,
        activeRequirementTab,
        pairsPage,
        requirementsPage,
        pairsSearch,
        pairsFacultyFilter,
        requirementsSearch,
        requirementsStandardFilter,
        requirementRows,
        isAddModalOpen,
        allIndicators,
        loadingIndicators,
        indicatorSearch,
        selectedIndicatorId,
        selectedPj,
        selectedTargetSasaran,
    } = useSelector((state) => state.borang);

    const fetchPageData = async () => {
        try {
            dispatch(setLoading(true));

            const unitsResponse = await api.get('/units/flat');
            dispatch(setUnits(unitsResponse.data.data || []));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Data borang gagal dimuat.');
        } finally {
            dispatch(setLoading(false));
        }
    };

    useEffect(() => {
        fetchPageData();
    }, []);

    const openAddBorangModal = async () => {
        dispatch(openAddModal());

        if (allIndicators.length > 0) {
            return;
        }

        try {
            dispatch(setLoadingIndicators(true));
            const standardsResponse = await getCached('/standards');
            const fetchedStandards = standardsResponse.data.data || [];

            const treeResponses = await Promise.all(
                fetchedStandards.map(async (standard) => {
                    const treeResponse = await api.get(`/standards/${standard.id}/metrics/tree`);
                    return {
                        standard,
                        tree: treeResponse.data.data || [],
                    };
                })
            );

            const existingMetricIds = new Set(requirementRows.map((row) => String(row.metricId)));

            const indicators = treeResponses.flatMap(({ standard, tree }) => (
                walkMetrics(tree, standard).map((row) => ({
                    id: row.id,
                    standardId: standard.id,
                    standardName: standard.name,
                    content: row.indicator.content || '',
                    iku: row.indicator.iku || '-',
                    ikt: row.indicator.ikt || '-',
                }))
            )).filter((item) => !existingMetricIds.has(String(item.id)));

            dispatch(setAllIndicators(indicators));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Daftar indikator gagal dimuat.');
        } finally {
            dispatch(setLoadingIndicators(false));
        }
    };

    const closeAddBorangModal = () => {
        dispatch(closeAddModal());
    };

    const facultyRows = useMemo(() => (
        units
            .filter((unit) => unit.level === 'faculty')
            .sort((left, right) => left.name.localeCompare(right.name, 'id-ID'))
    ), [units]);

    const facultyProdiRows = useMemo(() => (
        facultyRows.flatMap((faculty) => (
            units
                .filter((unit) => unit.level === 'department' && String(unit.parent_id) === String(faculty.id))
                .sort((left, right) => left.name.localeCompare(right.name, 'id-ID'))
                .map((prodi) => ({
                    faculty,
                    prodi,
                }))
        ))
    ), [facultyRows, units]);

    const filteredFacultyProdiRows = useMemo(() => (
        facultyProdiRows.filter(({ faculty, prodi }) => (
            (pairsFacultyFilter === 'ALL' || String(faculty.id) === pairsFacultyFilter)
            && `${faculty.name} ${faculty.code || ''} ${prodi.name} ${prodi.code || ''}`.toLowerCase().includes(pairsSearch.trim().toLowerCase())
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
        dispatch(setPairsPage(Math.min(pairsPage, pairTotalPages)));
    }, [dispatch, pairTotalPages, pairsPage]);

    useEffect(() => {
        dispatch(setPairsPage(1));
    }, [dispatch, pairsFacultyFilter, pairsSearch]);

    useEffect(() => {
        dispatch(setRequirementsPage(1));
    }, [activeRequirementTab, dispatch, requirementsSearch, requirementsStandardFilter, selectedFaculty, selectedProdi]);

    useEffect(() => {
        dispatch(setRequirementsPage(Math.min(requirementsPage, requirementTotalPages)));
    }, [dispatch, requirementTotalPages, requirementsPage]);

    const loadRequirementRows = async (prodiId) => {
        const response = await api.get(`/borang/prodis/${prodiId}`);

        return (response.data.data || []).map((row) => ({
            id: row.id,
            metricId: row.metric_id,
            standardId: row.standard_id,
            standardName: row.standard_name,
            iku: row.iku,
            ikt: row.ikt,
            sasaranMutu: row.sasaran_mutu,
            indikator: row.indikator,
            targetSasaran: row.target_sasaran,
            pj: row.pj,
        }));
    };

    const openRequirementTable = async (faculty, prodi) => {
        dispatch(setSelectedFaculty(faculty));
        dispatch(setSelectedProdi(prodi));
        dispatch(setActiveRequirementTab('DEKAN'));
        dispatch(setLoadingRequirements(true));

        try {
            const rows = await loadRequirementRows(prodi.id);
            dispatch(setRequirementRows(rows));
            dispatch(setViewMode('requirements'));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Dokumen borang gagal dimuat.');
        } finally {
            dispatch(setLoadingRequirements(false));
        }
    };

    const goBackToPairs = () => {
        dispatch(resetBorangView());
    };

    const pageMeta = viewMode === 'pairs'
        ? {
            title: 'Borang Fakultas dan Prodi',
            description: 'Halaman manajemen borang menampilkan seluruh kombinasi fakultas dan prodi. Detailnya memuat daftar dokumen borang yang dibentuk dari indikator standar oleh LPMI Admin.',
        }
        : {
            title: `Dokumen Borang ${selectedFaculty?.name || '-'} / ${selectedProdi?.name || '-'}`.trim(),
            description: 'Daftar berikut menampilkan indikator, target sasaran, dan PJ dokumen borang untuk prodi terpilih.',
        };

    const filteredIndicators = useMemo(() => {
        const assignedMetricIds = new Set(requirementRows.map((row) => String(row.metricId)));

        return allIndicators.filter((item) => (
            !assignedMetricIds.has(String(item.id))
            && `${item.standardName} ${item.content} ${item.iku} ${item.ikt}`.toLowerCase().includes(indicatorSearch.trim().toLowerCase())
        ));
    }, [allIndicators, indicatorSearch, requirementRows]);

    const selectedIndicator = filteredIndicators.find((item) => String(item.id) === selectedIndicatorId)
        || allIndicators.find((item) => String(item.id) === selectedIndicatorId)
        || null;

    const handleTambahBorang = async () => {
        if (!selectedIndicator) {
            toast.warning('Pilih indikator terlebih dahulu.');
            return;
        }

        if (!selectedProdi) {
            toast.error('Prodi belum dipilih.');
            return;
        }

        try {
            const response = await api.post('/borang', {
                prodi_id: selectedProdi.id,
                metric_id: selectedIndicator.id,
                pj: selectedPj,
                target_sasaran: selectedTargetSasaran.trim(),
            });

            const createdRow = response.data.data;
            dispatch(addRequirementRow({
                id: createdRow.id,
                metricId: createdRow.metric_id,
                standardId: createdRow.standard_id,
                standardName: createdRow.standard_name,
                iku: createdRow.iku,
                ikt: createdRow.ikt,
                sasaranMutu: createdRow.sasaran_mutu,
                indikator: createdRow.indikator,
                targetSasaran: createdRow.target_sasaran,
                pj: createdRow.pj,
            }));
            toast.success(response.data.message || 'Borang berhasil ditambahkan.');
            closeAddBorangModal();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Borang gagal ditambahkan.');
        }
    };

    const handleDeleteBorang = async (borangId) => {
        if (!window.confirm('Hapus borang ini dari prodi?')) {
            return;
        }

        try {
            await api.delete(`/borang/${borangId}`);
            dispatch(removeRequirementRow(borangId));
            toast.success('Borang berhasil dihapus.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Borang gagal dihapus.');
        }
    };

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                            <Icon icon={Icons.document} width={14} />
                            LPM-Admin
                        </div>
                        <h1 className="mt-4 text-2xl font-semibold text-gray-900">{pageMeta.title}</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                            {pageMeta.description}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {viewMode !== 'pairs' && (
                            <button
                                type="button"
                                onClick={goBackToPairs}
                                className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                            >
                                <Icon icon={Icons.back} width={16} />
                                Kembali
                            </button>
                        )}
                        {viewMode === 'requirements' && (
                            <button
                                type="button"
                                onClick={openAddBorangModal}
                                className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                            >
                                <Icon icon={Icons.add} width={16} />
                                Tambah Borang
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {viewMode === 'pairs' && (
                <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Daftar Fakultas dan Prodi</h2>
                            <span className="text-sm text-gray-500">{filteredFacultyProdiRows.length} baris</span>
                        </div>
                    </div>
                    <div className="grid gap-4 border-b border-gray-200 px-6 py-4 md:grid-cols-[220px_minmax(0,1fr)]">
                        <select
                            value={pairsFacultyFilter}
                            onChange={(event) => dispatch(setPairsFacultyFilter(event.target.value))}
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
                            onChange={(event) => dispatch(setPairsSearch(event.target.value))}
                            placeholder="Filter faculty name, prodi name, atau kode..."
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Nama Prodi</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Nama Fakultas</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {loading ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-500">
                                            Memuat data fakultas dan prodi...
                                        </td>
                                    </tr>
                                ) : filteredFacultyProdiRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-500">
                                            Belum ada data fakultas dan prodi.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedFacultyProdiRows.map(({ faculty, prodi }) => (
                                        <tr key={`${faculty.id}-${prodi.id}`} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">{prodi.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{faculty.name}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => openRequirementTable(faculty, prodi)}
                                                    disabled={loadingRequirements}
                                                    className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                                                >
                                                    <Icon icon={Icons.eye} width={16} />
                                                    {loadingRequirements ? 'Memuat...' : 'Lihat Dokumen'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <TablePagination
                        page={pairsPage}
                        totalPages={pairTotalPages}
                        totalItems={filteredFacultyProdiRows.length}
                        pageSize={PAGE_SIZE}
                        onPageChange={(page) => dispatch(setPairsPage(page))}
                    />
                </section>
            )}

            {viewMode === 'requirements' && (
                <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Daftar Dokumen Borang</h2>
                            <span className="text-sm text-gray-500">{filteredRequirementRows.length} baris</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => dispatch(setActiveRequirementTab('DEKAN'))}
                                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                    activeRequirementTab === 'DEKAN'
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                PJ Dekan
                            </button>
                            <button
                                type="button"
                                onClick={() => dispatch(setActiveRequirementTab('KAPRODI'))}
                                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                    activeRequirementTab === 'KAPRODI'
                                        ? 'bg-amber-600 text-white'
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
                            onChange={(event) => dispatch(setRequirementsStandardFilter(event.target.value))}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
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
                            onChange={(event) => dispatch(setRequirementsSearch(event.target.value))}
                            placeholder="Filter standar, IKU, IKT, sasaran mutu, indikator, target..."
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
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
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Kelola</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {loadingRequirements ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-500">
                                            Memuat daftar dokumen borang...
                                        </td>
                                    </tr>
                                ) : loading ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-500">
                                            Memuat daftar dokumen borang...
                                        </td>
                                    </tr>
                                ) : filteredRequirementRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-500">
                                            Belum ada indikator untuk tab {activeRequirementTab === 'DEKAN' ? 'PJ Dekan' : 'PJ Kaprodi'}.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRequirementRows.map((row) => (
                                        <tr key={`${row.standardId}-${row.id}-${row.no}`} className="align-top hover:bg-gray-50">
                                            <td className="px-4 py-4 text-sm text-gray-700">{row.no}</td>
                                            <td className="px-4 py-4 text-sm font-semibold text-gray-900">{row.standardName}</td>
                                            <td className="px-4 py-4 text-sm text-gray-700">{row.iku}</td>
                                            <td className="px-4 py-4 text-sm text-gray-700">{row.ikt}</td>
                                            <td className="px-4 py-4 text-sm leading-6 text-gray-700">{row.sasaranMutu}</td>
                                            <td className="px-4 py-4 text-sm leading-6 text-gray-700">{row.indikator}</td>
                                            <td className="px-4 py-4 text-sm leading-6 text-gray-700">{row.targetSasaran}</td>
                                            <td className="px-4 py-4 text-sm font-medium text-gray-700">{row.pj}</td>
                                            <td className="px-4 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteBorang(row.id)}
                                                    className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                                                >
                                                    <Icon icon={Icons.delete} width={14} />
                                                    Hapus
                                                </button>
                                            </td>
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
                        onPageChange={(page) => dispatch(setRequirementsPage(page))}
                    />
                </section>
            )}

            <section className="rounded-3xl border border-dashed border-amber-200 bg-amber-50/60 p-5 text-sm leading-6 text-amber-900">
                LPMI Admin menambahkan item borang per prodi dengan memilih indikator dari standar yang sudah disusun. Detail borang hanya menampilkan indikator yang sudah dipilih untuk prodi tersebut.
            </section>

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
                    <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Tambah Borang</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Pilih indikator dari standar yang sudah disusun lalu isi target sasaran khusus untuk prodi ini.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeAddBorangModal}
                                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                            >
                                <Icon icon={Icons.close} width={20} />
                            </button>
                        </div>

                        <div className="space-y-4 px-6 py-6">
                            <input
                                type="text"
                                value={indicatorSearch}
                                onChange={(event) => dispatch(setIndicatorSearch(event.target.value))}
                                placeholder="Cari standar, indikator, IKU, IKT, atau PJ..."
                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                            />

                            <div className="max-h-[380px] overflow-y-auto rounded-2xl border border-gray-200">
                                {loadingIndicators ? (
                                    <div className="px-4 py-10 text-center text-sm text-gray-500">Memuat daftar indikator...</div>
                                ) : filteredIndicators.length === 0 ? (
                                    <div className="px-4 py-10 text-center text-sm text-gray-500">Tidak ada indikator yang cocok.</div>
                                ) : (
                                    <div className="divide-y divide-gray-200">
                                        {filteredIndicators.map((item) => (
                                            <label
                                                key={item.id}
                                                className={`flex cursor-pointer items-start gap-3 px-4 py-4 transition hover:bg-amber-50 ${
                                                    String(item.id) === selectedIndicatorId ? 'bg-amber-50' : 'bg-white'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="selected_indicator"
                                                    value={item.id}
                                                    checked={String(item.id) === selectedIndicatorId}
                                                    onChange={(event) => dispatch(setSelectedIndicatorId(event.target.value))}
                                                    className="mt-1 h-4 w-4 border-gray-300 text-amber-600 focus:ring-amber-500"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-semibold text-gray-900">{item.content}</div>
                                                    <div className="mt-1 text-xs text-gray-500">{item.standardName}</div>
                                                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 font-semibold text-sky-700">IKU: {item.iku}</span>
                                                        <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">IKT: {item.ikt}</span>
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-semibold text-gray-700">Pilih PJ Borang</label>
                                <select
                                    value={selectedPj}
                                    onChange={(event) => dispatch(setSelectedPj(event.target.value))}
                                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                                >
                                    <option value="Kaprodi">Kaprodi</option>
                                    <option value="Dekan">Dekan</option>
                                </select>
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-semibold text-gray-700">Target Sasaran Prodi</label>
                                <textarea
                                    rows={4}
                                    value={selectedTargetSasaran}
                                    onChange={(event) => dispatch(setSelectedTargetSasaran(event.target.value))}
                                    placeholder="Contoh: Minimal 80% lulusan memperoleh IPK di atas 3,25 pada prodi ini."
                                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-5">
                            <button
                                type="button"
                                onClick={closeAddBorangModal}
                                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleTambahBorang}
                                disabled={!selectedIndicator || !selectedTargetSasaran.trim()}
                                className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Icon icon={Icons.add} width={16} />
                                Tambah Borang
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
