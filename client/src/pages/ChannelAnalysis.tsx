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
        <h2 className="page-header mb-0">渠道分析</h2>
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

      {isLoading ? <div className="text-gray-400 py-12 text-center">加载中...</div> : (
        <div className="space-y-6">
          {data?.channels?.length > 0 ? (
            <>
              <div className="card">
                <div className="card-header">渠道号码总量对比</div>
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.channels}>
                      <XAxis dataKey="channelName" /><YAxis /><Tooltip />
                      <Bar dataKey="total" fill="#3b82f6" name="号码总量" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {data.channels.map((ch: any) => (
                <div key={ch.channelId} className="card">
                  <div className="card-header">
                    {ch.channelName} <span className="text-xs font-normal text-gray-400 ml-1">({ch.spaceName})</span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                      <div className="bg-blue-50 rounded-lg p-3.5">
                        <div className="text-lg font-semibold text-blue-600">{ch.total.toLocaleString()}</div>
                        <div className="text-xs text-gray-500 mt-0.5">号码总量</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3.5">
                        <div className="text-lg font-semibold text-green-600">{ch.validRate}%</div>
                        <div className="text-xs text-gray-500 mt-0.5">有效率</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3.5">
                        <div className="text-lg font-semibold text-purple-600">{ch.avgSendCount}</div>
                        <div className="text-xs text-gray-500 mt-0.5">平均发送次数</div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3.5">
                        <div className="text-lg font-semibold text-orange-600">{ch.sendCoverage}%</div>
                        <div className="text-xs text-gray-500 mt-0.5">发送覆盖率</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">活跃度分布</div>
                        <div className="flex gap-2 flex-wrap">
                          {ch.activityDistribution.map((a: any) => (
                            <span key={a.label} className="badge-default">{a.label}: {a.count}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">发送次数分布</div>
                        <div className="flex gap-2 flex-wrap">
                          {ch.sendDistribution.map((s: any) => (
                            <span key={s.label} className="badge-default">{s.label}: {s.count}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="text-gray-400 text-center py-12">暂无渠道数据</div>
          )}
        </div>
      )}
    </div>
  );
}
