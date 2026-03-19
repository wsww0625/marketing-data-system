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
      <h2 className="text-xl font-bold mb-6">人群池</h2>

      {/* Space Tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        <button onClick={() => setActiveTab(undefined)}
          className={`px-4 py-2 text-sm rounded-t ${!activeTab ? 'bg-white border-b-2 border-blue-600 font-medium' : 'bg-gray-100 text-gray-600'}`}>
          总库
        </button>
        {spaces.data?.map(s => (
          <button key={s.id} onClick={() => setActiveTab(s.id)}
            className={`px-4 py-2 text-sm rounded-t ${activeTab === s.id ? 'bg-white border-b-2 border-blue-600 font-medium' : 'bg-gray-100 text-gray-600'}`}>
            {s.name} {s.isPrimary && <span className="text-yellow-500 ml-1">★</span>}
          </button>
        ))}
      </div>

      {/* Phone Query */}
      <div className="bg-white rounded-lg border p-4 mb-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">单号查询</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="输入手机号"
              className="w-full border rounded px-3 py-2 text-sm" maxLength={11} />
          </div>
        </div>
        {phoneQuery.data && phoneQuery.data.length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
            {phoneQuery.data.map((p: any, i: number) => (
              <div key={i} className="flex gap-4 py-1">
                <span>空间库: {p.space?.name}</span>
                <span>活跃度: {getActivityLabel(p.activityDays)}</span>
                <span>发送次数: {p.sendCount}</span>
                <span>冷却: {p.isCooled ? '是' : '否'}</span>
                <span>有效: {p.isValid ? '是' : '否'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Distribution Matrix */}
      <div className="bg-white rounded-lg border p-4 mb-4">
        <h3 className="font-semibold mb-3">人群分布矩阵</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left">活跃层级</th>
                <th className="px-3 py-2 text-right">有效</th>
                <th className="px-3 py-2 text-right">无效</th>
                <th className="px-3 py-2 text-right">冷却中</th>
                <th className="px-3 py-2 text-right">合计</th>
              </tr>
            </thead>
            <tbody>
              {matrix.data?.map((row: any) => (
                <tr key={row.key} className="border-t">
                  <td className="px-3 py-2 font-medium">{row.level}</td>
                  <td className="px-3 py-2 text-right text-green-600">{row.validCount.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-red-500">{row.invalidCount.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-yellow-600">{row.cooledCount.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-medium">{row.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select value={filters.activityLevel} onChange={e => { setFilters({...filters, activityLevel: e.target.value}); setPage(1); }}
            className="border rounded px-2 py-1.5 text-sm">
            <option value="">全部活跃层级</option>
            {ACTIVITY_LEVELS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
          <select value={filters.isValid} onChange={e => { setFilters({...filters, isValid: e.target.value}); setPage(1); }}
            className="border rounded px-2 py-1.5 text-sm">
            <option value="">全部有效性</option>
            <option value="valid">有效</option>
            <option value="invalid">无效</option>
          </select>
          <select value={filters.channelId} onChange={e => { setFilters({...filters, channelId: Number(e.target.value)}); setPage(1); }}
            className="border rounded px-2 py-1.5 text-sm">
            <option value={0}>全部渠道</option>
            {channels.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="number" placeholder="发送次数最小" value={filters.sendCountMin ?? ''} min={0}
            onChange={e => setFilters({...filters, sendCountMin: e.target.value ? Number(e.target.value) : undefined})}
            className="border rounded px-2 py-1.5 text-sm" />
          <input type="number" placeholder="发送次数最大" value={filters.sendCountMax ?? ''} min={0}
            onChange={e => setFilters({...filters, sendCountMax: e.target.value ? Number(e.target.value) : undefined})}
            className="border rounded px-2 py-1.5 text-sm" />
        </div>
        {isAdmin && activeTab && (
          <div className="flex gap-2 mt-3">
            <button onClick={() => handleExport(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">冷却导出</button>
            <button onClick={() => handleExport(false)}
              className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">全部导出（不冷却）</button>
          </div>
        )}
        {!activeTab && <p className="text-xs text-gray-400 mt-2">总库仅供查看，不支持导出</p>}
      </div>

      {/* Export Progress */}
      {exportId && progress.data && (
        <div className="bg-white rounded-lg border p-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">导出进度:</span>
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${progress.data.progress}%` }} />
            </div>
            <span className="text-sm">{progress.data.progress}%</span>
            {progress.data.status === 'completed' && progress.data.filePath && (
              <a href={getDownloadUrl(progress.data.filePath)} className="text-blue-600 text-sm hover:underline">下载</a>
            )}
            {progress.data.status === 'failed' && <span className="text-red-500 text-sm">导出失败</span>}
          </div>
        </div>
      )}

      {/* Data List */}
      <div className="bg-white rounded-lg border">
        <DataTable
          columns={[
            { key: 'phone', title: '手机号' },
            { key: 'space', title: '空间库', render: (r: any) => r.space?.name },
            { key: 'channel', title: '渠道', render: (r: any) => r.channel?.name || '-' },
            { key: 'activityDays', title: '活跃度', render: (r: any) => getActivityLabel(r.activityDays) },
            { key: 'isValid', title: '有效', render: (r: any) => r.isValid ? '是' : '否' },
            { key: 'sendCount', title: '发送次数' },
            { key: 'isCooled', title: '冷却', render: (r: any) => r.isCooled ? '是' : '否' },
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
