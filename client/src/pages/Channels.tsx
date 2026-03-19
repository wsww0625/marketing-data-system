import { useState } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../auth';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';

export default function Channels() {
  const { isAdmin } = useAuth();
  const [spaceId, setSpaceId] = useState<number>(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [modalSpaceId, setModalSpaceId] = useState<number>(0);

  const spaces = trpc.spaces.list.useQuery();
  const channels = trpc.channels.list.useQuery({ spaceId: spaceId || undefined });
  const createMutation = trpc.channels.create.useMutation({ onSuccess: () => { channels.refetch(); closeModal(); } });
  const updateMutation = trpc.channels.update.useMutation({ onSuccess: () => { channels.refetch(); closeModal(); } });
  const deleteMutation = trpc.channels.delete.useMutation({ onSuccess: () => channels.refetch() });

  const closeModal = () => { setShowModal(false); setEditing(null); setName(''); setDescription(''); setModalSpaceId(0); };
  const openEdit = (c: any) => { setEditing(c); setName(c.name); setDescription(c.description || ''); setModalSpaceId(c.spaceId); setShowModal(true); };

  const handleSave = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, name, description });
    } else {
      if (!modalSpaceId) { alert('请选择空间库'); return; }
      createMutation.mutate({ spaceId: modalSpaceId, name, description });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="page-header mb-0">渠道管理</h2>
        <div className="flex gap-2">
          <select value={spaceId} onChange={e => setSpaceId(Number(e.target.value))} className="form-select w-auto">
            <option value={0}>全部空间库</option>
            {spaces.data?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {isAdmin && (
            <button onClick={() => setShowModal(true)} className="btn-primary">创建渠道</button>
          )}
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={[
            { key: 'name', title: '渠道名称' },
            { key: 'space', title: '空间库', render: (r: any) => r.space?.name },
            { key: 'description', title: '描述', render: (r: any) => r.description || '-' },
            { key: 'count', title: '号码数', render: (r: any) => r._count?.phoneNumbers?.toLocaleString() || '0' },
            { key: 'createdAt', title: '创建时间', render: (r: any) => new Date(r.createdAt).toLocaleString('zh-CN') },
            ...(isAdmin ? [{ key: 'actions', title: '操作', render: (r: any) => (
              <div className="flex gap-3">
                <button onClick={() => openEdit(r)} className="text-blue-600 text-sm hover:text-blue-700 font-medium">编辑</button>
                <button onClick={() => { if (confirm('确认删除？')) deleteMutation.mutate({ id: r.id }); }}
                  className="text-red-600 text-sm hover:text-red-700 font-medium">删除</button>
              </div>
            )}] : []),
          ]}
          data={channels.data || []}
          total={channels.data?.length || 0}
        />
      </div>

      <Modal open={showModal} onClose={closeModal} title={editing ? '编辑渠道' : '创建渠道'}
        footer={<>
          <button onClick={closeModal} className="btn-secondary">取消</button>
          <button onClick={handleSave} className="btn-primary">保存</button>
        </>}>
        <div className="space-y-4">
          {!editing && (
            <div>
              <label className="form-label">空间库</label>
              <select value={modalSpaceId} onChange={e => setModalSpaceId(Number(e.target.value))} className="form-select">
                <option value={0}>请选择</option>
                {spaces.data?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="form-label">名称</label>
            <input value={name} onChange={e => setName(e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="form-label">描述</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="form-textarea" rows={3} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
