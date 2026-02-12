import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../db/db';
import { Site, PricingType, LinkStatus, LinkLibraryDomain } from '../types';
import { ChevronLeft, Save, ShieldAlert, CheckCircle2, Search, X } from 'lucide-react';

export default function ExportToLibrary() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState<Site | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Bulk values
  const [bulkPricing, setBulkPricing] = useState<PricingType>('unknown');
  const [bulkStatus, setBulkStatus] = useState<LinkStatus>('not_tried');

  useEffect(() => {
    const fetchData = async () => {
      if (!siteId) return;
      const s = await db.sites.get(siteId);
      setSite(s || null);

      const latestSnap = await db.snapshots.where('siteId').equals(siteId).reverse().sortBy('importedAt');
      if (latestSnap.length > 0) {
        const rows = await db.backlinks.where('snapshotId').equals(latestSnap[0].id).toArray();
        
        // 聚合
        const aggregationMap: Record<string, any> = {};
        rows.forEach(r => {
          if (!aggregationMap[r.refDomain]) {
            aggregationMap[r.refDomain] = { domain: r.refDomain, dr: r.dr, backlinks: 0 };
          }
          aggregationMap[r.refDomain].backlinks++;
        });

        const sorted = Object.values(aggregationMap).sort((a, b) => b.dr - a.dr);
        
        const finalItems = [];
        for (const item of sorted.slice(0, 100)) { // 预览前 100 个
          const existing = await db.library.where('domain').equals(item.domain).first();
          finalItems.push({
            ...item,
            isExisting: !!existing,
            pricingType: existing?.pricingType || 'unknown',
            status: existing?.status || 'not_tried',
            notes: existing?.notes || '',
            selected: !existing
          });
        }
        setItems(finalItems);
      }
      setLoading(false);
    };
    fetchData();
  }, [siteId]);

  const handleSave = async () => {
    const selected = items.filter(i => i.selected);
    if (selected.length === 0) return;

    try {
      for (const item of selected) {
        const existing = await db.library.where('domain').equals(item.domain).first();
        const domainData: LinkLibraryDomain = {
          id: existing?.id || crypto.randomUUID(),
          domain: item.domain,
          typeTags: [],
          pricingType: item.pricingType,
          priceAmount: null,
          currency: 'USD',
          submissionUrl: null,
          contact: null,
          status: item.status,
          notes: item.notes,
          createdAt: existing?.createdAt || Date.now(),
          updatedAt: Date.now()
        };
        if (existing) await db.library.update(existing.id, domainData);
        else await db.library.add(domainData);
      }
      navigate('/library');
    } catch (e: any) {
      alert(`保存失败: ${e.message}`);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center space-x-6">
          <Link to={`/intel/${siteId}`} className="p-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl transition-all shadow-sm group">
            <ChevronLeft className="w-6 h-6 text-slate-400 group-hover:text-slate-900" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">批量入库管理</h1>
            <p className="text-slate-500 font-medium">将发现的高权重引荐域名沉淀到外链资源库</p>
          </div>
        </div>
        <button onClick={handleSave} className="px-10 py-4 bg-indigo-600 text-white font-black text-sm rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 flex items-center transition-all active:scale-95">
          <Save className="w-5 h-5 mr-3" /> 确认入库
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm sticky top-24">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
              <ShieldAlert className="w-4 h-4 mr-2 text-indigo-600" /> 批量预设参数
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">默认费用</label>
                <select value={bulkPricing} onChange={(e) => setBulkPricing(e.target.value as any)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="unknown">未知</option>
                  <option value="free">免费</option>
                  <option value="paid">付费</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">默认进度</label>
                <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as any)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="not_tried">未尝试</option>
                  <option value="submitted">已申请</option>
                  <option value="live">已上线</option>
                </select>
              </div>
              <button onClick={() => setItems(prev => prev.map(i => i.selected ? {...i, pricingType: bulkPricing, status: bulkStatus} : i))} className="w-full py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors">应用到选中项</button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="px-8 py-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">待处理域名列表 (前 100)</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type="text" placeholder="快速筛选..." className="pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/30">
                <tr>
                  <th className="px-8 py-4 text-left w-10">
                    <input type="checkbox" onChange={(e) => setItems(items.map(i => ({...i, selected: e.target.checked})))} checked={items.every(i => i.selected)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                  </th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">引荐域名</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">权重 / 链接</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">库中状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.filter(i => i.domain.includes(search)).map(item => (
                  <tr key={item.domain} className={`hover:bg-slate-50 transition-colors ${item.selected ? 'bg-indigo-50/20' : ''}`}>
                    <td className="px-8 py-5">
                      <input type="checkbox" checked={item.selected} onChange={() => setItems(prev => prev.map(i => i.domain === item.domain ? {...i, selected: !i.selected} : i))} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                    </td>
                    <td className="px-8 py-5">
                      <div className="font-bold text-slate-900 flex items-center">
                        {item.domain}
                        {item.isExisting && <CheckCircle2 className="w-3.5 h-3.5 ml-2 text-emerald-500" />}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 uppercase">{item.isExisting ? '更新已有资源' : '全新资源'}</div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-3">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-lg text-[10px] font-black text-slate-600">DR {item.dr}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{item.backlinks} LINKS</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex space-x-2">
                        <select value={item.status} onChange={(e) => setItems(prev => prev.map(i => i.domain === item.domain ? {...i, status: e.target.value as any} : i))} className="text-[10px] font-black uppercase border-slate-200 rounded-lg py-1 px-2 bg-white">
                          <option value="not_tried">未尝试</option>
                          <option value="submitted">已申请</option>
                          <option value="live">已上线</option>
                        </select>
                        <select value={item.pricingType} onChange={(e) => setItems(prev => prev.map(i => i.domain === item.domain ? {...i, pricingType: e.target.value as any} : i))} className="text-[10px] font-black uppercase border-slate-200 rounded-lg py-1 px-2 bg-white">
                          <option value="unknown">未知</option>
                          <option value="free">免费</option>
                          <option value="paid">付费</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}