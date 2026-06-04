import React, { useEffect } from 'react';
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import TablePagination from './TablePagination';

export default function TanStackDataTable({
    columns,
    data,
    loading = false,
    loadingMessage = 'Memuat data...',
    emptyMessage = 'Belum ada data.',
    page = 1,
    pageSize = 10,
    onPageChange,
    tableClassName = 'min-w-full divide-y divide-gray-200',
    theadClassName = 'bg-gray-50',
    tbodyClassName = 'divide-y divide-gray-200 bg-white',
    rowClassName = 'hover:bg-gray-50',
}) {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            pagination: {
                pageIndex: Math.max(0, page - 1),
                pageSize,
            },
        },
        manualPagination: false,
    });

    const totalPages = Math.max(1, table.getPageCount());
    const visibleColumns = table.getVisibleLeafColumns().length;

    useEffect(() => {
        if (page > totalPages) {
            onPageChange?.(totalPages);
        }
    }, [onPageChange, page, totalPages]);

    return (
        <>
            <div className="overflow-x-auto">
                <table className={tableClassName}>
                    <thead className={theadClassName}>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th key={header.id} className={header.column.columnDef.meta?.headerClassName || 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-gray-500'}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className={tbodyClassName}>
                        {loading ? (
                            <tr>
                                <td colSpan={visibleColumns} className="px-6 py-10 text-center text-sm text-gray-500">
                                    {loadingMessage}
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={visibleColumns} className="px-6 py-10 text-center text-sm text-gray-500">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr key={row.id} className={typeof rowClassName === 'function' ? rowClassName(row.original) : rowClassName}>
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className={cell.column.columnDef.meta?.cellClassName || 'px-6 py-4 text-sm text-gray-700'}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <TablePagination
                page={page}
                totalPages={totalPages}
                totalItems={data.length}
                pageSize={pageSize}
                onPageChange={onPageChange}
            />
        </>
    );
}
