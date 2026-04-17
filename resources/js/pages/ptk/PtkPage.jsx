import React from 'react';
import { useSelector } from 'react-redux';
import Icon, { Icons } from '../../components/ui/Icon';

export default function PtkPage() {
    const user = useSelector((state) => state.auth.user);
    const permissions = user?.permissions || [];
    const canRespond = permissions.includes('ptk.respond');
    const canVerify = permissions.includes('ptk.verify');
    const canClose = permissions.includes('ptk.close');

    return (
        <div className="p-6 sm:p-8 space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    <Icon icon={Icons.ptk} width={14} />
                    Tindak Koreksi
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-gray-900">Manajemen PTK</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Halaman PTK sedang disiapkan. Hak akses sudah dipetakan agar tampilan berikutnya menyesuaikan peran pengguna sejak awal.
                </p>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Respon PTK</div>
                    <div className="mt-3 text-lg font-semibold text-gray-900">{canRespond ? 'Aktif' : 'Tidak Aktif'}</div>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                        Digunakan oleh unit pelaksana untuk menanggapi tindak koreksi.
                    </p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Verifikasi PTK</div>
                    <div className="mt-3 text-lg font-semibold text-gray-900">{canVerify ? 'Aktif' : 'Tidak Aktif'}</div>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                        Digunakan auditor untuk mengecek tindak lanjut dari unit terkait.
                    </p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Penutupan PTK</div>
                    <div className="mt-3 text-lg font-semibold text-gray-900">{canClose ? 'Aktif' : 'Tidak Aktif'}</div>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                        Digunakan role pengendali untuk menutup PTK yang sudah selesai.
                    </p>
                </div>
            </section>

            <section className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-8 text-sm text-gray-500 shadow-sm">
                Modul PTK belum tersedia di sprint ini. Route ini sengaja disiapkan agar user tidak diarahkan ke halaman 404 umum dan agar implementasi berikutnya tinggal meneruskan guard permission yang sudah ada.
            </section>
        </div>
    );
}
