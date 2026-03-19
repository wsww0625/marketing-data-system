import { useState } from 'react';
import { trpc } from '../trpc';
import DataTable from '../components/DataTable';

export default function CrossDedup() {
  const [page, setPage] = useState(1);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [detailPage, setDetailPage] = useState(1);

  const batches = trpc.crossDedup.batches.useQuery({ page });
  const records = trpc.crossDedup.records.useQuery(
    { batchId: selectedBatch!, page: detailPage },
    { enabled: !!selectedBatch }
  );
  const scanMutation = trpc.crossDedup.scan.useMutation({ onSuccess: () => batches.refetch() });
  const updateStatusMutation = trpc.crossDedup.updateBatchStatus.useMutation({ onSuccess: () => batches.refetch() });

  const spaces = trpc.spaces.list.useQuery();
  const getSpaceName = (id: number) => spaces.data?.find(s => s.id === id)?.name || `空间库${id}`;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">跨库去重</h2>
        <button onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
          {scanMutation.isPending ? '扫描中...' : '手动扫描'}
        </button>
      </div>

      {scanMutation.data && (
        <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">
          扫描完成，发现 {scanMutation.data.duplicateCount} 条跨库重复号码
        </div>
      )}

      <div className="bg-white rounded-lg border mb-6">
        <div className="p-4 border-b"><h3 className="font-semibold">扫描批次</h3></div>
        <DataTable
          columns={[
            { key: 'id', title: '批次ID' },
            { key: 'primarySpaceId', title: '主库', render: (r: any) => getSpaceName(r.primarySpaceId) },
            { key: 'duplicateCount', title: '重复数量' },
            { key: 'status', title: '状态', render: (r: any) => (
              <span className={
                r.status === 'completed' ? 'text-blue-600' :
                r.status === 'confirmed' ? 'text-green-600' :
                r.status === 'ignored' ? 'text-gray-400' : 'text-yellow-600'
              }>{r.status === 'completed' ? '待处理' : r.status === 'confirmed' ? '已确认' : r.status === 'ignored' ? '已忽略' : '扫描中'}</span>
            )},
            { key: 'createdAt', title: '时间', render: (r: any) => new Date(r.createdAt).toLocaleString('zh-CN') },
            { key: 'actions', title: '操作', render: (r: any) => (
              <div className="flex gap-2">
                <button onClick={() => setSelectedBatch(r.id)} className="text-blue-600 text-sm hover:underline">查看详情</button>
                {r.status === 'completed' && (<>
                  <button onClick={() => updateStatusMutation.mutate({ batchId: r.id, status: 'confirmed' })}
                    className="text-green-600 text-sm hover:underline">确认</button>
                  <button onClick={() => updateStatusMutation.mutate({ batchId: r.id, status: 'ignored' })}
                    className="text-gray-500 text-sm hover:underline">忽略</button>
                </>)}
              </div>
            )},
          ]}
          data={batches.data?.items || []}
          total={batches.data?.total || 0}
          page={page}
          onPageChange={setPage}
        />
      </div>

      {selectedBatch && (
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b flex justify-between">
            <h3 className="font-semibold">批次 #{selectedBatch} 详情</h3>
            <button onClick={() => setSelectedBatch(null)} className="text-gray-500 text-sm">关闭</button>
          </div>
          <DataTable
            columns={[
              { key: 'phone', title: '手机号' },
              { key: 'primarySpaceId', title: '主库', render: (r: any) => getSpaceName(r.primarySpaceId) },
              { key: 'sourceSpaceId', title: '来源库', render: (r: any) => getSpaceName(r.sourceSpaceId) },
              { key: 'status', title: '状态' },
            ]}
            data={records.data?.items || []}
            total={records.data?.total || 0}
            page={detailPage}
            pageSize={100}
            onPageChange={setDetailPage}
          />
        </div>
      )}
    </div>
  );
}
