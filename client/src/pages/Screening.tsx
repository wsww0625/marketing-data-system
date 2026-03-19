import { useState } from 'react';
import { trpc, uploadFile } from '../trpc';
import DataTable from '../components/DataTable';

export default function Screening() {
  const [spaceId, setSpaceId] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);

  const spaces = trpc.spaces.list.useQuery();
  const history = trpc.screening.history.useQuery({ spaceId: spaceId || undefined, page });
  const processMutation = trpc.screening.process.useMutation({
    onSuccess: () => { history.refetch(); setUploading(false); },
    onError: () => setUploading(false),
  });
  const revertMutation = trpc.screening.revert.useMutation({
    onSuccess: () => history.refetch(),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !spaceId) return;
    setUploading(true);
    try {
      const { filePath, fileName } = await uploadFile(file);
      await processMutation.mutateAsync({ filePath, fileName, spaceId });
    } catch (err: any) {
      alert(err.message);
      setUploading(false);
    }
    e.target.value = '';
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">活跃筛选</h2>

      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">空间库</label>
            <select value={spaceId} onChange={e => setSpaceId(Number(e.target.value))}
              className="w-full border rounded px-3 py-2 text-sm">
              <option value={0}>请选择</option>
              {spaces.data?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">筛选结果文件（号码,活跃天数）</label>
            <input type="file" accept=".csv,.txt" onChange={handleUpload} disabled={!spaceId || uploading}
              className="w-full text-sm" />
          </div>
        </div>
        {uploading && <div className="text-sm text-blue-600 mt-2">筛选处理中...</div>}
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b"><h3 className="font-semibold">筛选历史</h3></div>
        <DataTable
          columns={[
            { key: 'fileName', title: '文件名' },
            { key: 'space', title: '空间库', render: (r: any) => r.space?.name },
            { key: 'total', title: '总数' },
            { key: 'updatedCount', title: '更新数' },
            { key: 'status', title: '状态', render: (r: any) => (
              <span className={r.status === 'reverted' ? 'text-red-500' : 'text-green-600'}>
                {r.status === 'completed' ? '已完成' : r.status === 'reverted' ? '已回退' : '处理中'}
              </span>
            )},
            { key: 'createdAt', title: '时间', render: (r: any) => new Date(r.createdAt).toLocaleString('zh-CN') },
            { key: 'actions', title: '操作', render: (r: any) => r.status === 'completed' && (
              <button onClick={() => { if (confirm('确认回退？')) revertMutation.mutate({ batchId: r.id }); }}
                className="text-red-600 text-sm hover:underline">回退</button>
            )},
          ]}
          data={history.data?.items || []}
          total={history.data?.total || 0}
          page={page}
          onPageChange={setPage}
          loading={history.isLoading}
        />
      </div>
    </div>
  );
}
