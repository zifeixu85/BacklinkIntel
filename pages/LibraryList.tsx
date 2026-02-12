import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db/db';
import { LinkLibraryDomain, PricingType, DomainType, Site, BacklinkRow } from '../types';
import { Search, Plus, Layers, Loader2, Trash2, ExternalLink, Globe, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getFaviconUrl, formatCompactNumber, getWhoisUrl } from '../utils/domain';
import Modal from '../components/Modal';

const DOMAIN_TYPE_LABELS: Record<DomainType, string> = {
  blog: '博客站', directory: '目录站', news: '新闻站', forum: '论坛', other: '其他', unknown: '未知'
};

const PRICING_TYPE_LABELS: Record<PricingType, string> = {
  free: '免费', paid: '付费', unknown: '未知'
};

export default function LibraryList() {
  const [items, setItems] = useState<LinkLibraryDomain[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newDomainType, setNewDomainType] = useState<DomainType>('unknown');
  const [newPricingType, setNewPricingType] = useState<PricingType>('unknown');
  const [sites, setSites] = useState<Site[]>([]);
  const [domainSiteMap, setDomainSiteMap] = useState<Record<string, { siteId: string, siteName: string }[]>>({});
  const [domainMetrics, setDomainMetrics] = useState<Record<string, { dr: number, traffic: number }>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  useEffect(() => {
    const fetchData = async () => {
      const [allItems, allSites, allBacklinks] = await Promise.all([
        db.library.toArray(),
        db.sites.toArray(),
        db.backlinks.toArray()
      ]);
      setSites(allSites);
      setItems(allItems.sort((a, b) => b.updatedAt - a.updatedAt));

      // Build domain -> sites mapping and metrics
      const siteMap: Record<string, Set<string>> = {};
      const metrics: Record<string, { dr: number, traffic: number }> = {};
      allBacklinks.forEach((bl: BacklinkRow) => {
        if (!siteMap[bl.refDomain]) siteMap[bl.refDomain] = new Set();
        siteMap[bl.refDomain].add(bl.siteId);
        if (!metrics[bl.refDomain]) metrics[bl.refDomain] = { dr: 0, traffic: 0 };
        if ((bl.dr || 0) > metrics[bl.refDomain].dr) metrics[bl.refDomain].dr = bl.dr || 0;
        if ((bl.domainTraffic || 0) > metrics[bl.refDomain].traffic) metrics[bl.refDomain].traffic = bl.domainTraffic || 0;
      });

      const siteIdMap: Record<string, string> = {};
      allSites.forEach(s => { siteIdMap[s.id] = s.name; });

      const domainSites: Record<string, { siteId: string, siteName: string }[]> = {};
      Object.entries(siteMap).forEach(([domain, siteIds]) => {
        domainSites[domain] = Array.from(siteIds).map(id => ({ siteId: id, siteName: siteIdMap[id] || id }));
      });

      setDomainSiteMap(domainSites);
      setDomainMetrics(metrics);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    await db.library.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
    setDeleteConfirm(null);
  };

  const handleInlineUpdate = async (id: string, field: string, value: any) => {
    await db.library.update(id, { [field]: value, updatedAt: Date.now() });
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value, updatedAt: Date.now() } : i));
  };

  const handleAddDomain = async () => {
    const domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    if (!domain) return;
    const existing = await db.library.where('domain').equals(domain).first();
    if (existing) { alert('该域名已存在'); return; }
    const id = crypto.randomUUID();
    const now = Date.now();
    const item: LinkLibraryDomain = {
      id, domain, displayName: '', typeTags: [], domainType: newDomainType,
      pricingType: newPricingType, priceAmount: null, currency: 'USD',
      submissionUrl: null, contact: null, status: 'not_tried', notes: null,
      createdAt: now, updatedAt: now
    };
    await db.library.add(item);
    setItems(prev => [item, ...prev]);
    setShowAddModal(false);
    setNewDomain('');
    setNewDomainType('unknown');
    setNewPricingType('unknown');
  };

  const filtered = useMemo(() => {
    return items.filter(i => i.domain.includes(search.toLowerCase()) || (i.notes && i.notes.includes(search)));
  }, [items, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">我的外链资源库</h1>
          <p className="text-slate-500 font-bold mt-1">已沉淀 {items.length} 个引荐域名渠道</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input
              type="text"
              placeholder="搜索域名..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-xl w-64 md:w-72 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all font-bold text-sm flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" /> 手动添加
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
          <Layers className="w-16 h-16 text-slate-200 mx-auto mb-6" />
          <p className="text-slate-400 font-black uppercase tracking-widest">暂无资源匹配</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">域名</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">DR</th>
                  <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">流量</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">付费类型</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">域名类型</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">关联站点</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map(item => {
                  const met = domainMetrics[item.domain];
                  const relatedSites = domainSiteMap[item.domain] || [];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <Link to={`/library/${item.id}`} className="flex items-center space-x-3 group/link">
                          <img src={getFaviconUrl(item.domain)} className="w-6 h-6 rounded bg-slate-100 flex-shrink-0" onError={(e) => (e.target as any).src = "https://placeholder.im/32x32"} alt="" />
                          <span className="font-bold text-slate-900 group-hover/link:text-indigo-600 transition-colors">{item.domain}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-black ${(met?.dr || 0) >= 50 ? 'text-indigo-600' : 'text-slate-600'}`}>{met?.dr || '-'}</span>
                          {met?.dr ? <div className="w-10 h-1 bg-slate-100 rounded-full"><div className={`h-full rounded-full ${(met.dr) >= 50 ? 'bg-indigo-500' : 'bg-slate-300'}`} style={{ width: `${met.dr}%` }} /></div> : null}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-xs font-bold text-slate-700">{met?.traffic ? formatCompactNumber(met.traffic) : '-'}</td>
                      <td className="px-4 py-4">
                        <select
                          value={item.pricingType}
                          onChange={(e) => handleInlineUpdate(item.id, 'pricingType', e.target.value)}
                          className={`text-[10px] font-black uppercase border rounded-lg py-1 px-2 bg-white cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                            item.pricingType === 'free' ? 'text-emerald-600 border-emerald-200' :
                            item.pricingType === 'paid' ? 'text-amber-600 border-amber-200' :
                            'text-slate-500 border-slate-200'
                          }`}
                        >
                          {Object.entries(PRICING_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={item.domainType || 'unknown'}
                          onChange={(e) => handleInlineUpdate(item.id, 'domainType', e.target.value)}
                          className="text-[10px] font-black uppercase border border-slate-200 rounded-lg py-1 px-2 bg-white text-slate-600 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          {Object.entries(DOMAIN_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {relatedSites.length === 0 ? (
                            <span className="text-[10px] text-slate-300 italic">-</span>
                          ) : relatedSites.map(rs => (
                            <Link key={rs.siteId} to={`/intel/${rs.siteId}`} className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md hover:bg-indigo-100 transition-colors truncate max-w-[100px]" title={rs.siteName}>
                              {rs.siteName}
                            </Link>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <a href={getWhoisUrl(item.domain)} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-100 hover:text-slate-600 transition-all" title="Whois">
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                          <a href={`https://${item.domain}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-100 hover:text-slate-600 transition-all" title="访问网站">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          {deleteConfirm === item.id ? (
                            <div className="flex items-center space-x-1 ml-2">
                              <button onClick={() => setDeleteConfirm(null)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2">取消</button>
                              <button onClick={() => handleDelete(item.id)} className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100">删除</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(item.id)}
                              className="p-1.5 rounded-lg text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                              title="删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
              <p className="text-[10px] text-slate-400 font-bold">{filtered.length} 个域名</p>
              <div className="flex space-x-2">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <span className="px-3 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg">{currentPage} / {totalPages}</span>
                <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <div className="p-8 max-w-md mx-auto">
            <h2 className="text-xl font-black text-slate-900 mb-6">手动添加外链资源</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">域名</label>
                <input
                  type="text" value={newDomain} onChange={e => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">付费类型</label>
                  <select value={newPricingType} onChange={e => setNewPricingType(e.target.value as PricingType)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm">
                    {Object.entries(PRICING_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">域名类型</label>
                  <select value={newDomainType} onChange={e => setNewDomainType(e.target.value as DomainType)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm">
                    {Object.entries(DOMAIN_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button onClick={() => setShowAddModal(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700">取消</button>
                <button onClick={handleAddDomain} disabled={!newDomain.trim()} className="px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50 transition-all">添加</button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
