import React from 'react';
import Icon, { Icons } from './Icon';

export default function TablePagination({
    page,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
}) {
    if (totalPages <= 1) {
        return null;
    }

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalItems);

    return (
        <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
                Menampilkan {start}-{end} dari {totalItems} data
            </p>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Icon icon={Icons.prev} width={16} />
                    Sebelumnya
                </button>
                <span className="text-sm font-medium text-gray-600">
                    {page} / {totalPages}
                </span>
                <button
                    type="button"
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Berikutnya
                    <Icon icon={Icons.next} width={16} />
                </button>
            </div>
        </div>
    );
}
