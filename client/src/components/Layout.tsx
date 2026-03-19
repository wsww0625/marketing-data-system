import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';

const menuGroups = [
  {
    title: '概览',
    items: [
      { path: '/', label: '仪表板', adminOnly: false },
    ],
  },
  {
    title: '数据管理',
    items: [
      { path: '/import', label: '导入去重', adminOnly: true },
      { path: '/screening', label: '活跃筛选', adminOnly: true },
      { path: '/send-count', label: '发送次数导入', adminOnly: true },
      { path: '/data-match', label: '数据查重', adminOnly: false },
    ],
  },
  {
    title: '人群与批次',
    items: [
      { path: '/audience-pool', label: '人群池', adminOnly: false },
      { path: '/batch-management', label: '批次管理', adminOnly: true },
      { path: '/duplicates', label: '重复库', adminOnly: true },
      { path: '/cross-dedup', label: '跨库去重', adminOnly: true },
    ],
  },
  {
    title: '分析报表',
    items: [
      { path: '/reports', label: '运营报表', adminOnly: false },
      { path: '/channel-analysis', label: '渠道分析', adminOnly: false },
      { path: '/send-records', label: '发送记录', adminOnly: false },
    ],
  },
  {
    title: '配置',
    items: [
      { path: '/spaces', label: '空间库管理', adminOnly: false },
      { path: '/channels', label: '渠道管理', adminOnly: false },
      { path: '/copywriting', label: '文案知识库', adminOnly: false },
    ],
  },
  {
    title: '系统',
    items: [
      { path: '/audit-logs', label: '审计日志', adminOnly: true },
      { path: '/users', label: '用户管理', adminOnly: true },
    ],
  },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-0 -ml-px' : 'w-60'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200 overflow-hidden flex-shrink-0`}>
        <div className="h-14 px-5 flex items-center border-b border-gray-100">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center mr-3 flex-shrink-0">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <h1 className="text-sm font-semibold text-gray-900 truncate">营销数据管理</h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {menuGroups.map(group => {
            const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.title} className="mb-4">
                <div className="px-2 mb-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  {group.title}
                </div>
                {visibleItems.map(item => {
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center px-2.5 py-[7px] text-[13px] rounded-md mb-0.5 transition-colors ${
                        active
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center mr-2.5 flex-shrink-0">
                <span className="text-xs font-medium text-gray-600">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-gray-700 truncate">{user?.username}</div>
                <div className="text-[11px] text-gray-400">{isAdmin ? '管理员' : '普通用户'}</div>
              </div>
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-gray-600 p-1" title="退出登录">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 flex-shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 mr-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
