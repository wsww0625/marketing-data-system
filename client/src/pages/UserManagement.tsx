import { useState } from 'react';
import { trpc } from '../trpc';
import Modal from '../components/Modal';

export default function UserManagement() {
  const [showCreate, setShowCreate] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const users = trpc.users.list.useQuery();
  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => { users.refetch(); setShowCreate(false); setUsername(''); setPassword(''); },
  });
  const updateRoleMutation = trpc.users.updateRole.useMutation({ onSuccess: () => users.refetch() });
  const resetPasswordMutation = trpc.users.resetPassword.useMutation({
    onSuccess: () => { setResetUserId(null); setNewPassword(''); alert('密码已重置'); },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="page-header mb-0">用户管理</h2>
        <button onClick={() => setShowCreate(true)} className="btn-primary">创建用户</button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50/60">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50/60">用户名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50/60">角色</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50/60">创建时间</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50/60">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.data?.map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-500">{u.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{u.username}</td>
                  <td className="px-4 py-3">
                    <select value={u.role}
                      onChange={e => updateRoleMutation.mutate({ id: u.id, role: e.target.value as any })}
                      className="form-select py-1 text-xs w-auto">
                      <option value="admin">管理员</option>
                      <option value="user">普通用户</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleString('zh-CN')}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setResetUserId(u.id)} className="text-blue-600 text-sm hover:text-blue-700 font-medium">重置密码</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="创建用户"
        footer={<>
          <button onClick={() => setShowCreate(false)} className="btn-secondary">取消</button>
          <button onClick={() => createMutation.mutate({ username, password, role })} className="btn-primary">创建</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="form-label">用户名</label>
            <input value={username} onChange={e => setUsername(e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="form-label">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="form-label">角色</label>
            <select value={role} onChange={e => setRole(e.target.value as any)} className="form-select">
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal open={!!resetUserId} onClose={() => setResetUserId(null)} title="重置密码"
        footer={<>
          <button onClick={() => setResetUserId(null)} className="btn-secondary">取消</button>
          <button onClick={() => resetUserId && resetPasswordMutation.mutate({ id: resetUserId, password: newPassword })}
            className="btn-primary">确认重置</button>
        </>}>
        <div>
          <label className="form-label">新密码</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="form-input" />
        </div>
      </Modal>
    </div>
  );
}
