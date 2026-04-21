import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Icon, { Icons } from '../../components/ui/Icon';

export default function BorangManagementPage() {
    const [standards, setStandards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchStandards = async () => {
            try {
                setLoading(true);
                const response = await api.get('/standards');
                setStandards(response.data.data || []);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Data borang gagal dimuat.');
            } finally {
                setLoading(false);
            }
        };

        fetchStandards();
    }, []);

    const filteredStandards = useMemo(() => (
        standards.filter((item) => {
            const haystack = `${item.name} ${item.category} ${item.periode_tahun || ''}`.toLowerCase();
            return haystack.includes(search.trim().toLowerCase());
        })
    ), [search, standards]);

    return (
        <div className="space-y-6 p-6 sm:p-8">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    <Icon icon={Icons.document} width={14} />
                    LPM-Admin
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-gray-900">Borang</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Halaman ini digunakan Admin LPMI untuk mengelola borang audit per standar, termasuk struktur indikator, IKU, IKT, PJ, dan target indikator.
                </p>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <label className="block space-y-2">
                    <span className="text-sm font-medium text-gray-700">Cari Borang</span>
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari nama standar, kategori, atau periode..."
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                    />
                </label>
            </section>

            <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Daftar Borang</h2>
                    <span className="text-sm text-gray-500">{filteredStandards.length} standar</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Nama Standar</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Kategori</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Periode</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">
                                        Memuat data borang...
                                    </td>
                                </tr>
                            ) : filteredStandards.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">
                                        Tidak ada borang yang cocok.
                                    </td>
                                </tr>
                            ) : (
                                filteredStandards.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{item.category}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{item.periode_tahun || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                to={`/standards/${item.id}/builder`}
                                                className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                                            >
                                                <Icon icon={Icons.edit} width={16} />
                                                Kelola Borang
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
