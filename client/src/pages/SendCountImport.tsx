import { useState, useRef } from 'react';
import { trpc, uploadFiles } from '../trpc';
import DataTable from '../components/DataTable';

export default function SendCountImport() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const history = trpc.sendCount.history.useQuery({ page });
  const processMutation = trpc.sendCount.process.useMutation({
    onSuccess: (data) => { setResult(data); history.refetch(); setUploading(false); },
    onError: () => setUploading(false),
  });

  const processFiles = async (fileList: File[]) => {
    setUploading(true);
    try {
      const uploaded = await uploadFiles(fileList);
      await processMutation.mutateAsync({ files: uploaded });
    } catch (err: any) {
      alert(err.message);
      setUploading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;
    await processFiles(Array.from(fileList));
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) await processFiles(files);
  };

  return (
    <div>
      <h2 className="page-header">发送次数导入</h2>

      <div className="card mb-6">
        <div className="card-body">
          <div
            className={`upload-zone ${dragActive ? 'active' : ''} ${uploading ? 'disabled' : ''}`}
            onDragOver={e => { e.preventDefault(); if (!uploading) setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={!uploading ? handleDrop : undefined}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".csv,.txt" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-blue-600 font-medium">处理中...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-1">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">点击或拖拽发送记录文件到此处</p>
                <p className="text-xs text-gray-400">每行一个手机号，支持多文件上传（.csv, .txt）</p>
              </div>
            )}
          </div>

          {result.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100">
              <p className="text-sm font-medium text-green-700 mb-1">处理完成</p>
              {result.map((r, i) => (
                <div key={i} className="text-sm text-green-600">{r.fileName}: 有效 {r.validCount}, 无效 {r.invalidCount}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">导入历史</div>
        <DataTable
          columns={[
            { key: 'fileName', title: '文件名' },
            { key: 'validCount', title: '有效条数' },
            { key: 'invalidCount', title: '无效条数' },
            { key: 'user', title: '操作人', render: (r: any) => r.user?.username },
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
