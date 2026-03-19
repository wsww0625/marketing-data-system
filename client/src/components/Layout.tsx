import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';

const menuItems = [
  { path: '/', label: '仪表板', icon: '📊', adminOnly: false },
  { path: '/import', label: '导入去重', icon: '📥', adminOnly: true },
  { path: '/screening', label: '活跃筛选', icon: '🔍', adminOnly: true },
  { path: '/audience-pool', label: '人群池', icon: '👥', adminOnly: false },
  { path: '/batch-management', label: '批次管理', icon: '📦', adminOnly: true },
  { path: '/spaces', label: '空间库管理', icon: '🗄️', adminOnly: false },
  { path: '/channels', label: '渠道管理', icon: '📡', adminOnly: false },
  { path: '/reports', label: '运营报表', icon: '📈', adminOnly: false },
  { path: '/channel-analysis', label: '渠道分析', icon: '📉', adminOnly: false },
  { path: '/send-records', label: '发送记录', icon: '📤', adminOnly: false },
  { path: '/send-count', label: '发送次数导入', icon: '🔢', adminOnly: true },
  { path: '/duplicates', label: '重复库', icon: '🔁', adminOnly: true },
  { path: '/cross-dedup', label: '跨库去重', icon: '🔗', adminOnly: true },
  { path: '/data-match', label: '数据查重', icon: '🎯', adminOnly: false },
  { path: '/copywriting', label: '文案知识库', icon: '📝', adminOnly: false },
  { path: '/audit-logs', label: '审计日志', icon: '📋', adminOnly: true },
  { path: '/users', label: '用户管理', icon: '👤', adminOnly: true },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-slate-800 text-white flex flex-col transition-all duration-200`}>
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {!collapsed && <h1 className="text-base font-bold truncate">营销数据管理</h1>}
          <button onClick={() => setCollapsed(!collapsed)} className="text-slate-400 hover:text-white text-lg">
            {collapsed ? '»' : '«'}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {visibleItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-2.5 text-sm transition-colors ${
                  active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <span className="text-base">{item.icon}</span>
                {!collapsed && <span className="ml-3 truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-700">
          {!collapsed && (
            <div className="text-xs text-slate-400 mb-2 truncate">
              {user?.username} ({isAdmin ? '管理员' : '用户'})
            </div>
          )}
          <button onClick={logout} className="w-full text-sm text-slate-400 hover:text-white text-left">
            {collapsed ? '🚪' : '退出登录'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
