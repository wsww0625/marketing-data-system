import { useState } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../auth';
import StatsCard from '../components/StatsCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const { isAdmin } = useAuth();
  const [spaceId, setSpaceId] = useState<number | undefined>();
  const spaces = trpc.spaces.list.useQuery();
  const { data, isLoading } = trpc.reports.stats.useQuery({ spaceId });
  const refreshMutation = trpc.reports.refresh.useMutation();

  if (isLoading) return <div className="text-gray-400 py-12 text-center">加载中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="page-header mb-0">运营报表</h2>
        <div className="flex gap-2 items-center">
          <select value={spaceId || ''} onChange={e => setSpaceId(e.target.value ? Number(e.target.value) : undefined)}
            className="form-select w-auto">
            <option value="">全部空间库</option>
            {spaces.data?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {data?.updatedAt && <span className="text-xs text-gray-400">更新于 {new Date(data.updatedAt).toLocaleString('zh-CN')}</span>}
          {isAdmin && (
            <button onClick={() => refreshMutation.mutate({ spaceId })}
              disabled={refreshMutation.isPending}
              className="btn-primary text-xs px-3 py-1.5">
              刷新
            </button>
          )}
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <StatsCard title="号码总量" value={data.total} color="blue" />
            <StatsCard title="有效号码" value={data.validCount} color="green" />
            <StatsCard title="无效号码" value={data.invalidCount} color="red" />
            <StatsCard title="发送覆盖率" value={`${data.sendCoverage}%`} color="purple" />
            <StatsCard title="平均发送次数" value={data.avgSendCount} color="orange" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card">
              <div className="card-header">活跃度分布</div>
              <div className="p-5">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={data.activityDistribution.filter((d: any) => d.count > 0)} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={100}
                      label={({ label, pct }: any) => `${label}: ${pct}%`}>
                      {data.activityDistribution.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div className="card-header">发送次数分布</div>
              <div className="p-5">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.sendDistribution}>
                    <XAxis dataKey="label" /><YAxis /><Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" name="号码数" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {data.spaceBreakdown?.length > 0 && (
            <div className="card">
              <div className="card-header">空间库统计</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50/60 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">空间库</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">总量</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">有效</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">无效</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.spaceBreakdown.map((s: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-900">{s.spaceName}</td>
                        <td className="px-4 py-3 text-right">{s.total.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-green-600">{s.validCount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-red-500">{s.invalidCount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
