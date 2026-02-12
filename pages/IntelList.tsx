import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db/db';
import { Site, Snapshot } from '../types';
import { Globe, Calendar, ArrowRight, BarChart2, Hash, Database, Layers } from 'lucide-react';

export default function IntelList() {
  const [sites, setSites] = useState<Site[]>([]);
  const [latestSnapshots, setLatestSnapshots] = useState<Record<string, Snapshot>>({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalBacklinks: 0, totalLibrary: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const allSites = await db.sites.toArray();
      const snapshotsMap: Record<string, Snapshot> = {};
      let backlinksSum = 0;
      
      for (const site of allSites) {
        const latest = await db.snapshots
          .where('siteId')
          .equals(site.id)
          .reverse()
          .sortBy('importedAt');
        if (latest.length > 0) {
          snapshotsMap[site.id] = latest[0];
          backlinksSum += latest[0].metrics.backlinksTotal;
        }
      }

      const libraryCount = await db.library.count();

      setSites(allSites);
      setLatestSnapshots(snapshotsMap);
      setStats({ totalBacklinks: backlinksSum, totalLibrary: libraryCount });
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">监控站点</p>
              <p className="text-3xl font-black text-slate-900">{sites.length}</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Globe className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">管理反向链接</p>
              <p className="text-3xl font-black text-slate-900">{stats.totalBacklinks.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Database className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">资源库规模</p>
              <p className="text-3xl font-black text-slate-900">{stats.totalLibrary.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Layers className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">站点智能分析</h1>
          <p className="mt-1 text-slate-500">追踪并分析竞争对手的反向链接动态</p>
        </div>
        <Link
          to="/import"
          className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center shadow-sm"
        >
          <Hash className="w-4 h-4 mr-2 text-indigo-500" />
          查看分析说明
        </Link>
      </div>

      {sites.length === 0 ? (
        <div className="mt-4 text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Globe className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">开始您的第一个项目</h3>
          <p className="mt-2 text-slate-500 max-w-sm mx-auto">导入 Ahrefs 导出的 CSV 文件，系统将自动分析引荐域名和反向链接趋势。</p>
          <div className="mt-8">
            <Link
              to="/import"
              className="inline-flex items-center px-8 py-3 shadow-xl shadow-indigo-200 text-sm font-bold rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700"
            >
              立即导入数据
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => {
            const latest = latestSnapshots[site.id];
            return (
              <Link
                key={site.id}
                to={`/intel/${site.id}`}
                className="group block bg-white border border-slate-200 rounded-[2rem] overflow-hidden hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-300 translate-y-0 hover:-translate-y-1"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white rounded-2xl flex items-center justify-center transition-colors">
                        <Globe className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 truncate max-w-[150px]">{site.name}</h3>
                        <p className="text-xs text-slate-400 font-medium">{site.canonicalHost}</p>
                      </div>
                    </div>
                  </div>
                  
                  {latest ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-2xl p-4">
                          <p className="text-[10px] uppercase font-black text-slate-400 mb-1">反向链接</p>
                          <p className="text-xl font-black text-slate-900">{latest.metrics.backlinksTotal.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4">
                          <p className="text-[10px] uppercase font-black text-slate-400 mb-1">引荐域名</p>
                          <p className="text-xl font-black text-slate-900">{latest.metrics.referringDomainsTotal.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-2">
                        <div className="flex items-center text-slate-400">
                          <Calendar className="w-3.5 h-3.5 mr-1.5" />
                          {new Date(latest.importedAt).toLocaleDateString()} 更新
                        </div>
                        <div className="px-2.5 py-1 bg-emerald-50 text-emerald-600 font-bold rounded-lg">
                          DF: {((latest.metrics.dofollowRefDomainsTotal / latest.metrics.referringDomainsTotal) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center border-t border-slate-50">
                      <p className="text-sm text-slate-300 italic font-medium">暂无数据摘要</p>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}