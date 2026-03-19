import { useState } from 'react';
import { trpc } from '../trpc';
import DataTable from '../components/DataTable';

export default function SendRecords() {
  const [phone, setPhone] = useState('');
  const [spaceId, setSpaceId] = useState<number>(0);
  const [page, setPage] = useState(1);

  const spaces = trpc.spaces.list.useQuery();
  const records = trpc.sendRecords.list.useQuery({
    phone: phone || undefined,
    spaceId: spaceId || undefined,
    page,
  });

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">发送记录</h2>
      <div className="bg-white rounded-lg border p-4 mb-4">
        <div className="flex gap-3">
          <input type="text" value={phone} onChange={e => { setPhone(e.target.value); setPage(1); }}
            placeholder="手机号" className="border rounded px-3 py-2 text-sm w-48" />
          <select value={spaceId} onChange={e => { setSpaceId(Number(e.target.value)); setPage(1); }}
            className="border rounded px-3 py-2 text-sm">
            <option value={0}>全部空间库</option>
            {spaces.data?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div className="bg-white rounded-lg border">
        <DataTable
          columns={[
            { key: 'phone', title: '手机号' },
            { key: 'space', title: '空间库', render: (r: any) => r.space?.name || '-' },
            { key: 'batch', title: '批次文件', render: (r: any) => r.batch?.fileName || '-' },
            { key: 'sentAt', title: '发送时间', render: (r: any) => new Date(r.sentAt).toLocaleString('zh-CN') },
          ]}
          data={records.data?.items || []}
          total={records.data?.total || 0}
          page={page}
          onPageChange={setPage}
          loading={records.isLoading}
        />
      </div>
    </div>
  );
}
