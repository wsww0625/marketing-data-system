import { useState, useRef } from 'react';
import { trpc, uploadFile } from '../trpc';
import { useAuth } from '../auth';
import DataTable from '../components/DataTable';

export default function DataMatch() {
  const { isAdmin } = useAuth();
  const [targetSpaceId, setTargetSpaceId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const spaces = trpc.spaces.list.useQuery();
  const history = trpc.dataMatch.history.useQuery({ page });
  const processMutation = trpc.dataMatch.process.useMutation({
    onSuccess: () => { history.refetch(); setUploading(false); },
    onError: () => setUploading(false),
  });

  const processFile = async (file: File) => {
    setUploading(true);
    try {
      const { filePath, fileName } = await uploadFile(file);
      await processMutation.mutateAsync({ filePath, fileName, targetSpaceId });
    } catch (err: any) {
      alert(err.message);
      setUploading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  return (
    <div>
      <h2 className="page-header">数据查重</h2>

      {isAdmin && (
        <div className="card mb-6">
          <div className="card-body">
            <div className="max-w-xs mb-5">
              <label className="form-label">匹配空间库</label>
              <select value={targetSpaceId ?? ''} onChange={e => setTargetSpaceId(e.target.value ? Number(e.target.value) : null)}
                className="form-select">
                <option value="">全部空间库</option>
                {spaces.data?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div
              className={`upload-zone ${dragActive ? 'active' : ''} ${uploading ? 'disabled' : ''}`}
              onDragOver={e => { e.preventDefault(); if (!uploading) setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={!uploading ? handleDrop : undefined}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleUpload} className="hidden" disabled={uploading} />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-blue-600 font-medium">匹配处理中...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-1">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700">点击或拖拽查重文件到此处</p>
                  <p className="text-xs text-gray-400">支持 .csv, .txt 格式</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">查重历史</div>
        <DataTable
          columns={[
            { key: 'fileName', title: '文件名' },
            { key: 'targetSpaceId', title: '匹配库', render: (r: any) => r.targetSpaceId ? spaces.data?.find(s => s.id === r.targetSpaceId)?.name : '全部' },
            { key: 'total', title: '总条数（去重后）' },
            { key: 'uniqueMatch', title: '唯一库匹配' },
            { key: 'dupMatch', title: '重复库匹配' },
            { key: 'matchRate', title: '匹配率', render: (r: any) => `${r.matchRate.toFixed(1)}%` },
            { key: 'status', title: '状态', render: (r: any) => (
              <span className={r.status === 'completed' ? 'badge-success' : r.status === 'failed' ? 'badge-error' : 'badge-warning'}>
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
