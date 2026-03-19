import { useState } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../auth';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ChannelAnalysis() {
  const { isAdmin } = useAuth();
  const [spaceId, setSpaceId] = useState<number | undefined>();
  const spaces = trpc.spaces.list.useQuery();
  const { data, isLoading } = trpc.channelAnalysis.stats.useQuery({ spaceId });
  const refreshMutation = trpc.channelAnalysis.refresh.useMutation();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">渠道分析</h2>
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

      {isLoading ? <div className="text-gray-400">加载中...</div> : (
        <div className="space-y-6">
          {data?.channels?.length > 0 ? (
            <>
              {/* Overview Chart */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-4">渠道号码总量对比</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.channels}>
                    <XAxis dataKey="channelName" /><YAxis /><Tooltip />
                    <Bar dataKey="total" fill="#3b82f6" name="号码总量" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Channel Details */}
              {data.channels.map((ch: any) => (
                <div key={ch.channelId} className="bg-white rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">{ch.channelName} <span className="text-sm font-normal text-gray-400">({ch.spaceName})</span></h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 text-sm">
                    <div className="bg-blue-50 p-3 rounded"><div className="text-blue-600 font-medium">{ch.total.toLocaleString()}</div><div className="text-xs text-gray-500">号码总量</div></div>
                    <div className="bg-green-50 p-3 rounded"><div className="text-green-600 font-medium">{ch.validRate}%</div><div className="text-xs text-gray-500">有效率</div></div>
                    <div className="bg-purple-50 p-3 rounded"><div className="text-purple-600 font-medium">{ch.avgSendCount}</div><div className="text-xs text-gray-500">平均发送次数</div></div>
                    <div className="bg-orange-50 p-3 rounded"><div className="text-orange-600 font-medium">{ch.sendCoverage}%</div><div className="text-xs text-gray-500">发送覆盖率</div></div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-500 mb-1">发送次数分布</div>
                      {ch.sendDistribution.map((s: any) => (
                        <div key={s.label} className="text-xs">{s.label}: {s.count}</div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">活跃度分布</div>
                    <div className="flex gap-2 flex-wrap">
                      {ch.activityDistribution.map((a: any) => (
                        <span key={a.label} className="text-xs bg-gray-100 px-2 py-1 rounded">{a.label}: {a.count}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="text-gray-400 text-center py-8">暂无渠道数据</div>
          )}
        </div>
      )}
    </div>
  );
}
