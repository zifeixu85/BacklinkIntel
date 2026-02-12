import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db/db';
import { LinkLibraryDomain, PricingType } from '../types';
import { Search, Plus, Globe, Layers, Calendar, ArrowRight, ShieldCheck, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getFaviconUrl, getWhoisUrl, getScreenshotUrl } from '../utils/domain';

const PricingBadge = ({ type }: { type: PricingType }) => {
  if (type === 'free') return <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-lg text-[9px] font-black uppercase">FREE</span>;
  if (type === 'paid') return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-lg text-[9px] font-black uppercase">PAID</span>;
  return <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-lg text-[9px] font-black uppercase">TBD</span>;
};

export default function LibraryList() {
  const [items, setItems] = useState<LinkLibraryDomain[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      const all = await db.library.toArray();
      setItems(all.sort((a, b) => b.updatedAt - a.updatedAt));
      setLoading(false);
    };
    fetchItems();
  }, []);

  const filtered = items.filter(i => i.domain.includes(search.toLowerCase()));

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">我的外链资源库</h1>
          <p className="text-slate-500 font-bold mt-2 flex items-center">
            <ShieldCheck className="w-4 h-4 mr-2 text-indigo-500" />
            已沉淀 {items.length} 个潜在引荐域名渠道
          </p>
        </div>
        <div className="flex items-center space-x-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text" 
              placeholder="搜索域名或备注..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl w-64 md:w-80 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-sm"
            />
          </div>
          <button className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(item => (
          <div key={item.id} className="bg-[#111827] rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-800 flex flex-col group hover:border-indigo-500/50 transition-all duration-300 translate-y-0 hover:-translate-y-2">
            {/* 卡片头部 */}
            <div className="p-8 border-b border-slate-800 bg-slate-900/50">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-white rounded-2xl p-2.5 shadow-inner">
                  <img src={getFaviconUrl(item.domain)} className="w-full h-full object-contain" onError={(e) => (e.target as any).src = "https://placeholder.im/64x64"} />
                </div>
                <div className="flex space-x-2">
                  <PricingBadge type={item.pricingType} />
                </div>
              </div>
              <h3 className="text-xl font-black text-white truncate mb-1">{item.domain}</h3>
              <div className="flex items-center text-slate-500 space-x-4">
                <a href={getWhoisUrl(item.domain)} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase tracking-widest hover:text-indigo-400 flex items-center">
                  <Globe className="w-3 h-3 mr-1" /> Whois
                </a>
                <a href={getScreenshotUrl(item.domain)} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase tracking-widest hover:text-indigo-400 flex items-center">
                  <ImageIcon className="w-3 h-3 mr-1" /> Screenshot
                </a>
              </div>
            </div>

            {/* 卡片主体 */}
            <div className="p-8 flex-grow space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">合作类型</p>
                  <p className="text-xs font-black text-slate-200">Content / Guest</p>
                </div>
                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">最近同步</p>
                  <p className="text-xs font-black text-slate-200">{new Date(item.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2 italic">
                {item.notes || '暂无详细描述...'}
              </div>
            </div>

            {/* 卡片底部 */}
            <div className="p-6 bg-slate-900/80 border-t border-slate-800 flex justify-between items-center">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Resource Index: #{item.id.slice(0, 4)}
              </div>
              <Link to={`/library/${item.id}`} className="flex items-center text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors">
                查看详情 <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
      
      {filtered.length === 0 && (
        <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
          <Layers className="w-16 h-16 text-slate-200 mx-auto mb-6" />
          <p className="text-slate-400 font-black uppercase tracking-widest">暂无资源匹配</p>
        </div>
      )}
    </div>
  );
}