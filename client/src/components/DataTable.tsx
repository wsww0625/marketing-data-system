import React from 'react';

interface Column<T> {
  key: string;
  title: string;
  render?: (record: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  loading?: boolean;
}

export default function DataTable<T extends Record<string, any>>({
  columns, data, total = 0, page = 1, pageSize = 20, onPageChange, loading
}: DataTableProps<T>) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50/60" style={{ width: col.width }}>
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400 text-sm">加载中...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400 text-sm">暂无数据</td></tr>
            ) : (
              data.map((record, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-gray-700">
                      {col.render ? col.render(record) : String(record[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {total > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">共 {total} 条</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >上一页</button>
            <span className="px-3 py-1.5 text-sm text-gray-500">{page} / {totalPages}</span>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >下一页</button>
          </div>
        </div>
      )}
    </div>
  );
}
