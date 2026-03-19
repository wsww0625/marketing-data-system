import { useState, useRef } from 'react';
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
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const processFile = async (file: File) => {
    if (!spaceId) { alert('请先选择空间库'); return; }
    setUploading(true);
    try {
      const { filePath, fileName } = await uploadFile(file);
      await processMutation.mutateAsync({ filePath, fileName, spaceId, channelId, dataType });
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

  const isReady = !!spaceId && !uploading;

  return (
    <div>
      <h2 className="page-header">导入去重</h2>

      <div className="card mb-6">
        <div className="card-body">
          {/* Options row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="form-label">空间库</label>
              <select value={spaceId} onChange={e => setSpaceId(Number(e.target.value))}
                className="form-select">
                <option value={0}>请选择空间库</option>
                {spaces.data?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">渠道</label>
              <select value={channelId || ''} onChange={e => setChannelId(e.target.value ? Number(e.target.value) : undefined)}
                className="form-select">
                <option value="">不限</option>
                {channels.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">数据类型</label>
              <select value={dataType} onChange={e => setDataType(e.target.value as any)}
                className="form-select">
                <option value="merchant">商户数据（去重）</option>
                <option value="purchase">采购数据（不去重）</option>
              </select>
            </div>
          </div>

          {/* Upload zone */}
          <div
            className={`upload-zone ${dragActive ? 'active' : ''} ${!isReady ? 'disabled' : ''}`}
            onDragOver={e => { e.preventDefault(); if (isReady) setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={isReady ? handleDrop : undefined}
            onClick={() => isReady && fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleUpload} className="hidden" disabled={!isReady} />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-blue-600 font-medium">导入处理中...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-1">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">点击或拖拽文件到此处上传</p>
                <p className="text-xs text-gray-400">支持 .csv, .txt 格式</p>
                {!spaceId && <p className="text-xs text-amber-500 mt-1">请先选择空间库</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="card">
        <div className="card-header">导入历史</div>
        <DataTable
          columns={[
            { key: 'fileName', title: '文件名' },
            { key: 'space', title: '空间库', render: (r: any) => r.space?.name },
            { key: 'dataType', title: '类型', render: (r: any) => r.dataType === 'merchant' ? '商户' : '采购' },
            { key: 'total', title: '总数' },
            { key: 'newCount', title: '新增' },
            { key: 'duplicateCount', title: '重复' },
            { key: 'status', title: '状态', render: (r: any) => (
              <span className={r.status === 'reverted' ? 'badge-error' : r.status === 'completed' ? 'badge-success' : 'badge-warning'}>
                {r.status === 'completed' ? '已完成' : r.status === 'reverted' ? '已回退' : '处理中'}
              </span>
            )},
            { key: 'createdAt', title: '时间', render: (r: any) => new Date(r.createdAt).toLocaleString('zh-CN') },
            { key: 'actions', title: '操作', render: (r: any) => r.status === 'completed' && (
              <button onClick={() => { setRevertBatch(r); revertMutation.mutate({ batchId: r.id }); }}
                className="text-red-600 text-sm hover:text-red-700 font-medium">回退</button>
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
          <button onClick={() => setRevertBatch(null)} className="btn-secondary">取消</button>
          <button onClick={() => revertMutation.mutate({ batchId: revertBatch.id, force: true })}
            className="btn-danger">确认回退</button>
        </>}>
        <p className="text-sm text-gray-700">将删除 <strong>{revertBatch?.phoneCount}</strong> 条号码和 <strong>{revertBatch?.dupCount}</strong> 条重复记录。</p>
        {revertBatch?.screenedCount > 0 && (
          <p className="text-sm text-amber-600 mt-2">其中 {revertBatch.screenedCount} 条号码已完成筛选。</p>
        )}
      </Modal>
    </div>
  );
}
