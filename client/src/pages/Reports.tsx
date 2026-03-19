import { useState, useRef } from 'react';
import { trpc, getDownloadUrl, uploadFile } from '../trpc';
import Modal from '../components/Modal';

const defaultForm = {
  taskDate: '',
  packageName: '',
  dataSourceSpaceId: null as number | null,
  channelId: null as number | null,
  startSendDate: '',
  sendPlatform: '',
  sendChannel: '',
  sendCount: 0,
  copywritingId: null as number | null,
  clickCount: 0,
  clickRate: 0,
  readRate: 0,
  registerCount: 0,
  rechargeCount: 0,
  rechargeAmount: 0,
  withdrawCount: 0,
  withdrawAmount: 0,
  rechargeDiff: 0,
  userValue: 0,
  payCost: 0,
  rechargeROI: 0,
  balanceROI: 0,
};

function formatDate(d: string | Date) {
  const dt = new Date(d);
  return dt.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Reports() {
  const [filters, setFilters] = useState({ spaceId: undefined as number | undefined, channelId: undefined as number | undefined, startDate: '', endDate: '' });
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(defaultForm);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const spaces = trpc.spaces.list.useQuery();
  const channels = trpc.channels.list.useQuery({ spaceId: filters.spaceId });
  const copywritingCodes = trpc.copywriting.codes.useQuery();
  const list = trpc.reports.list.useQuery({
    spaceId: filters.spaceId,
    channelId: filters.channelId,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    page,
  });

  const createMutation = trpc.reports.create.useMutation({ onSuccess: () => { list.refetch(); closeModal(); } });
  const updateMutation = trpc.reports.update.useMutation({ onSuccess: () => { list.refetch(); closeModal(); } });
  const deleteMutation = trpc.reports.delete.useMutation({ onSuccess: () => list.refetch() });
  const batchImportMutation = trpc.reports.batchImport.useMutation({
    onSuccess: (data) => {
      list.refetch();
      setImporting(false);
      alert(`导入完成：成功 ${data.imported} 条，失败 ${data.failed} 条`);
    },
    onError: () => setImporting(false),
  });
  const exportMutation = trpc.reports.export.useMutation({
    onSuccess: (data) => {
      if (data.fileName) window.open(getDownloadUrl(data.fileName));
    },
  });

  const closeModal = () => { setShowModal(false); setEditing(null); setForm(defaultForm); };

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      taskDate: new Date(r.taskDate).toISOString().split('T')[0],
      packageName: r.packageName,
      dataSourceSpaceId: r.dataSourceSpaceId,
      channelId: r.channelId,
      startSendDate: new Date(r.startSendDate).toISOString().split('T')[0],
      sendPlatform: r.sendPlatform,
      sendChannel: r.sendChannel,
      sendCount: r.sendCount,
      copywritingId: r.copywritingId,
      clickCount: r.clickCount,
      clickRate: r.clickRate,
      readRate: r.readRate,
      registerCount: r.registerCount,
      rechargeCount: r.rechargeCount,
      rechargeAmount: r.rechargeAmount,
      withdrawCount: r.withdrawCount,
      withdrawAmount: r.withdrawAmount,
      rechargeDiff: r.rechargeDiff,
      userValue: r.userValue,
      payCost: r.payCost,
      rechargeROI: r.rechargeROI,
      balanceROI: r.balanceROI,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    const data = {
      ...form,
      dataSourceSpaceId: form.dataSourceSpaceId || null,
      channelId: form.channelId || null,
      copywritingId: form.copywritingId || null,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const { filePath, fileName } = await uploadFile(file);
      await batchImportMutation.mutateAsync({ filePath, fileName });
    } catch (err: any) {
      alert(err.message);
      setImporting(false);
    }
    e.target.value = '';
  };

  const handleExport = () => {
    exportMutation.mutate({
      spaceId: filters.spaceId,
      channelId: filters.channelId,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    });
  };

  const handleReset = () => {
    setFilters({ spaceId: undefined, channelId: undefined, startDate: '', endDate: '' });
    setPage(1);
  };

  const setField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="page-header mb-1">运营报表</h2>
          <p className="text-sm text-gray-500">记录和查询各任务的发送效果与转化数据</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} disabled={exportMutation.isPending} className="btn-secondary">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            导出 Excel
          </button>
          <input ref={importRef} type="file" accept=".csv,.txt,.xlsx" onChange={handleImport} className="hidden" />
          <button onClick={() => importRef.current?.click()} disabled={importing} className="btn-secondary">
            {importing ? '导入中...' : '批量导入'}
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" /></svg>
            新建记录
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="text-sm font-medium text-gray-700 mb-3">查询条件</div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="form-label">空间库</label>
              <select value={filters.spaceId || ''} onChange={e => { setFilters({ ...filters, spaceId: e.target.value ? Number(e.target.value) : undefined }); setPage(1); }}
                className="form-select w-auto min-w-[140px]">
                <option value="">全部 (含全空间)</option>
                {spaces.data?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">渠道</label>
              <select value={filters.channelId || ''} onChange={e => { setFilters({ ...filters, channelId: e.target.value ? Number(e.target.value) : undefined }); setPage(1); }}
                className="form-select w-auto min-w-[120px]">
                <option value="">全部</option>
                {channels.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">发送日期起</label>
              <input type="date" value={filters.startDate} onChange={e => { setFilters({ ...filters, startDate: e.target.value }); setPage(1); }}
                className="form-input w-auto" />
            </div>
            <div>
              <label className="form-label">发送日期止</label>
              <input type="date" value={filters.endDate} onChange={e => { setFilters({ ...filters, endDate: e.target.value }); setPage(1); }}
                className="form-input w-auto" />
            </div>
            <button onClick={handleReset} className="btn-secondary">重置</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="px-5 py-3 border-b border-gray-100 text-sm text-gray-500">
          共 {list.data?.total || 0} 条记录
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100">
                {['任务编号','提交任务日期','包名','数据来源空间库','开始发送日期','发送平台','发送通道','发送条数','知识库文案编号','点击数','点击率','已读率','注册人数','充值人数','充值金额','提现人数','提现金额','充提差','用户价值','付费成本','充值ROI','收支ROI','操作'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.isLoading ? (
                <tr><td colSpan={23} className="px-4 py-12 text-center text-gray-400">加载中...</td></tr>
              ) : !list.data?.items.length ? (
                <tr><td colSpan={23} className="px-4 py-12 text-center text-gray-400">暂无数据</td></tr>
              ) : (
                list.data.items.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2.5 text-gray-900 font-medium">{r.id}</td>
                    <td className="px-3 py-2.5">{formatDate(r.taskDate)}</td>
                    <td className="px-3 py-2.5 text-blue-600 font-medium">{r.packageName}</td>
                    <td className="px-3 py-2.5">{r.dataSourceSpace?.name || '—'}</td>
                    <td className="px-3 py-2.5">{formatDate(r.startSendDate)}</td>
                    <td className="px-3 py-2.5">{r.sendPlatform}</td>
                    <td className="px-3 py-2.5">{r.sendChannel}</td>
                    <td className="px-3 py-2.5">{r.sendCount.toLocaleString()}</td>
                    <td className="px-3 py-2.5">{r.copywriting?.code || '/'}</td>
                    <td className="px-3 py-2.5">{r.clickCount.toLocaleString()}</td>
                    <td className="px-3 py-2.5">{r.clickRate}%</td>
                    <td className="px-3 py-2.5">{r.readRate ? `${r.readRate}%` : '—'}</td>
                    <td className="px-3 py-2.5">{r.registerCount.toLocaleString()}</td>
                    <td className="px-3 py-2.5">{r.rechargeCount}</td>
                    <td className="px-3 py-2.5">{r.rechargeAmount.toFixed(2)}</td>
                    <td className="px-3 py-2.5">{r.withdrawCount}</td>
                    <td className="px-3 py-2.5">{r.withdrawAmount.toFixed(2)}</td>
                    <td className="px-3 py-2.5">{r.rechargeDiff.toFixed(2)}</td>
                    <td className="px-3 py-2.5">{r.userValue.toFixed(2)}</td>
                    <td className="px-3 py-2.5">{r.payCost.toFixed(2)}</td>
                    <td className="px-3 py-2.5">{r.rechargeROI}%</td>
                    <td className="px-3 py-2.5">{r.balanceROI}%</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(r)} className="text-blue-600 hover:text-blue-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>
                        </button>
                        <button onClick={() => { if (confirm('确认删除？')) deleteMutation.mutate({ id: r.id }); }} className="text-red-500 hover:text-red-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {(list.data?.total || 0) > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">共 {list.data?.total} 条</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50">上一页</button>
              <span className="px-3 py-1.5 text-sm text-gray-500">{page} / {Math.ceil((list.data?.total || 0) / 20)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil((list.data?.total || 0) / 20)}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50">下一页</button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={closeModal} title={editing ? '编辑记录' : '新建记录'} footer={<>
        <button onClick={closeModal} className="btn-secondary">取消</button>
        <button onClick={handleSave} className="btn-primary">保存</button>
      </>}>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">提交任务日期</label>
              <input type="date" value={form.taskDate} onChange={e => setField('taskDate', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">包名</label>
              <input value={form.packageName} onChange={e => setField('packageName', e.target.value)} className="form-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">数据来源空间库</label>
              <select value={form.dataSourceSpaceId || ''} onChange={e => setField('dataSourceSpaceId', e.target.value ? Number(e.target.value) : null)}
                className="form-select">
                <option value="">无</option>
                {spaces.data?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">渠道</label>
              <select value={form.channelId || ''} onChange={e => setField('channelId', e.target.value ? Number(e.target.value) : null)}
                className="form-select">
                <option value="">无</option>
                {channels.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">开始发送日期</label>
              <input type="date" value={form.startSendDate} onChange={e => setField('startSendDate', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">发送平台</label>
              <input value={form.sendPlatform} onChange={e => setField('sendPlatform', e.target.value)} className="form-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">发送通道</label>
              <input value={form.sendChannel} onChange={e => setField('sendChannel', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">发送条数</label>
              <input type="number" value={form.sendCount} onChange={e => setField('sendCount', Number(e.target.value))} className="form-input" />
            </div>
          </div>
          <div>
            <label className="form-label">知识库文案编号</label>
            <select value={form.copywritingId || ''} onChange={e => setField('copywritingId', e.target.value ? Number(e.target.value) : null)}
              className="form-select">
              <option value="">无</option>
              {copywritingCodes.data?.map((c: any) => <option key={c.id} value={c.id}>{c.code}</option>)}
            </select>
          </div>
          <div className="border-t border-gray-100 pt-3 mt-3">
            <div className="text-xs font-medium text-gray-400 uppercase mb-2">转化数据</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">点击数</label>
              <input type="number" value={form.clickCount} onChange={e => setField('clickCount', Number(e.target.value))} className="form-input" />
            </div>
            <div>
              <label className="form-label">点击率 (%)</label>
              <input type="number" step="0.01" value={form.clickRate} onChange={e => setField('clickRate', Number(e.target.value))} className="form-input" />
            </div>
            <div>
              <label className="form-label">已读率 (%)</label>
              <input type="number" step="0.01" value={form.readRate} onChange={e => setField('readRate', Number(e.target.value))} className="form-input" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">注册人数</label>
              <input type="number" value={form.registerCount} onChange={e => setField('registerCount', Number(e.target.value))} className="form-input" />
            </div>
            <div>
              <label className="form-label">充值人数</label>
              <input type="number" value={form.rechargeCount} onChange={e => setField('rechargeCount', Number(e.target.value))} className="form-input" />
            </div>
            <div>
              <label className="form-label">充值金额</label>
              <input type="number" step="0.01" value={form.rechargeAmount} onChange={e => setField('rechargeAmount', Number(e.target.value))} className="form-input" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">提现人数</label>
              <input type="number" value={form.withdrawCount} onChange={e => setField('withdrawCount', Number(e.target.value))} className="form-input" />
            </div>
            <div>
              <label className="form-label">提现金额</label>
              <input type="number" step="0.01" value={form.withdrawAmount} onChange={e => setField('withdrawAmount', Number(e.target.value))} className="form-input" />
            </div>
            <div>
              <label className="form-label">充提差</label>
              <input type="number" step="0.01" value={form.rechargeDiff} onChange={e => setField('rechargeDiff', Number(e.target.value))} className="form-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">用户价值</label>
              <input type="number" step="0.01" value={form.userValue} onChange={e => setField('userValue', Number(e.target.value))} className="form-input" />
            </div>
            <div>
              <label className="form-label">付费成本</label>
              <input type="number" step="0.01" value={form.payCost} onChange={e => setField('payCost', Number(e.target.value))} className="form-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">充值ROI (%)</label>
              <input type="number" step="0.01" value={form.rechargeROI} onChange={e => setField('rechargeROI', Number(e.target.value))} className="form-input" />
            </div>
            <div>
              <label className="form-label">收支ROI (%)</label>
              <input type="number" step="0.01" value={form.balanceROI} onChange={e => setField('balanceROI', Number(e.target.value))} className="form-input" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
