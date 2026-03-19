import { useState } from 'react';
import { trpc, getDownloadUrl } from '../trpc';
import DataTable from '../components/DataTable';

export default function BatchManagement() {
  const [spaceId, setSpaceId] = useState<number>(0);
  const [page, setPage] = useState(1);

  const spaces = trpc.spaces.list.useQuery();
  const batches = trpc.batches.list.useQuery({ spaceId: spaceId || undefined, page });
  const revertCoolingMutation = trpc.batches.revertCooling.useMutation({
    onSuccess: () => batches.refetch(),
  });

  const parseFilters = (json: string) => {
    try {
      const f = JSON.parse(json);
      const parts = [];
      if (f.activityLevel) parts.push(`活跃度:${f.activityLevel}`);
      if (f.isValid) parts.push(`有效性:${f.isValid}`);
      if (f.channelId) parts.push(`渠道ID:${f.channelId}`);
      if (f.sendCountMin !== undefined) parts.push(`发送≥${f.sendCountMin}`);
      if (f.sendCountMax !== undefined) parts.push(`发送≤${f.sendCountMax}`);
      return parts.join(', ') || '无筛选';
    } catch { return '-'; }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">批次管理</h2>
        <select value={spaceId} onChange={e => { setSpaceId(Number(e.target.value)); setPage(1); }}
          className="border rounded px-3 py-2 text-sm">
          <option value={0}>全部空间库</option>
          {spaces.data?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-lg border">
        <DataTable
          columns={[
            { key: 'id', title: 'ID' },
            { key: 'space', title: '空间库', render: (r: any) => r.space?.name },
            { key: 'filtersJson', title: '筛选条件', render: (r: any) => <span className="text-xs">{parseFilters(r.filtersJson)}</span> },
            { key: 'total', title: '号码数量' },
            { key: 'isCoolExport', title: '类型', render: (r: any) => r.isCoolExport ? '冷却导出' : '全量导出' },
            { key: 'status', title: '状态', render: (r: any) => (
              <span className={
                r.status === 'completed' ? 'text-green-600' :
                r.status === 'failed' ? 'text-red-500' : 'text-yellow-600'
              }>{r.status === 'completed' ? '完成' : r.status === 'failed' ? '失败' : `处理中 ${r.progress}%`}</span>
            )},
            { key: 'coolReverted', title: '冷却状态', render: (r: any) => (
              r.isCoolExport ? (r.coolReverted ? '已解除' : '冷却中') : '-'
            )},
            { key: 'createdAt', title: '时间', render: (r: any) => new Date(r.createdAt).toLocaleString('zh-CN') },
            { key: 'actions', title: '操作', render: (r: any) => (
              <div className="flex gap-2">
                {r.status === 'completed' && r.filePath && (
                  <a href={getDownloadUrl(r.filePath)} className="text-blue-600 text-sm hover:underline">下载</a>
                )}
                {r.isCoolExport && !r.coolReverted && r.status === 'completed' && (
                  <button onClick={() => { if (confirm('确认解除冷却？')) revertCoolingMutation.mutate({ batchId: r.id }); }}
                    className="text-orange-600 text-sm hover:underline">解除冷却</button>
                )}
              </div>
            )},
          ]}
          data={batches.data?.items || []}
          total={batches.data?.total || 0}
          page={page}
          onPageChange={setPage}
          loading={batches.isLoading}
        />
      </div>
    </div>
  );
}
