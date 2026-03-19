import { useState } from 'react';
import { trpc, uploadFile } from '../trpc';
import { useAuth } from '../auth';
import DataTable from '../components/DataTable';

export default function DataMatch() {
  const { isAdmin } = useAuth();
  const [targetSpaceId, setTargetSpaceId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);

  const spaces = trpc.spaces.list.useQuery();
  const history = trpc.dataMatch.history.useQuery({ page });
  const processMutation = trpc.dataMatch.process.useMutation({
    onSuccess: () => { history.refetch(); setUploading(false); },
    onError: () => setUploading(false),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { filePath, fileName } = await uploadFile(file);
      await processMutation.mutateAsync({ filePath, fileName, targetSpaceId });
    } catch (err: any) {
      alert(err.message);
      setUploading(false);
    }
    e.target.value = '';
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">数据查重</h2>

      {isAdmin && (
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">匹配空间库</label>
              <select value={targetSpaceId ?? ''} onChange={e => setTargetSpaceId(e.target.value ? Number(e.target.value) : null)}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="">全部空间库</option>
                {spaces.data?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">上传文件</label>
              <input type="file" accept=".csv,.txt" onChange={handleUpload} disabled={uploading}
                className="w-full text-sm" />
            </div>
          </div>
          {uploading && <p className="text-sm text-blue-600 mt-2">匹配处理中...</p>}
        </div>
      )}

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b"><h3 className="font-semibold">查重历史</h3></div>
        <DataTable
          columns={[
            { key: 'fileName', title: '文件名' },
            { key: 'targetSpaceId', title: '匹配库', render: (r: any) => r.targetSpaceId ? spaces.data?.find(s => s.id === r.targetSpaceId)?.name : '全部' },
            { key: 'total', title: '总条数（去重后）' },
            { key: 'uniqueMatch', title: '唯一库匹配' },
            { key: 'dupMatch', title: '重复库匹配' },
            { key: 'matchRate', title: '匹配率', render: (r: any) => `${r.matchRate.toFixed(1)}%` },
            { key: 'status', title: '状态', render: (r: any) => (
              <span className={r.status === 'completed' ? 'text-green-600' : r.status === 'failed' ? 'text-red-500' : 'text-yellow-600'}>
                {r.status === 'completed' ? '完成' : r.status === 'failed' ? '失败' : '处理中'}
              </span>
            )},
            { key: 'createdAt', title: '时间', render: (r: any) => new Date(r.createdAt).toLocaleString('zh-CN') },
          ]}
          data={history.data?.items || []}
          total={history.data?.total || 0}
          page={page}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
