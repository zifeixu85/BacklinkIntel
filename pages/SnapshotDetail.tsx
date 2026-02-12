import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../db/db';
import { Site, Snapshot, BacklinkRow } from '../types';
import { ChevronLeft, Filter, Search, Download, ExternalLink } from 'lucide-react';

export default function SnapshotDetail() {
  const { siteId, snapshotId } = useParams();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [rows, setRows] = useState<BacklinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!snapshotId) return;
      const snap = await db.snapshots.get(snapshotId);
      const data = await db.backlinks.where('snapshotId').equals(snapshotId).toArray();
      setSnapshot(snap || null);
      setRows(data);
      setLoading(false);
    };
    fetchData();
  }, [snapshotId]);

  if (loading) return <div className="p-8 text-center">加载中...</div>;
  if (!snapshot) return <div className="p-8 text-center">快照不存在</div>;

  const filtered = rows.filter(r => 
    r.refDomain.includes(search.toLowerCase()) || 
    (r.anchor || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link to={`/intel/${siteId}`} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">快照详情: {new Date(snapshot.importedAt).toLocaleDateString()}</h1>
            <p className="text-slate-500 text-sm">源文件: {snapshot.sourceFileName}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="搜索链接或锚文本..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">引荐域名</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">锚文本 (Anchor)</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">目标 URL</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">DR</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">类型</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filtered.slice(0, 100).map(row => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{row.refDomain}</div>
                  <div className="text-xs text-slate-400 truncate max-w-[200px]">{row.refPageUrl}</div>
                </td>
                <td className="px-6 py-4 text-slate-600 truncate max-w-[150px]">{row.anchor || '-'}</td>
                <td className="px-6 py-4 text-slate-400 truncate max-w-[150px]">{row.targetUrl}</td>
                <td className="px-6 py-4 font-bold text-slate-700">{row.dr}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.nofollow ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-700'}`}>
                    {row.nofollow ? 'NOFOLLOW' : 'DOFOLLOW'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 100 && (
          <div className="p-4 bg-slate-50 text-center text-xs text-slate-400 italic">
            仅展示前 100 条数据。完整数据存储在本地 IndexedDB。
          </div>
        )}
      </div>
    </div>
  );
}