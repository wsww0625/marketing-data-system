import { useState } from 'react';
import { trpc, uploadFiles } from '../trpc';
import DataTable from '../components/DataTable';

export default function SendCountImport() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any[]>([]);
  const [page, setPage] = useState(1);

  const history = trpc.sendCount.history.useQuery({ page });
  const processMutation = trpc.sendCount.process.useMutation({
    onSuccess: (data) => { setResult(data); history.refetch(); setUploading(false); },
    onError: () => setUploading(false),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;
    setUploading(true);
    try {
      const files = Array.from(fileList);
      const uploaded = await uploadFiles(files);
      await processMutation.mutateAsync({ files: uploaded });
    } catch (err: any) {
      alert(err.message);
      setUploading(false);
    }
    e.target.value = '';
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">发送次数导入</h2>

      <div className="bg-white rounded-lg border p-4 mb-6">
        <label className="block text-sm font-medium mb-1">上传发送记录文件（每行一个手机号，支持多文件）</label>
        <input type="file" accept=".csv,.txt" multiple onChange={handleUpload} disabled={uploading}
          className="text-sm" />
        {uploading && <p className="text-sm text-blue-600 mt-2">处理中...</p>}
        {result.length > 0 && (
          <div className="mt-3 p-3 bg-green-50 rounded text-sm">
            {result.map((r, i) => (
              <div key={i}>{r.fileName}: 有效 {r.validCount}, 无效 {r.invalidCount}</div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b"><h3 className="font-semibold">导入历史</h3></div>
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
