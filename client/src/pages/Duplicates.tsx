import { useState } from 'react';
import { trpc, getDownloadUrl } from '../trpc';
import DataTable from '../components/DataTable';

export default function Duplicates() {
  const [spaceId, setSpaceId] = useState<number>(0);
  const [page, setPage] = useState(1);

  const spaces = trpc.spaces.list.useQuery();
  const list = trpc.duplicates.list.useQuery({ spaceId: spaceId || undefined, page });
  const exportMutation = trpc.duplicates.export.useMutation();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">重复库</h2>
        <div className="flex gap-2">
          <select value={spaceId} onChange={e => { setSpaceId(Number(e.target.value)); setPage(1); }}
            className="border rounded px-3 py-2 text-sm">
            <option value={0}>全部空间库</option>
            {spaces.data?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={async () => {
            const res = await exportMutation.mutateAsync({ spaceId: spaceId || undefined });
            if (res.fileName) window.open(getDownloadUrl(res.fileName));
          }} disabled={exportMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
            导出重复库
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <DataTable
          columns={[
            { key: 'phone', title: '手机号' },
            { key: 'space', title: '空间库', render: (r: any) => r.space?.name },
            { key: 'channel', title: '渠道', render: (r: any) => r.channel?.name || '-' },
            { key: 'importBatch', title: '导入文件', render: (r: any) => r.importBatch?.fileName || '-' },
            { key: 'createdAt', title: '导入时间', render: (r: any) => new Date(r.createdAt).toLocaleString('zh-CN') },
          ]}
          data={list.data?.items || []}
          total={list.data?.total || 0}
          page={page}
          onPageChange={setPage}
          loading={list.isLoading}
        />
      </div>
    </div>
  );
}
