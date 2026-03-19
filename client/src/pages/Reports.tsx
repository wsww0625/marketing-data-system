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

  if (isLoading) return <div className="text-gray-400">加载中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">运营报表</h2>
        <div className="flex gap-2 items-center">
          <select value={spaceId || ''} onChange={e => setSpaceId(e.target.value ? Number(e.target.value) : undefined)}
            className="border rounded px-3 py-2 text-sm">
            <option value="">全部空间库</option>
            {spaces.data?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {data?.updatedAt && <span className="text-xs text-gray-400">更新于 {new Date(data.updatedAt).toLocaleString('zh-CN')}</span>}
          {isAdmin && (
            <button onClick={() => refreshMutation.mutate({ spaceId })}
              disabled={refreshMutation.isPending}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
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
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-4">活跃度分布</h3>
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
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-4">发送次数分布</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.sendDistribution}>
                  <XAxis dataKey="label" /><YAxis /><Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" name="号码数" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {data.spaceBreakdown?.length > 0 && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-3">空间库统计</h3>
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b">
                  <th className="px-4 py-2 text-left">空间库</th>
                  <th className="px-4 py-2 text-right">总量</th>
                  <th className="px-4 py-2 text-right">有效</th>
                  <th className="px-4 py-2 text-right">无效</th>
                </tr></thead>
                <tbody>
                  {data.spaceBreakdown.map((s: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2">{s.spaceName}</td>
                      <td className="px-4 py-2 text-right">{s.total.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-green-600">{s.validCount.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-red-500">{s.invalidCount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
