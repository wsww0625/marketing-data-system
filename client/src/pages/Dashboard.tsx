import { trpc } from '../trpc';
import { useAuth } from '../auth';
import StatsCard from '../components/StatsCard';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const { data, isLoading } = trpc.dashboard.stats.useQuery();
  const refreshMutation = trpc.dashboard.refresh.useMutation();

  if (isLoading) return <div className="text-gray-400 py-12 text-center">加载中...</div>;
  if (!data) return <div className="text-gray-400 py-12 text-center">暂无数据</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="page-header mb-0">仪表板</h2>
        <div className="flex items-center gap-3">
          {data.updatedAt && (
            <span className="text-xs text-gray-400">
              更新于 {new Date(data.updatedAt).toLocaleString('zh-CN')}
            </span>
          )}
          {isAdmin && (
            <button
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              className="btn-primary text-xs px-3 py-1.5"
            >
              {refreshMutation.isPending ? '刷新中...' : '刷新统计'}
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatsCard title="总号码数" value={data.totalPhones} color="blue" />
        <StatsCard title="有效号码" value={data.validPhones} color="green" />
        <StatsCard title="今日新增" value={data.todayNew} color="orange" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">活跃度分布</div>
          <div className="p-5">
            {data.activityDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.activityDistribution.filter((d: any) => d.count > 0)}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ label, count }: any) => `${label}: ${count}`}
                  >
                    {data.activityDistribution.map((_: any, idx: number) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">暂无数据</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">渠道号码分布</div>
          <div className="p-5">
            {data.channelDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.channelDistribution}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="号码数" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">暂无数据</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
