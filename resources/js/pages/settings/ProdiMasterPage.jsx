import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';
import TanStackDataTable from '../../components/ui/TanStackDataTable';

const emptyProdiForm = {
    name: '',
    code: '',
    faculty_id: '',
};

export default function ProdiMasterPage() {
    const PAGE_SIZE = 10;
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingProdi, setSavingProdi] = useState(false);
    const [prodiForm, setProdiForm] = useState(emptyProdiForm);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');

    const fetchUnits = async () => {
        try {
            setLoading(true);
            const response = await api.get('/units/flat');
            setUnits(response.data.data || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Master data prodi gagal dimuat.');
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
            .sort((left, right) => left.name.localeCompare(right.name, 'id-ID'))
    ), [units]);

    const prodis = useMemo(() => (
        units
            .filter((unit) => unit.level === 'department')
            .map((unit) => ({
                ...unit,
                faculty: faculties.find((faculty) => String(faculty.id) === String(unit.parent_id)) || null,
            }))
            .filter((unit) => `${unit.name} ${unit.code || ''} ${unit.faculty?.name || ''}`.toLowerCase().includes(search.trim().toLowerCase()))
            .sort((left, right) => left.name.localeCompare(right.name, 'id-ID'))
    ), [faculties, search, units]);

    const prodiColumns = useMemo(() => [
        {
            accessorKey: 'name',
            header: 'Nama Prodi',
            meta: { cellClassName: 'px-6 py-4 text-sm font-medium text-gray-900' },
        },
        {
            accessorKey: 'faculty.name',
            header: 'Fakultas',
            cell: ({ row }) => row.original.faculty?.name || '-',
            meta: { cellClassName: 'px-6 py-4 text-sm text-gray-600' },
        },
        {
            accessorKey: 'code',
            header: 'Kode',
            cell: ({ row }) => row.original.code || '-',
            meta: { cellClassName: 'px-6 py-4 text-sm text-gray-600' },
        },
        {
            id: 'actions',
            header: 'Aksi',
            meta: {
                headerClassName: 'px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em] text-gray-500',
                cellClassName: 'px-6 py-4 text-right',
            },
            cell: ({ row }) => (
                <button
                    type="button"
                    onClick={() => deleteProdi(row.original)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                >
                    <Icon icon={Icons.delete} width={14} />
                    Hapus
                </button>
            ),
        },
    ], []);

    useEffect(() => {
        setPage(1);
    }, [search]);

    const handleCreateProdi = async (event) => {
        event.preventDefault();

        if (!prodiForm.name.trim()) {
            toast.warning('Nama prodi wajib diisi.');
            return;
        }

        if (!prodiForm.faculty_id) {
            toast.warning('Fakultas induk wajib dipilih.');
            return;
        }

        setSavingProdi(true);

        try {
            const response = await api.post('/units', {
                name: prodiForm.name.trim(),
                code: prodiForm.code.trim() || null,
                level: 'department',
                parent_id: Number(prodiForm.faculty_id),
                is_active: true,
            });

            toast.success(response.data.message || 'Prodi berhasil ditambahkan.');
            setProdiForm(emptyProdiForm);
            await fetchUnits();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Prodi gagal ditambahkan.');
        } finally {
            setSavingProdi(false);
        }
    };

    const deleteProdi = async (prodi) => {
        const confirmed = window.confirm(`Hapus prodi ${prodi.name}?`);
        if (!confirmed) {
            return;
        }

        try {
            const response = await api.delete(`/units/${prodi.id}`);
            toast.success(response.data.message || 'Prodi berhasil dihapus.');
            await fetchUnits();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Prodi gagal dihapus.');
        }
    };

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    <Icon icon={Icons.settings} width={14} />
                    Master Data
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-gray-900">Master Prodi</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Kelola data prodi dan hubungkan setiap prodi ke fakultas induknya.
                </p>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                        <Icon icon={Icons.document} width={18} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Tambah Prodi</h2>
                        <p className="text-sm text-gray-500">Total {prodis.length} prodi aktif</p>
                    </div>
                </div>

                <form onSubmit={handleCreateProdi} className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_auto]">
                    <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-700">Nama Prodi</span>
                        <input
                            type="text"
                            value={prodiForm.name}
                            onChange={(event) => setProdiForm((current) => ({ ...current, name: event.target.value }))}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                            placeholder="Contoh: Teknik Informatika"
                        />
                    </label>

                    <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-700">Kode</span>
                        <input
                            type="text"
                            value={prodiForm.code}
                            onChange={(event) => setProdiForm((current) => ({ ...current, code: event.target.value }))}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                            placeholder="Contoh: TI"
                        />
                    </label>

                    <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-700">Fakultas</span>
                        <select
                            value={prodiForm.faculty_id}
                            onChange={(event) => setProdiForm((current) => ({ ...current, faculty_id: event.target.value }))}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        >
                            <option value="">Pilih fakultas</option>
                            {faculties.map((faculty) => (
                                <option key={faculty.id} value={faculty.id}>
                                    {faculty.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={savingProdi}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Icon icon={Icons.add} width={18} />
                            {savingProdi ? 'Menyimpan...' : 'Tambah'}
                        </button>
                    </div>
                </form>
            </section>

            <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Daftar Prodi</h2>
                    <span className="text-sm text-gray-500">{prodis.length} data</span>
                </div>
                <div className="border-b border-gray-200 px-6 py-4">
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Filter nama prodi, fakultas, atau kode..."
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                </div>

                <TanStackDataTable
                    columns={prodiColumns}
                    data={prodis}
                    loading={loading}
                    loadingMessage="Memuat data prodi..."
                    emptyMessage="Belum ada data prodi."
                    page={page}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                    tbodyClassName="divide-y divide-gray-100 bg-white"
                />
            </section>
        </div>
    );
}
