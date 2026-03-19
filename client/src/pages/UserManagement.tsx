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
        <h2 className="text-xl font-bold">用户管理</h2>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
          创建用户
        </button>
      </div>

      <div className="bg-white rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">用户名</th>
              <th className="px-4 py-3 text-left">角色</th>
              <th className="px-4 py-3 text-left">创建时间</th>
              <th className="px-4 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.data?.map((u: any) => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{u.id}</td>
                <td className="px-4 py-3 font-medium">{u.username}</td>
                <td className="px-4 py-3">
                  <select value={u.role}
                    onChange={e => updateRoleMutation.mutate({ id: u.id, role: e.target.value as any })}
                    className="border rounded px-2 py-1 text-sm">
                    <option value="admin">管理员</option>
                    <option value="user">普通用户</option>
                  </select>
                </td>
                <td className="px-4 py-3">{new Date(u.createdAt).toLocaleString('zh-CN')}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setResetUserId(u.id)} className="text-blue-600 text-sm hover:underline">重置密码</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="创建用户"
        footer={<>
          <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded">取消</button>
          <button onClick={() => createMutation.mutate({ username, password, role })}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">创建</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">用户名</label>
            <input value={username} onChange={e => setUsername(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">角色</label>
            <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!resetUserId} onClose={() => setResetUserId(null)} title="重置密码"
        footer={<>
          <button onClick={() => setResetUserId(null)} className="px-4 py-2 border rounded">取消</button>
          <button onClick={() => resetUserId && resetPasswordMutation.mutate({ id: resetUserId, password: newPassword })}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">确认重置</button>
        </>}>
        <div>
          <label className="block text-sm font-medium mb-1">新密码</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm" />
        </div>
      </Modal>
    </div>
  );
}
