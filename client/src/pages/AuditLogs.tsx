import { useState } from 'react';
import { trpc } from '../trpc';
import DataTable from '../components/DataTable';

export default function AuditLogs() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const logs = trpc.auditLogs.list.useQuery({ action: action || undefined, page });

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">审计日志</h2>

      <div className="mb-4">
        <input type="text" value={action} onChange={e => { setAction(e.target.value); setPage(1); }}
          placeholder="按操作类型搜索" className="border rounded px-3 py-2 text-sm w-64" />
      </div>

      <div className="bg-white rounded-lg border">
        <DataTable
          columns={[
            { key: 'id', title: 'ID' },
            { key: 'user', title: '操作人', render: (r: any) => r.user?.username },
            { key: 'action', title: '操作类型' },
            { key: 'detail', title: '详情' },
            { key: 'createdAt', title: '时间', render: (r: any) => new Date(r.createdAt).toLocaleString('zh-CN') },
          ]}
          data={logs.data?.items || []}
          total={logs.data?.total || 0}
          page={page}
          onPageChange={setPage}
          loading={logs.isLoading}
        />
      </div>
    </div>
  );
}
