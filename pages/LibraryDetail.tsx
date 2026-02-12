import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../db/db';
import { LinkLibraryDomain, Site, DomainType } from '../types';
import { ChevronLeft, Save, Trash2, History, ExternalLink, Info } from 'lucide-react';

const DOMAIN_TYPE_LABELS: Record<DomainType, string> = {
  blog: '博客站', directory: '目录站', news: '新闻站', forum: '论坛', other: '其他', unknown: '未知'
};

export default function LibraryDetail() {
  const { domainId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<LinkLibraryDomain | null>(null);
  const [usage, setUsage] = useState<{site: Site, backlinks: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!domainId) return;
      const data = await db.library.get(domainId);
      if (data) {
        setItem(data);
        const backlinks = await db.backlinks.where('refDomain').equals(data.domain).toArray();
        const siteIds = Array.from(new Set(backlinks.map(b => b.siteId)));
        const usageData = [];
        for (const sId of siteIds) {
          const site = await db.sites.get(sId);
          if (site) {
            usageData.push({
              site,
              backlinks: backlinks.filter(b => b.siteId === sId).length
            });
          }
        }
        setUsage(usageData);
      }
      setLoading(false);
    };
    fetchData();
  }, [domainId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    await db.library.update(item.id, {
      ...item,
      updatedAt: Date.now()
    });
    alert('修改已保存');
    navigate('/library');
  };

  const handleDelete = async () => {
    if (!item || !window.confirm('确定要删除这个资源吗？此操作无法撤销。')) return;
    await db.library.delete(item.id);
    navigate('/library');
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
  if (!item) return <div className="p-8 text-center font-bold text-slate-500">资源未找到</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center space-x-6">
          <Link to="/library" className="p-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl transition-all shadow-sm group">
            <ChevronLeft className="w-6 h-6 text-slate-400 group-hover:text-slate-900" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{item.domain}</h1>
            <p className="text-slate-500 font-medium">资源档案创建于 {new Date(item.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-2xl transition-all border border-transparent hover:border-red-100"
          title="删除资源"
        >
          <Trash2 className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormGroup label="显示名称 (Alias)">
                <input
                  type="text"
                  value={item.displayName || ''}
                  onChange={e => setItem({...item, displayName: e.target.value})}
                  className="form-input-custom"
                  placeholder="例如: 技术博客 A"
                />
              </FormGroup>
              <FormGroup label="合作进度 (Status)">
                <select
                  value={item.status}
                  onChange={e => setItem({...item, status: e.target.value as any})}
                  className="form-input-custom appearance-none cursor-pointer"
                >
                  <option value="not_tried">未尝试 (Not Tried)</option>
                  <option value="submitted">已申请 (Pending)</option>
                  <option value="live">已入链 (Live)</option>
                  <option value="rejected">已拒绝 (Rejected)</option>
                  <option value="maintenance">维护中 (Maint.)</option>
                </select>
              </FormGroup>
              <FormGroup label="费用模式 (Pricing)">
                <select
                  value={item.pricingType}
                  onChange={e => setItem({...item, pricingType: e.target.value as any})}
                  className="form-input-custom appearance-none cursor-pointer"
                >
                  <option value="unknown">未知 (Unknown)</option>
                  <option value="free">免费 (Free)</option>
                  <option value="paid">付费 (Paid)</option>
                </select>
              </FormGroup>
              <FormGroup label="域名类型 (Domain Type)">
                <select
                  value={item.domainType || 'unknown'}
                  onChange={e => setItem({...item, domainType: e.target.value as DomainType})}
                  className="form-input-custom appearance-none cursor-pointer"
                >
                  {Object.entries(DOMAIN_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </FormGroup>
              <FormGroup label={`价格 (Amount - ${item.currency})`}>
                <input
                  type="number"
                  value={item.priceAmount || ''}
                  onChange={e => setItem({...item, priceAmount: e.target.value ? parseFloat(e.target.value) : null})}
                  className="form-input-custom"
                  placeholder="0.00"
                />
              </FormGroup>
              <div></div>
              <div className="md:col-span-2">
                <FormGroup label="投稿或联系 URL (Cooperation Link)">
                  <div className="flex">
                    <input
                      type="url"
                      value={item.submissionUrl || ''}
                      onChange={e => setItem({...item, submissionUrl: e.target.value})}
                      className="form-input-custom rounded-r-none border-r-0"
                      placeholder="https://..."
                    />
                    <a
                      href={item.submissionUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className={`px-5 flex items-center bg-slate-50 border border-slate-200 rounded-r-2xl transition-all ${item.submissionUrl ? 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700' : 'text-slate-200 pointer-events-none'}`}
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </FormGroup>
              </div>
              <div className="md:col-span-2">
                <FormGroup label="内部备注 (Internal Notes)">
                  <textarea
                    value={item.notes || ''}
                    onChange={e => setItem({...item, notes: e.target.value})}
                    className="form-input-custom h-40 resize-none py-4"
                    placeholder="在这里记录沟通历史、价格谈判结果或发布标准..."
                  />
                </FormGroup>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100 flex justify-end">
               <button
                type="submit"
                className="px-10 py-4 bg-indigo-600 text-white font-black text-sm rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all transform active:scale-95 flex items-center"
               >
                 <Save className="w-5 h-5 mr-3" />
                 保存资源档案
               </button>
            </div>
          </div>
        </form>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
              <History className="w-4 h-4 mr-2 text-indigo-500" />
              反向链接关联统计
            </h3>
            {usage.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-slate-300 italic font-medium">尚未在任何导入数据中发现该域名。</p>
              </div>
            ) : (
              <div className="space-y-4">
                {usage.map(u => (
                  <Link
                    key={u.site.id}
                    to={`/intel/${u.site.id}`}
                    className="flex items-center justify-between p-4 bg-slate-50 border border-transparent rounded-2xl hover:border-indigo-100 hover:bg-indigo-50 transition-all group"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{u.site.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{u.site.canonicalHost}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">{u.backlinks}</p>
                      <p className="text-[10px] text-slate-300 font-bold uppercase">Links</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900 p-8 rounded-[2rem] text-slate-400 text-xs shadow-2xl">
            <h4 className="text-slate-200 font-black mb-4 uppercase flex items-center tracking-widest">
              <Info className="w-3.5 h-3.5 mr-2 text-indigo-400" />
              SEO 专家贴士
            </h4>
            <ul className="space-y-3 font-medium">
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2">•</span>
                <span>定期回检 "Live" 状态的资源，确保反向链接没有被竞争对手投诉或删除。</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2">•</span>
                <span>如果多个项目都使用了该资源，建议将其标记为高价值标签。</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2">•</span>
                <span>记录合作时的沟通渠道，方便后续批量采购外链。</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        .form-input-custom {
          width: 100%;
          padding: 1rem 1.25rem;
          background-color: white;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          outline: none;
          font-weight: 700;
          color: #0f172a;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          transition: all 0.2s;
        }
        .form-input-custom:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }
      `}
      </style>
    </div>
  );
}

const FormGroup = ({ label, children }: any) => (
  <div>
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
      {label}
    </label>
    {children}
  </div>
);
