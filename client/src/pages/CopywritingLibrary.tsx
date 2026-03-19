import { useState } from 'react';
import { trpc } from '../trpc';
import Modal from '../components/Modal';

export default function CopywritingLibrary() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [cat, setCat] = useState('');

  const list = trpc.copywriting.list.useQuery({ search: search || undefined, category: category || undefined, page });
  const categories = trpc.copywriting.categories.useQuery();
  const createMutation = trpc.copywriting.create.useMutation({ onSuccess: () => { list.refetch(); closeModal(); } });
  const updateMutation = trpc.copywriting.update.useMutation({ onSuccess: () => { list.refetch(); closeModal(); } });
  const deleteMutation = trpc.copywriting.delete.useMutation({ onSuccess: () => list.refetch() });

  const closeModal = () => { setShowModal(false); setEditing(null); setTitle(''); setContent(''); setCat(''); };
  const openEdit = (c: any) => { setEditing(c); setTitle(c.title); setContent(c.content); setCat(c.category || ''); setShowModal(true); };

  const handleSave = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, title, content, category: cat || undefined });
    } else {
      createMutation.mutate({ title, content, category: cat || undefined });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">文案知识库</h2>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
          新增文案
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="搜索标题或内容" className="border rounded px-3 py-2 text-sm flex-1" />
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}
          className="border rounded px-3 py-2 text-sm">
          <option value="">全部分类</option>
          {categories.data?.map((c: any) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid gap-4">
        {list.data?.items.map((item: any) => (
          <div key={item.id} className="bg-white rounded-lg border p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                {item.category && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{item.category}</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(item)} className="text-blue-600 text-sm hover:underline">编辑</button>
                <button onClick={() => { if (confirm('确认删除？')) deleteMutation.mutate({ id: item.id }); }}
                  className="text-red-600 text-sm hover:underline">删除</button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{item.content}</p>
            <div className="text-xs text-gray-400 mt-2">{item.user?.username} | {new Date(item.updatedAt).toLocaleString('zh-CN')}</div>
          </div>
        ))}
        {!list.data?.items.length && <div className="text-gray-400 text-center py-8">暂无文案</div>}
      </div>

      {(list.data?.total || 0) > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">上一页</button>
          <span className="px-3 py-1 text-sm">{page}</span>
          <button onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded text-sm">下一页</button>
        </div>
      )}

      <Modal open={showModal} onClose={closeModal} title={editing ? '编辑文案' : '新增文案'}
        footer={<>
          <button onClick={closeModal} className="px-4 py-2 border rounded">取消</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">保存</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">标题</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">分类</label>
            <input value={cat} onChange={e => setCat(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="可选" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">内容</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" rows={8} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
