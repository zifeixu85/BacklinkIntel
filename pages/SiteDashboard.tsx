import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../db/db';
import { Site, Snapshot, BacklinkRow } from '../types';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { LayoutDashboard, History, Globe2, ExternalLink, Search, BookmarkPlus, ChevronLeft, ChevronRight, ShieldAlert, ArrowUpDown, ChevronDown, ChevronUp, Activity, HelpCircle, X, CheckCircle2, Loader2 } from 'lucide-react';
import { getFaviconUrl, formatCompactNumber, getWhoisUrl, getScreenshotUrl } from '../utils/domain';

const FilterToggle = (props: { label: string, checked: boolean, onChange: (v: boolean) => void }) => (
  <label className="flex items-center cursor-pointer group">
    <div className="relative">
      <input type="checkbox" className="sr-only" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
      <div className={`w-10 h-6 rounded-full transition-colors ${props.checked ? 'bg-indigo-600' : 'bg-slate-200'}`} />
      <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${props.checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </div>
    <span className="ml-3 text-[10px] font-black text-slate-500 uppercase tracking-tighter group-hover:text-slate-900">{props.label}</span>
  </label>
);

const SortHeader = (props: { label: string, sortKey: string, current: { key: string, direction: string }, onSort: (k: string) => void, className?: string }) => (
  <th className={`px-4 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors ${props.className || ''}`} onClick={() => props.onSort(props.sortKey)}>
    <div className={`flex items-center ${props.className?.includes('text-right') ? 'justify-end' : ''}`}>
      {props.label}
      <ArrowUpDown className={`w-3 h-3 ml-1.5 ${props.current.key === props.sortKey ? 'text-indigo-600' : 'text-slate-300'}`} />
    </div>
  </th>
);

const Pagination = (props: { footer: string, current: number, total: number, onPageChange: (p: number) => void }) => (
  <div className="px-8 py-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{props.footer}</p>
    <div className="flex space-x-2">
      <button disabled={props.current === 1} onClick={() => props.onPageChange(props.current - 1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
      <span className="px-4 py-2 text-xs font-black text-indigo-600 bg-indigo-50 rounded-xl">{props.current} / {props.total || 1}</span>
      <button disabled={props.current >= props.total} onClick={() => props.onPageChange(props.current + 1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
    </div>
  </div>
);

export default function SiteDashboard() {
  const { siteId } = useParams();
  const [site, setSite] = useState<Site | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [allBacklinks, setAllBacklinks] = useState<BacklinkRow[]>([]);
  const [chartMode, setChartMode] = useState('cumulative');
  const [selectedDateRows, setSelectedDateRows] = useState<BacklinkRow[] | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [expandedPanelDomain, setExpandedPanelDomain] = useState<string | null>(null);
  const [inLibraryDomains, setInLibraryDomains] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState('180');
  const [search, setSearch] = useState('');
  const [showDofollowOnly, setShowDofollowOnly] = useState(false);
  const [hideSpam, setHideSpam] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'dr', direction: 'desc' });

  useEffect(() => {
    const fetchData = async () => {
      if (!siteId) return;
      const [siteData, snapshotsData, libraryData] = await Promise.all([
        db.sites.get(siteId),
        db.snapshots.where('siteId').equals(siteId).sortBy('importedAt'),
        db.library.toArray()
      ]);
      setSite(siteData || null);
      setSnapshots(snapshotsData);
      setInLibraryDomains(new Set(libraryData.map(l => l.domain)));
      if (snapshotsData.length > 0) {
        const latest = snapshotsData[snapshotsData.length - 1];
        const rows = await db.backlinks.where('snapshotId').equals(latest.id).toArray();
        setAllBacklinks(rows);
      }
      setLoading(false);
    };
    fetchData();
  }, [siteId]);

  const trendData = useMemo(() => {
    if (allBacklinks.length === 0) return [];
    const domainFirstSeen: Record<string, number> = {};
    allBacklinks.forEach(row => {
      if (row.firstSeen) {
        if (!domainFirstSeen[row.refDomain] || row.firstSeen < domainFirstSeen[row.refDomain]) {
          domainFirstSeen[row.refDomain] = row.firstSeen;
        }
      }
    });
    const dailyStats: Record<string, { newlyFoundDomains: Set<string>, rows: BacklinkRow[] }> = {};
    allBacklinks.forEach(row => {
      if (row.firstSeen) {
        const dateStr = new Date(row.firstSeen).toISOString().split('T')[0];
        if (!dailyStats[dateStr]) dailyStats[dateStr] = { newlyFoundDomains: new Set(), rows: [] };
        if (domainFirstSeen[row.refDomain] === row.firstSeen) {
          dailyStats[dateStr].newlyFoundDomains.add(row.refDomain);
        }
        dailyStats[dateStr].rows.push(row);
      }
    });
    const sortedDates = Object.keys(dailyStats).sort();
    if (sortedDates.length === 0) return [];
    let cumulative = 0;
    const result = sortedDates.map(date => {
      const newDomainCount = dailyStats[date].newlyFoundDomains.size;
      cumulative += newDomainCount;
      return {
        date: date,
        count: chartMode === 'cumulative' ? cumulative : newDomainCount,
        rows: dailyStats[date].rows,
        displayDate: new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }),
        timestamp: new Date(date).getTime()
      };
    });
    const now = Date.now();
    const rangeMs = timeRange === 'all' ? Infinity : parseInt(timeRange) * 24 * 60 * 60 * 1000;
    return result.filter(d => (now - d.timestamp) <= rangeMs);
  }, [allBacklinks, timeRange, chartMode]);

  const domainListData = useMemo(() => {
    const map: Record<string, any> = {};
    allBacklinks.forEach(row => {
      if (!map[row.refDomain]) {
        map[row.refDomain] = {
          domain: row.refDomain,
          dr: row.dr || 0,
          backlinks: 0,
          dofollow: 0,
          traffic: row.domainTraffic || 0,
          isSpam: (row.externalLinks || 0) > 400 || (row.dr || 0) < 5,
          inLibrary: inLibraryDomains.has(row.refDomain),
          links: []
        };
      }
      map[row.refDomain].backlinks++;
      if (!row.nofollow) map[row.refDomain].dofollow++;
      map[row.refDomain].links.push(row);
    });
    return Object.values(map);
  }, [allBacklinks, inLibraryDomains]);

  const filteredAndSorted = useMemo(() => {
    let list = domainListData.filter(d => {
      const matchesSearch = d.domain.includes(search.toLowerCase());
      const matchesDF = !showDofollowOnly || d.dofollow > 0;
      const matchesSpam = !hideSpam || !d.isSpam;
      return matchesSearch && matchesDF && matchesSpam;
    });
    list.sort((a, b) => {
      const factor = sortConfig.direction === 'asc' ? 1 : -1;
      const key = sortConfig.key as keyof typeof a;
      return (Number(a[key]) - Number(b[key])) * factor;
    });
    return list;
  }, [domainListData, search, showDofollowOnly, hideSpam, sortConfig]);

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key: key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
    setCurrentPage(1);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-12 h-12 animate-spin text-indigo-600" /></div>;

  return (
    <div className="flex">
      <div className={`flex-1 min-w-0 transition-all duration-300 ${selectedDateRows ? 'mr-0' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 mb-10 shadow-xl shadow-slate-200/30">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-2xl">
              <Globe2 className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{site?.name}</h1>
              <p className="text-slate-500 font-bold flex items-center">
                <span className="bg-slate-100 px-2 py-0.5 rounded-lg mr-2 text-xs">{site?.canonicalHost}</span>
                <a href={`https://${site?.canonicalHost}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-600"><ExternalLink className="w-4 h-4" /></a>
              </p>
            </div>
          </div>
          <div className="flex space-x-4 h-fit">
            <Link to={`/intel/${site?.id}/export-to-library`} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all flex items-center shadow-xl">
              <BookmarkPlus className="w-5 h-5 mr-3" /> 域名批量入库
            </Link>
          </div>
        </div>
      </div>

      <div className="flex bg-white/50 p-1.5 rounded-2xl border border-slate-200 w-fit mb-10 overflow-x-auto">
        {[
          { id: 'overview', label: '趋势分析', icon: LayoutDashboard },
          { id: 'domains', label: '引荐域名详情', icon: Globe2 },
          { id: 'history', label: '导入历史', icon: History }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-8 py-3 rounded-xl text-sm font-black transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-100' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button onClick={() => setChartMode('cumulative')} className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${chartMode === 'cumulative' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}>累计引荐域名</button>
              <button onClick={() => setChartMode('daily')} className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${chartMode === 'daily' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}>每日新增发现</button>
            </div>
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              {['30', '90', '180', '365', 'all'].map(r => (
                <button key={r} onClick={() => setTimeRange(r)} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${timeRange === r ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}>{r === 'all' ? '全部' : `${r}天`}</button>
              ))}
            </div>
          </div>

          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                <Activity className="w-4 h-4 mr-2 text-indigo-500" />
                {chartMode === 'cumulative' ? 'Referring Domains Cumulative Growth' : 'Daily Backlink Discovery Rate'}
              </h3>
              <div className="text-[10px] text-slate-400 font-bold bg-slate-50 px-3 py-1 rounded-lg">基于 First Seen 字段发现日期</div>
            </div>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    setSelectedDateRows(data.activePayload[0].payload.rows);
                  }
                }}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="displayDate" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontWeight: 700 }} minTickGap={40} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontWeight: 700 }} />
                  <Tooltip
                    cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 700, fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#chartGrad)" animationDuration={1000} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'domains' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="relative flex-grow">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="搜索域名..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:border-indigo-500 outline-none font-bold text-sm" />
            </div>
            <div className="flex items-center space-x-8 shrink-0">
              <FilterToggle label="仅 Dofollow" checked={showDofollowOnly} onChange={setShowDofollowOnly} />
              <FilterToggle label="排除垃圾(DR<5/高密度)" checked={hideSpam} onChange={setHideSpam} />
            </div>
            <div className="flex items-center space-x-3 shrink-0 pl-4 border-l border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase">分页</span>
              <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold border-none outline-none">
                {[25, 50, 100, 200].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
            <table className="min-w-full">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="w-12 px-8 py-5"></th>
                  <th className="px-4 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">引荐域名</th>
                  <SortHeader label="DR" sortKey="dr" current={sortConfig} onSort={handleSort} />
                  <SortHeader label="外链数" sortKey="backlinks" current={sortConfig} onSort={handleSort} />
                  <SortHeader label="域名流量" sortKey="traffic" current={sortConfig} onSort={handleSort} className="text-right" />
                  <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-end">
                    健康度 <div className="group relative ml-2"><HelpCircle className="w-3.5 h-3.5 text-slate-300" /><div className="hidden group-hover:block absolute right-0 top-6 w-48 p-3 bg-slate-900 text-white text-[9px] rounded-xl z-20 normal-case font-medium">健康度规则：<br />• 优质：DR&gt;50 和 流量&gt;1k<br />• 风险：外链密度&gt;400<br />• 垃圾：DR&lt;5</div></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedList.map(d => (
                  <React.Fragment key={d.domain}>
                    <tr className={`hover:bg-slate-50 transition-all ${expandedDomain === d.domain ? 'bg-indigo-50/30' : ''}`}>
                      <td className="px-8 py-5">
                        <button onClick={() => setExpandedDomain(expandedDomain === d.domain ? null : d.domain)} className="p-2 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-slate-100">
                          {expandedDomain === d.domain ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </button>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex items-center space-x-3">
                          <img src={getFaviconUrl(d.domain)} className="w-6 h-6 rounded bg-slate-100" onError={e => ((e.target as any).src = "https://placeholder.im/32x32")} alt="" />
                          <div>
                            <div className="flex items-center font-black text-slate-900">
                              {d.domain}
                              {d.inLibrary && <CheckCircle2 className="w-3.5 h-3.5 ml-2 text-indigo-500" />}
                            </div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">REFERRING DOMAIN</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex items-center space-x-3">
                          <span className={`w-6 text-[10px] font-black ${d.dr >= 50 ? 'text-indigo-600' : 'text-slate-600'}`}>{d.dr}</span>
                          <div className="w-16 h-1 bg-slate-100 rounded-full"><div className={`h-full rounded-full ${d.dr >= 50 ? 'bg-indigo-500' : 'bg-slate-300'}`} style={{ width: `${d.dr}%` }} /></div>
                        </div>
                      </td>
                      <td className="px-4 py-5 font-bold text-slate-700">{d.backlinks}</td>
                      <td className="px-4 py-5 text-right font-black text-slate-900">{formatCompactNumber(d.traffic)}</td>
                      <td className="px-8 py-5 text-right">
                        {d.isSpam ? (
                          <span className="inline-flex items-center px-2.5 py-1 bg-red-50 text-red-600 text-[9px] font-black rounded-lg uppercase"><ShieldAlert className="w-3 h-3 mr-1" /> Risk</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-lg uppercase"><CheckCircle2 className="w-3 h-3 mr-1" /> Healthy</span>
                        )}
                      </td>
                    </tr>
                    {expandedDomain === d.domain && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={6} className="p-0 border-b border-indigo-100">
                          <div className="p-10 space-y-6 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center justify-between">
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">引荐页面详情 (Referring Pages)</h5>
                              <div className="flex space-x-4">
                                <a href={getWhoisUrl(d.domain)} target="_blank" rel="noreferrer" className="text-[9px] font-black text-indigo-600 uppercase bg-white border border-indigo-100 px-3 py-1.5 rounded-lg shadow-sm hover:bg-indigo-600 hover:text-white transition-all">Whois 查询</a>
                                <a href={getScreenshotUrl(d.domain)} target="_blank" rel="noreferrer" className="text-[9px] font-black text-slate-600 uppercase bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 transition-all">网站截图预览</a>
                              </div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                              <table className="min-w-full text-[10px]">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                  <tr>
                                    <th className="px-6 py-3 text-left font-black text-slate-400 uppercase">引荐页面 (Referring Page)</th>
                                    <th className="px-6 py-3 text-left font-black text-slate-400 uppercase">锚文本 (Anchor)</th>
                                    <th className="px-6 py-3 text-left font-black text-slate-400 uppercase">首次发现</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {d.links.map((link: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-6 py-4">
                                        <div className="flex items-center">
                                          <span className="text-slate-900 font-bold truncate max-w-sm">{link.refPageUrl}</span>
                                          <a href={link.refPageUrl} target="_blank" rel="noreferrer" className="ml-2 text-slate-300 hover:text-indigo-600"><ExternalLink className="w-3 h-3" /></a>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 text-slate-500 italic truncate max-w-[200px]">{link.anchor || '(No anchor)'}</td>
                                      <td className="px-6 py-4 text-slate-400 font-bold">{link.firstSeen ? new Date(link.firstSeen).toLocaleDateString() : '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            <Pagination footer={`Showing ${filteredAndSorted.length} domains`} current={currentPage} total={totalPages} onPageChange={setCurrentPage} />
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">导入日期</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">文件名</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">记录数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {snapshots.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5 font-bold text-slate-900">{new Date(s.importedAt).toLocaleString()}</td>
                  <td className="px-8 py-5 text-slate-500 text-xs">{s.sourceFileName}</td>
                  <td className="px-8 py-5 text-right font-black text-indigo-600">{s.rowCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </div>
      </div>

      {selectedDateRows && (() => {
        const domainGroups: Record<string, BacklinkRow[]> = {};
        selectedDateRows.forEach(row => {
          if (!domainGroups[row.refDomain]) domainGroups[row.refDomain] = [];
          domainGroups[row.refDomain].push(row);
        });
        const domainList = Object.entries(domainGroups).sort((a, b) => b[1].length - a[1].length);

        return (
          <div className="w-[400px] flex-shrink-0 sticky top-0 h-screen bg-white border-l border-slate-200 shadow-xl transition-all duration-300 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-900">该日新增域名分析</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{domainList.length} 个域名 / {selectedDateRows.length} 条外链</p>
              </div>
              <button onClick={() => { setSelectedDateRows(null); setExpandedPanelDomain(null); }} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 overflow-y-auto h-[calc(100vh-80px)] space-y-3">
              {domainList.map(([domain, rows]) => {
                const isExpanded = expandedPanelDomain === domain;
                return (
                  <div key={domain} className="bg-slate-50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all overflow-hidden">
                    <button
                      onClick={() => setExpandedPanelDomain(isExpanded ? null : domain)}
                      className="w-full p-4 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <img src={getFaviconUrl(domain)} className="w-5 h-5 rounded bg-slate-200 flex-shrink-0" onError={e => ((e.target as any).src = "https://placeholder.im/32x32")} alt="" />
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 truncate">{domain}</p>
                          <p className="text-[10px] text-slate-400">{rows.length} 条外链</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {rows.some(r => !r.nofollow) && <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-green-100 text-green-700">DF</span>}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-2 animate-in fade-in slide-in-from-top-2">
                        {rows.map((row, i) => (
                          <div key={i} className="p-3 bg-white rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${row.nofollow ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-700'}`}>
                                {row.nofollow ? 'NOFOLLOW' : 'DOFOLLOW'}
                              </span>
                              <a href={row.refPageUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800"><ExternalLink className="w-3 h-3" /></a>
                            </div>
                            <p className="text-[10px] text-slate-500 break-all line-clamp-2 mb-1">{row.refPageUrl}</p>
                            {row.anchor && <p className="text-[10px] text-slate-400 italic truncate">Anchor: {row.anchor}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}