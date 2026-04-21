import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';
import TablePagination from '../../components/ui/TablePagination';

const emptyFacultyForm = {
    name: '',
    code: '',
};

export default function FacultyMasterPage() {
    const PAGE_SIZE = 10;
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingFaculty, setSavingFaculty] = useState(false);
    const [facultyForm, setFacultyForm] = useState(emptyFacultyForm);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');

    const fetchUnits = async () => {
        try {
            setLoading(true);
            const response = await api.get('/units/flat');
            setUnits(response.data.data || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Master data fakultas gagal dimuat.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUnits();
    }, []);

    const faculties = useMemo(() => (
        units
            .filter((unit) => unit.level === 'faculty')
            .filter((unit) => `${unit.name} ${unit.code || ''}`.toLowerCase().includes(search.trim().toLowerCase()))
            .sort((left, right) => left.name.localeCompare(right.name, 'id-ID'))
    ), [search, units]);

    const totalPages = Math.max(1, Math.ceil(faculties.length / PAGE_SIZE));
    const paginatedFaculties = useMemo(() => (
        faculties.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    ), [faculties, page]);

    useEffect(() => {
        setPage((current) => Math.min(current, totalPages));
    }, [totalPages]);

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
            setFacultyForm(emptyFacultyForm);
            await fetchUnits();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Fakultas gagal ditambahkan.');
        } finally {
            setSavingFaculty(false);
        }
    };

    const deleteFaculty = async (faculty) => {
        const confirmed = window.confirm(`Hapus fakultas ${faculty.name}?`);
        if (!confirmed) {
            return;
        }

        try {
            const response = await api.delete(`/units/${faculty.id}`);
            toast.success(response.data.message || 'Fakultas berhasil dihapus.');
            await fetchUnits();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Fakultas gagal dihapus.');
        }
    };

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                    <Icon icon={Icons.settings} width={14} />
                    Master Data
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-gray-900">Master Fakultas</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Kelola data fakultas sebagai unit induk untuk prodi di dalam sistem E-SPMI.
                </p>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                        <Icon icon={Icons.folder} width={18} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Tambah Fakultas</h2>
                        <p className="text-sm text-gray-500">Total {faculties.length} fakultas aktif</p>
                    </div>
                </div>

                <form onSubmit={handleCreateFaculty} className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_auto]">
                    <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-700">Nama Fakultas</span>
                        <input
                            type="text"
                            value={facultyForm.name}
                            onChange={(event) => setFacultyForm((current) => ({ ...current, name: event.target.value }))}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            placeholder="Contoh: Fakultas Teknik"
                        />
                    </label>

                    <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-700">Kode</span>
                        <input
                            type="text"
                            value={facultyForm.code}
                            onChange={(event) => setFacultyForm((current) => ({ ...current, code: event.target.value }))}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            placeholder="Contoh: FT"
                        />
                    </label>

                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={savingFaculty}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Icon icon={Icons.add} width={18} />
                            {savingFaculty ? 'Menyimpan...' : 'Tambah'}
                        </button>
                    </div>
                </form>
            </section>

            <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Daftar Fakultas</h2>
                    <span className="text-sm text-gray-500">{faculties.length} data</span>
                </div>
                <div className="border-b border-gray-200 px-6 py-4">
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Filter nama fakultas atau kode..."
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Nama Fakultas</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Kode</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-500">
                                        Memuat data fakultas...
                                    </td>
                                </tr>
                            ) : faculties.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-500">
                                        Belum ada data fakultas.
                                    </td>
                                </tr>
                            ) : (
                                paginatedFaculties.map((faculty) => (
                                    <tr key={faculty.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{faculty.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{faculty.code || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => deleteFaculty(faculty)}
                                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
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
                    page={page}
                    totalPages={totalPages}
                    totalItems={faculties.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                />
            </section>
        </div>
    );
}
