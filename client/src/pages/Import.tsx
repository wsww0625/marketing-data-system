import { useState } from 'react';
import { trpc } from '../trpc';
import { uploadFile } from '../trpc';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';

export default function Import() {
  const [spaceId, setSpaceId] = useState<number>(0);
  const [channelId, setChannelId] = useState<number | undefined>();
  const [dataType, setDataType] = useState<'merchant' | 'purchase'>('merchant');
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [revertBatch, setRevertBatch] = useState<any>(null);
  const [force, setForce] = useState(false);

  const spaces = trpc.spaces.list.useQuery();
  const channels = trpc.channels.list.useQuery({ spaceId: spaceId || undefined });
  const history = trpc.import.history.useQuery({ spaceId: spaceId || undefined, page });
  const processMutation = trpc.import.process.useMutation({
    onSuccess: () => { history.refetch(); setUploading(false); },
    onError: () => setUploading(false),
  });
  const revertMutation = trpc.import.revert.useMutation({
    onSuccess: (data) => {
      if (data.preview) {
        setRevertBatch({ ...revertBatch, ...data });
      } else {
        setRevertBatch(null);
        history.refetch();
      }
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !spaceId) return;
    setUploading(true);
    try {
      const { filePath, fileName } = await uploadFile(file);
      await processMutation.mutateAsync({ filePath, fileName, spaceId, channelId, dataType });
    } catch (err: any) {
      alert(err.message);
      setUploading(false);
    }
    e.target.value = '';
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">导入去重</h2>

      {/* Upload Form */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">空间库</label>
            <select value={spaceId} onChange={e => setSpaceId(Number(e.target.value))}
              className="w-full border rounded px-3 py-2 text-sm">
              <option value={0}>请选择</option>
              {spaces.data?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">渠道</label>
            <select value={channelId || ''} onChange={e => setChannelId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full border rounded px-3 py-2 text-sm">
              <option value="">不限</option>
              {channels.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">数据类型</label>
            <select value={dataType} onChange={e => setDataType(e.target.value as any)}
              className="w-full border rounded px-3 py-2 text-sm">
              <option value="merchant">商户数据（去重）</option>
              <option value="purchase">采购数据（不去重）</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">上传文件</label>
            <input type="file" accept=".csv,.txt" onChange={handleUpload} disabled={!spaceId || uploading}
              className="w-full text-sm" />
          </div>
        </div>
        {uploading && <div className="text-sm text-blue-600">导入处理中...</div>}
      </div>

      {/* History */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b"><h3 className="font-semibold">导入历史</h3></div>
        <DataTable
          columns={[
            { key: 'fileName', title: '文件名' },
            { key: 'space', title: '空间库', render: (r: any) => r.space?.name },
            { key: 'dataType', title: '类型', render: (r: any) => r.dataType === 'merchant' ? '商户' : '采购' },
            { key: 'total', title: '总数' },
            { key: 'newCount', title: '新增' },
            { key: 'duplicateCount', title: '重复' },
            { key: 'status', title: '状态', render: (r: any) => (
              <span className={r.status === 'reverted' ? 'text-red-500' : r.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}>
                {r.status === 'completed' ? '已完成' : r.status === 'reverted' ? '已回退' : '处理中'}
              </span>
            )},
            { key: 'createdAt', title: '时间', render: (r: any) => new Date(r.createdAt).toLocaleString('zh-CN') },
            { key: 'actions', title: '操作', render: (r: any) => r.status === 'completed' && (
              <button onClick={() => { setRevertBatch(r); revertMutation.mutate({ batchId: r.id }); }}
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

      {/* Revert Modal */}
      <Modal open={!!revertBatch?.preview} onClose={() => setRevertBatch(null)} title="确认回退"
        footer={<>
          <button onClick={() => setRevertBatch(null)} className="px-4 py-2 border rounded">取消</button>
          <button onClick={() => revertMutation.mutate({ batchId: revertBatch.id, force: true })}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">确认回退</button>
        </>}>
        <p>将删除 <strong>{revertBatch?.phoneCount}</strong> 条号码和 <strong>{revertBatch?.dupCount}</strong> 条重复记录。</p>
        {revertBatch?.screenedCount > 0 && (
          <p className="text-orange-600 mt-2">其中 {revertBatch.screenedCount} 条号码已完成筛选。</p>
        )}
      </Modal>
    </div>
  );
}
