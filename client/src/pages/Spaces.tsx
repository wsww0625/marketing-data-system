import { useState } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../auth';
import Modal from '../components/Modal';

export default function Spaces() {
  const { isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const spaces = trpc.spaces.list.useQuery();
  const createMutation = trpc.spaces.create.useMutation({ onSuccess: () => { spaces.refetch(); closeModal(); } });
  const updateMutation = trpc.spaces.update.useMutation({ onSuccess: () => { spaces.refetch(); closeModal(); } });
  const deleteMutation = trpc.spaces.delete.useMutation({ onSuccess: () => spaces.refetch() });
  const setPrimaryMutation = trpc.spaces.setPrimary.useMutation({ onSuccess: () => spaces.refetch() });
  const clearPrimaryMutation = trpc.spaces.clearPrimary.useMutation({ onSuccess: () => spaces.refetch() });

  const closeModal = () => { setShowModal(false); setEditing(null); setName(''); setDescription(''); };
  const openEdit = (s: any) => { setEditing(s); setName(s.name); setDescription(s.description || ''); setShowModal(true); };

  const handleSave = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, name, description });
    } else {
      createMutation.mutate({ name, description });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">空间库管理</h2>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
            创建空间库
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {spaces.data?.map(s => (
          <div key={s.id} className="bg-white rounded-lg border p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{s.name}</h3>
                {s.isPrimary && <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded">主库</span>}
              </div>
              {s.description && <p className="text-sm text-gray-500 mt-1">{s.description}</p>}
              <div className="text-xs text-gray-400 mt-1">
                号码: {s._count.phoneNumbers.toLocaleString()} | 渠道: {s._count.channels}
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                {!s.isPrimary ? (
                  <button onClick={() => setPrimaryMutation.mutate({ id: s.id })}
                    className="text-sm text-yellow-600 hover:underline">设为主库</button>
                ) : (
                  <button onClick={() => clearPrimaryMutation.mutate()}
                    className="text-sm text-gray-500 hover:underline">取消主库</button>
                )}
                <button onClick={() => openEdit(s)} className="text-sm text-blue-600 hover:underline">编辑</button>
                <button onClick={() => { if (confirm('确认删除？')) deleteMutation.mutate({ id: s.id }); }}
                  className="text-sm text-red-600 hover:underline">删除</button>
              </div>
            )}
          </div>
        ))}
        {!spaces.data?.length && <div className="text-gray-400 text-center py-8">暂无空间库</div>}
      </div>

      <Modal open={showModal} onClose={closeModal} title={editing ? '编辑空间库' : '创建空间库'}
        footer={<>
          <button onClick={closeModal} className="px-4 py-2 border rounded">取消</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">保存</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">名称</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">描述</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" rows={3} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
