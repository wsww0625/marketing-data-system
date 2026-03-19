import { useState, useRef } from 'react';
import { trpc, uploadFile } from '../trpc';
import Modal from '../components/Modal';

export default function CopywritingLibrary() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [code, setCode] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = trpc.copywriting.list.useQuery({ search: search || undefined, page });
  const createMutation = trpc.copywriting.create.useMutation({ onSuccess: () => { list.refetch(); closeModal(); } });
  const updateMutation = trpc.copywriting.update.useMutation({ onSuccess: () => { list.refetch(); closeModal(); } });
  const deleteMutation = trpc.copywriting.delete.useMutation({ onSuccess: () => list.refetch() });

  const closeModal = () => { setShowModal(false); setEditing(null); setCode(''); setContent(''); setImageUrl(''); };
  const openEdit = (c: any) => { setEditing(c); setCode(c.code); setContent(c.content); setImageUrl(c.imageUrl || ''); setShowModal(true); };

  const handleSave = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, code, content, imageUrl: imageUrl || undefined });
    } else {
      createMutation.mutate({ code, content, imageUrl: imageUrl || undefined });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { filePath } = await uploadFile(file);
      // Use the filename part for the URL
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
      setImageUrl(`/api/uploads/temp/${fileName}`);
    } catch (err: any) {
      alert('图片上传失败: ' + err.message);
    }
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="page-header mb-1">文案知识库</h2>
          <p className="text-sm text-gray-500">管理文案编号、图片和内容</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" /></svg>
          新增文案
        </button>
      </div>

      <div className="mb-5">
        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="搜索文案编号或内容" className="form-input max-w-sm" />
      </div>

      <div className="grid gap-4">
        {list.data?.items.map((item: any) => (
          <div key={item.id} className="card">
            <div className="card-body">
              <div className="flex gap-5">
                {/* Image */}
                {item.imageUrl ? (
                  <div className="flex-shrink-0">
                    <img src={item.imageUrl} alt={item.code} className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                  </div>
                )}
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge-info font-mono">{item.code}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed line-clamp-3">{item.content}</p>
                  <div className="text-xs text-gray-400 mt-2">{item.user?.username} | {new Date(item.updatedAt).toLocaleString('zh-CN')}</div>
                </div>
                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(item)} className="text-blue-600 text-sm hover:text-blue-700 font-medium">编辑</button>
                  <button onClick={() => { if (confirm('确认删除？')) deleteMutation.mutate({ id: item.id }); }}
                    className="text-red-600 text-sm hover:text-red-700 font-medium">删除</button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!list.data?.items.length && <div className="text-gray-400 text-center py-12">暂无文案</div>}
      </div>

      {(list.data?.total || 0) > 20 && (
        <div className="flex justify-center gap-2 mt-5">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40">上一页</button>
          <span className="px-3 py-1.5 text-sm text-gray-500">{page}</span>
          <button onClick={() => setPage(p => p + 1)}
            className="btn-secondary text-sm px-3 py-1.5">下一页</button>
        </div>
      )}

      <Modal open={showModal} onClose={closeModal} title={editing ? '编辑文案' : '新增文案'}
        footer={<>
          <button onClick={closeModal} className="btn-secondary">取消</button>
          <button onClick={handleSave} disabled={!code || !content} className="btn-primary">保存</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="form-label">文案编号</label>
            <input value={code} onChange={e => setCode(e.target.value)} className="form-input" placeholder="如: V777" />
          </div>
          <div>
            <label className="form-label">图片</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            {imageUrl ? (
              <div className="flex items-center gap-3">
                <img src={imageUrl} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className="text-blue-600 text-sm font-medium">更换</button>
                  <button type="button" onClick={() => setImageUrl('')} className="text-red-600 text-sm font-medium">移除</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-sm text-gray-500 hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                {uploading ? '上传中...' : '点击上传图片'}
              </button>
            )}
          </div>
          <div>
            <label className="form-label">内容</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} className="form-textarea" rows={6} placeholder="文案内容..." />
          </div>
        </div>
      </Modal>
    </div>
  );
}
