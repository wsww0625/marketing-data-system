import { useState, useEffect } from 'react';
import { trpc, getDownloadUrl } from '../trpc';
import { useAuth } from '../auth';
import DataTable from '../components/DataTable';

const ACTIVITY_LEVELS = [
  { label: '极高活跃 (0-1天)', key: 'very_high' },
  { label: '高活跃 (1-3天)', key: 'high' },
  { label: '中活跃 (3-7天)', key: 'medium' },
  { label: '低活跃 (7-14天)', key: 'low' },
  { label: '即将沉睡 (14-30天)', key: 'nearly_dormant' },
  { label: '沉睡 (30+天)', key: 'dormant' },
];

export default function AudiencePool() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<number | undefined>(undefined);
  const [phone, setPhone] = useState('');
  const [filters, setFilters] = useState({ activityLevel: '', isValid: '', channelId: 0, sendCountMin: undefined as number | undefined, sendCountMax: undefined as number | undefined });
  const [page, setPage] = useState(1);
  const [exportId, setExportId] = useState<number | null>(null);

  const spaces = trpc.spaces.list.useQuery();
  const channels = trpc.channels.list.useQuery({ spaceId: activeTab });
  const matrix = trpc.audiencePool.matrix.useQuery({ spaceId: activeTab });
  const phoneQuery = trpc.audiencePool.queryPhone.useQuery(
    { phone, spaceId: activeTab },
    { enabled: phone.length === 11 }
  );
  const list = trpc.audiencePool.list.useQuery({
    spaceId: activeTab,
    activityLevel: filters.activityLevel || undefined,
    isValid: filters.isValid || undefined,
    channelId: filters.channelId || undefined,
    sendCountMin: filters.sendCountMin,
    sendCountMax: filters.sendCountMax,
    page,
  });

  const exportMutation = trpc.audiencePool.export.useMutation({
    onSuccess: (data) => setExportId(data.exportId),
  });
  const progress = trpc.audiencePool.exportProgress.useQuery(
    { exportId: exportId! },
    { enabled: !!exportId, refetchInterval: exportId ? 2000 : false }
  );

  useEffect(() => {
    if (progress.data?.status === 'completed' || progress.data?.status === 'failed') {
      // Stop polling
    }
  }, [progress.data?.status]);

  const handleExport = (isCool: boolean) => {
    if (!activeTab) { alert('请选择空间库'); return; }
    exportMutation.mutate({
      spaceId: activeTab,
      activityLevel: filters.activityLevel || undefined,
      isValid: filters.isValid || undefined,
      channelId: filters.channelId || undefined,
      sendCountMin: filters.sendCountMin,
      sendCountMax: filters.sendCountMax,
      isCoolExport: isCool,
    });
  };

  const getActivityLabel = (days: number | null) => {
    if (days === null || days === undefined) return '未筛选';
    if (days <= 1) return '极高活跃';
    if (days <= 3) return '高活跃';
    if (days <= 7) return '中活跃';
    if (days <= 14) return '低活跃';
    if (days <= 30) return '即将沉睡';
    return '沉睡';
  };

  return (
    <div>
      <h2 className="page-header">人群池</h2>

      {/* Space Tabs */}
      <div className="flex gap-1 mb-5 flex-wrap border-b border-gray-200">
        <button onClick={() => setActiveTab(undefined)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            !activeTab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          总库
        </button>
        {spaces.data?.map(s => (
          <button key={s.id} onClick={() => setActiveTab(s.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === s.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {s.name}
          </button>
        ))}
      </div>

      {/* Phone Query */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="max-w-sm">
            <label className="form-label">单号查询</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="输入手机号"
              className="form-input" maxLength={11} />
          </div>
          {phoneQuery.data && phoneQuery.data.length > 0 && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm space-y-1">
              {phoneQuery.data.map((p: any, i: number) => (
                <div key={i} className="flex gap-4 text-gray-700">
                  <span>空间库: <strong>{p.space?.name}</strong></span>
                  <span>活跃度: <strong>{getActivityLabel(p.activityDays)}</strong></span>
                  <span>发送次数: <strong>{p.sendCount}</strong></span>
                  <span>冷却: <strong>{p.isCooled ? '是' : '否'}</strong></span>
                  <span>有效: <strong>{p.isValid ? '是' : '否'}</strong></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Distribution Matrix */}
      <div className="card mb-4">
        <div className="card-header">人群分布矩阵</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">活跃层级</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">有效</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">无效</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">冷却中</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">合计</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {matrix.data?.map((row: any) => (
                <tr key={row.key} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.level}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">{row.validCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-500">{row.invalidCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{row.cooledCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{row.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <select value={filters.activityLevel} onChange={e => { setFilters({...filters, activityLevel: e.target.value}); setPage(1); }}
              className="form-select">
              <option value="">全部活跃层级</option>
              {ACTIVITY_LEVELS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
            <select value={filters.isValid} onChange={e => { setFilters({...filters, isValid: e.target.value}); setPage(1); }}
              className="form-select">
              <option value="">全部有效性</option>
              <option value="valid">有效</option>
              <option value="invalid">无效</option>
            </select>
            <select value={filters.channelId} onChange={e => { setFilters({...filters, channelId: Number(e.target.value)}); setPage(1); }}
              className="form-select">
              <option value={0}>全部渠道</option>
              {channels.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="number" placeholder="发送次数最小" value={filters.sendCountMin ?? ''} min={0}
              onChange={e => setFilters({...filters, sendCountMin: e.target.value ? Number(e.target.value) : undefined})}
              className="form-input" />
            <input type="number" placeholder="发送次数最大" value={filters.sendCountMax ?? ''} min={0}
              onChange={e => setFilters({...filters, sendCountMax: e.target.value ? Number(e.target.value) : undefined})}
              className="form-input" />
          </div>
          {isAdmin && activeTab && (
            <div className="flex gap-2 mt-4">
              <button onClick={() => handleExport(true)} className="btn-primary">冷却导出</button>
              <button onClick={() => handleExport(false)} className="btn-secondary">全部导出（不冷却）</button>
            </div>
          )}
          {!activeTab && <p className="text-xs text-gray-400 mt-3">总库仅供查看，不支持导出</p>}
        </div>
      </div>

      {/* Export Progress */}
      {exportId && progress.data && (
        <div className="card mb-4">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">导出进度:</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${progress.data.progress}%` }} />
              </div>
              <span className="text-sm text-gray-500 font-medium">{progress.data.progress}%</span>
              {progress.data.status === 'completed' && progress.data.filePath && (
                <a href={getDownloadUrl(progress.data.filePath)} className="text-blue-600 text-sm hover:text-blue-700 font-medium">下载</a>
              )}
              {progress.data.status === 'failed' && <span className="text-red-500 text-sm">导出失败</span>}
            </div>
          </div>
        </div>
      )}

      {/* Data List */}
      <div className="card">
        <DataTable
          columns={[
            { key: 'phone', title: '手机号' },
            { key: 'space', title: '空间库', render: (r: any) => r.space?.name },
            { key: 'channel', title: '渠道', render: (r: any) => r.channel?.name || '-' },
            { key: 'activityDays', title: '活跃度', render: (r: any) => getActivityLabel(r.activityDays) },
            { key: 'isValid', title: '有效', render: (r: any) => (
              <span className={r.isValid ? 'badge-success' : 'badge-error'}>{r.isValid ? '是' : '否'}</span>
            )},
            { key: 'sendCount', title: '发送次数' },
            { key: 'isCooled', title: '冷却', render: (r: any) => (
              r.isCooled ? <span className="badge-warning">冷却中</span> : <span className="text-gray-400">-</span>
            )},
            { key: 'lastSentAt', title: '最近发送', render: (r: any) => r.lastSentAt ? new Date(r.lastSentAt).toLocaleString('zh-CN') : '-' },
          ]}
          data={list.data?.items || []}
          total={list.data?.total || 0}
          page={page}
          onPageChange={setPage}
          loading={list.isLoading}
        />
      </div>
    </div>
  );
}
