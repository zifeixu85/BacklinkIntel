import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../db/db';
import { OutreachProject, OutreachTask, LinkLibraryDomain, Site, TaskStatus, BacklinkRow, PricingType } from '../types';
import { ChevronLeft, ChevronRight, Plus, Calendar, List, Trash2, Loader2, CheckCircle2, Circle, Clock, SkipForward, Search } from 'lucide-react';
import { getFaviconUrl, formatCompactNumber } from '../utils/domain';
import Modal from '../components/Modal';

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: React.FC<any> }> = {
  pending: { label: '待处理', color: 'text-slate-500 bg-slate-50 border-slate-200', icon: Circle },
  in_progress: { label: '进行中', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock },
  completed: { label: '已完成', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  skipped: { label: '已跳过', color: 'text-slate-400 bg-slate-50 border-slate-200', icon: SkipForward },
};

const STATUS_ORDER: TaskStatus[] = ['in_progress', 'pending', 'completed', 'skipped'];

export default function ProjectDetail() {
  const { projectId } = useParams();
  const [project, setProject] = useState<OutreachProject | null>(null);
  const [tasks, setTasks] = useState<OutreachTask[]>([]);
  const [libraryDomains, setLibraryDomains] = useState<LinkLibraryDomain[]>([]);
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showAddTask, setShowAddTask] = useState(false);
  const [addMode, setAddMode] = useState<'library' | 'manual'>('library');
  const [manualDomain, setManualDomain] = useState('');
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<Set<string>>(new Set());
  const [taskNotes, setTaskNotes] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');
  const [domainMetrics, setDomainMetrics] = useState<Record<string, { dr: number, traffic: number }>>({});
  const [editingTask, setEditingTask] = useState<OutreachTask | null>(null);
  const [editTaskNotes, setEditTaskNotes] = useState('');
  const [editTaskStatus, setEditTaskStatus] = useState<TaskStatus>('pending');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;
      const p = await db.projects.get(projectId);
      if (!p) { setLoading(false); return; }
      setProject(p);
      const [t, lib, allBacklinks] = await Promise.all([
        db.outreachTasks.where('projectId').equals(projectId).toArray(),
        db.library.toArray(),
        db.backlinks.toArray()
      ]);
      setTasks(t.sort((a, b) => a.createdAt - b.createdAt));
      setLibraryDomains(lib);

      // Build domain metrics from backlinks
      const metrics: Record<string, { dr: number, traffic: number }> = {};
      allBacklinks.forEach((bl: BacklinkRow) => {
        if (!metrics[bl.refDomain]) metrics[bl.refDomain] = { dr: 0, traffic: 0 };
        if ((bl.dr || 0) > metrics[bl.refDomain].dr) metrics[bl.refDomain].dr = bl.dr || 0;
        if ((bl.domainTraffic || 0) > metrics[bl.refDomain].traffic) metrics[bl.refDomain].traffic = bl.domainTraffic || 0;
      });
      setDomainMetrics(metrics);
      if (p.siteId) {
        const s = await db.sites.get(p.siteId);
        if (s) setSite(s);
      }
      setLoading(false);
    };
    fetchData();
  }, [projectId]);

  const handleAddTasks = async () => {
    const newTasks: OutreachTask[] = [];
    const now = Date.now();

    if (addMode === 'library') {
      for (const libId of selectedLibraryIds) {
        const libDomain = libraryDomains.find(d => d.id === libId);
        if (!libDomain) continue;
        if (tasks.some(t => t.libraryDomainId === libId)) continue;
        newTasks.push({
          id: crypto.randomUUID(),
          projectId: projectId!,
          libraryDomainId: libId,
          domain: libDomain.domain,
          scheduledDate: null,
          status: 'pending',
          notes: taskNotes.trim() || null,
          createdAt: now,
          updatedAt: now
        });
      }
    } else {
      const domain = manualDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
      if (!domain) return;
      if (tasks.some(t => t.domain === domain)) { alert('该域名任务已存在'); return; }
      newTasks.push({
        id: crypto.randomUUID(),
        projectId: projectId!,
        libraryDomainId: null,
        domain,
        scheduledDate: null,
        status: 'pending',
        notes: taskNotes.trim() || null,
        createdAt: now,
        updatedAt: now
      });
    }

    if (newTasks.length === 0) return;
    await db.outreachTasks.bulkAdd(newTasks);
    setTasks(prev => [...prev, ...newTasks]);
    setShowAddTask(false);
    setSelectedLibraryIds(new Set());
    setManualDomain('');
    setTaskNotes('');
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    await db.outreachTasks.update(taskId, { status, updatedAt: Date.now() });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status, updatedAt: Date.now() } : t));
  };

  const handleSaveTaskEdit = async () => {
    if (!editingTask) return;
    await db.outreachTasks.update(editingTask.id, { status: editTaskStatus, notes: editTaskNotes.trim() || null, updatedAt: Date.now() });
    setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, status: editTaskStatus, notes: editTaskNotes.trim() || null, updatedAt: Date.now() } : t));
    setEditingTask(null);
  };

  const openTaskEdit = (task: OutreachTask) => {
    setEditingTask(task);
    setEditTaskStatus(task.status);
    setEditTaskNotes(task.notes || '');
  };

  const handleDeleteTask = async (taskId: string) => {
    await db.outreachTasks.delete(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setDeleteConfirm(null);
  };

  const handleDateChange = async (taskId: string, date: string) => {
    const ts = date ? new Date(date).getTime() : null;
    await db.outreachTasks.update(taskId, { scheduledDate: ts, updatedAt: Date.now() });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, scheduledDate: ts, updatedAt: Date.now() } : t));
  };

  const groupedTasks = useMemo(() => {
    const groups: Record<TaskStatus, OutreachTask[]> = { pending: [], in_progress: [], completed: [], skipped: [] };
    tasks.forEach(t => groups[t.status].push(t));
    return groups;
  }, [tasks]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [calendarMonth]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, OutreachTask[]> = {};
    tasks.forEach(t => {
      if (t.scheduledDate) {
        const d = new Date(t.scheduledDate);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [tasks]);

  const availableLibrary = useMemo(() => {
    const usedDomainIds = new Set(tasks.filter(t => t.libraryDomainId).map(t => t.libraryDomainId));
    let filtered = libraryDomains.filter(d => !usedDomainIds.has(d.id));
    if (librarySearch.trim()) {
      const q = librarySearch.trim().toLowerCase();
      filtered = filtered.filter(d => d.domain.includes(q) || (d.displayName && d.displayName.toLowerCase().includes(q)));
    }
    return filtered;
  }, [libraryDomains, tasks, librarySearch]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
    </div>
  );
  if (!project) return <div className="p-8 text-center font-bold text-slate-500">项目未找到</div>;

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    pending: tasks.filter(t => t.status === 'pending').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center space-x-6">
          <Link to="/projects" className="p-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl transition-all shadow-sm group">
            <ChevronLeft className="w-6 h-6 text-slate-400 group-hover:text-slate-900" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{project.name}</h1>
            <div className="flex items-center space-x-3 mt-1">
              {site && <span className="text-xs font-bold text-indigo-500">{site.name}</span>}
              {project.description && <span className="text-sm text-slate-400">{project.description}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List className="w-4 h-4 mr-1.5" />列表
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Calendar className="w-4 h-4 mr-1.5" />日历
            </button>
          </div>
          <button
            onClick={() => setShowAddTask(true)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all font-bold text-sm flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" /> 添加任务
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: '总任务', value: stats.total, color: 'text-slate-700' },
          { label: '待处理', value: stats.pending, color: 'text-slate-500' },
          { label: '进行中', value: stats.inProgress, color: 'text-amber-600' },
          { label: '已完成', value: stats.completed, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-5 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-8">
          {STATUS_ORDER.map(status => {
            const group = groupedTasks[status];
            if (group.length === 0) return null;
            const config = STATUS_CONFIG[status];
            const Icon = config.icon;
            return (
              <div key={status}>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                  <Icon className="w-4 h-4 mr-2" />
                  {config.label} ({group.length})
                </h3>
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">域名</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">状态</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">计划日期</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">备注</th>
                        <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.map(task => (
                        <tr key={task.id} className="hover:bg-slate-50 transition-colors group/row">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <img src={getFaviconUrl(task.domain)} className="w-5 h-5 rounded bg-slate-100 flex-shrink-0" onError={(e) => (e.target as any).src = "https://placeholder.im/32x32"} alt="" />
                              <span className="font-bold text-slate-900 text-sm">{task.domain}</span>
                              {task.libraryDomainId && (
                                <Link to={`/library/${task.libraryDomainId}`} className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded hover:bg-indigo-100 transition-colors">资源库</Link>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                              className={`text-[10px] font-black uppercase border rounded-lg py-1 px-2 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/20 ${STATUS_CONFIG[task.status].color}`}
                            >
                              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="date"
                              value={task.scheduledDate ? new Date(task.scheduledDate).toISOString().split('T')[0] : ''}
                              onChange={(e) => handleDateChange(task.id, e.target.value)}
                              className="text-xs font-bold text-slate-600 border border-slate-200 rounded-lg py-1 px-2 outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                            />
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-400 max-w-[200px] truncate">{task.notes || '-'}</td>
                          <td className="px-6 py-4 text-right">
                            {deleteConfirm === task.id ? (
                              <div className="flex items-center justify-end space-x-1">
                                <button onClick={() => setDeleteConfirm(null)} className="text-[10px] font-bold text-slate-400 px-2">取消</button>
                                <button onClick={() => handleDeleteTask(task.id)} className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100">删除</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(task.id)}
                                className="p-1.5 rounded-lg text-slate-300 opacity-0 group-hover/row:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && (
            <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-black uppercase tracking-widest">暂无任务</p>
              <p className="text-slate-300 text-sm mt-2">点击"添加任务"从资源库导入或手动添加域名</p>
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </button>
            <h3 className="text-lg font-black text-slate-900">
              {calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月
            </h3>
            <button
              onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <div key={d} className="bg-slate-50 p-3 text-center text-[10px] font-black text-slate-400 uppercase">{d}</div>
            ))}
            {calendarDays.map((day, idx) => {
              const key = day ? `${calendarMonth.getFullYear()}-${calendarMonth.getMonth()}-${day}` : null;
              const dayTasks = key ? (tasksByDate[key] || []) : [];
              const today = new Date();
              const isToday = day !== null && today.getFullYear() === calendarMonth.getFullYear() && today.getMonth() === calendarMonth.getMonth() && today.getDate() === day;
              return (
                <div key={idx} className={`bg-white p-2 min-h-[100px] ${day === null ? 'bg-slate-50/50' : ''}`}>
                  {day !== null && (
                    <>
                      <span className={`text-xs font-bold inline-flex items-center justify-center ${isToday ? 'bg-indigo-600 text-white w-6 h-6 rounded-full' : 'text-slate-400'}`}>{day}</span>
                      <div className="mt-1 space-y-1">
                        {dayTasks.slice(0, 3).map(t => (
                          <div
                            key={t.id}
                            onClick={() => openTaskEdit(t)}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate border cursor-pointer hover:opacity-80 transition-opacity ${STATUS_CONFIG[t.status].color}`}
                            title={t.domain}
                          >
                            {t.domain}
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <span className="text-[9px] text-slate-400 font-bold">+{dayTasks.length - 3} 更多</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Unscheduled tasks */}
          {tasks.filter(t => !t.scheduledDate).length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">未排期任务 ({tasks.filter(t => !t.scheduledDate).length})</h4>
              <div className="flex flex-wrap gap-2">
                {tasks.filter(t => !t.scheduledDate).map(t => (
                  <span key={t.id} onClick={() => openTaskEdit(t)} className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity ${STATUS_CONFIG[t.status].color}`}>
                    {t.domain}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Task Modal */}
      <Modal isOpen={showAddTask} onClose={() => { setShowAddTask(false); setSelectedLibraryIds(new Set()); setManualDomain(''); setTaskNotes(''); }} title="添加外链任务">
        <div className="max-w-lg mx-auto">
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setAddMode('library')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${addMode === 'library' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
            >
              从资源库选择
            </button>
            <button
              onClick={() => setAddMode('manual')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${addMode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
            >
              手动输入域名
            </button>
          </div>

          {addMode === 'library' ? (
            <div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text" value={librarySearch} onChange={e => setLibrarySearch(e.target.value)}
                  placeholder="搜索域名..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                />
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {availableLibrary.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">资源库中没有可添加的域名</p>
                ) : availableLibrary.map(d => {
                  const met = domainMetrics[d.domain];
                  return (
                    <label
                      key={d.id}
                      className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${selectedLibraryIds.has(d.id) ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLibraryIds.has(d.id)}
                        onChange={(e) => {
                          const s = new Set(selectedLibraryIds);
                          if (e.target.checked) s.add(d.id);
                          else s.delete(d.id);
                          setSelectedLibraryIds(s);
                        }}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 flex-shrink-0"
                      />
                      <img src={getFaviconUrl(d.domain)} className="w-5 h-5 rounded bg-slate-100 flex-shrink-0 ml-3" onError={(e) => (e.target as any).src = "https://placeholder.im/32x32"} alt="" />
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-900 truncate">{d.domain}</span>
                          {d.displayName && <span className="text-xs text-slate-400 truncate">({d.displayName})</span>}
                        </div>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className={`text-[10px] font-black ${(met?.dr || 0) >= 50 ? 'text-indigo-600' : 'text-slate-400'}`}>DR {met?.dr || '-'}</span>
                          <span className="text-[10px] font-bold text-slate-400">{met?.traffic ? formatCompactNumber(met.traffic) + ' 流量' : ''}</span>
                          <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${d.pricingType === 'free' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : d.pricingType === 'paid' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>
                            {d.pricingType === 'free' ? '免费' : d.pricingType === 'paid' ? '付费' : '未知'}
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">域名</label>
              <input
                type="text" value={manualDomain} onChange={e => setManualDomain(e.target.value)}
                placeholder="example.com"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                autoFocus
              />
            </div>
          )}

          <div className="mt-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">备注（可选）</label>
            <input
              type="text" value={taskNotes} onChange={e => setTaskNotes(e.target.value)}
              placeholder="备注信息..."
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <button onClick={() => { setShowAddTask(false); setSelectedLibraryIds(new Set()); setManualDomain(''); setTaskNotes(''); }} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700">取消</button>
            <button
              onClick={handleAddTasks}
              disabled={addMode === 'library' ? selectedLibraryIds.size === 0 : !manualDomain.trim()}
              className="px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50 transition-all"
            >
              添加 {addMode === 'library' && selectedLibraryIds.size > 0 ? `(${selectedLibraryIds.size})` : ''}
            </button>
          </div>
        </div>
      </Modal>

      {/* Task Edit Modal */}
      <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title="任务详情">
        {editingTask && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="flex items-center space-x-3">
              <img src={getFaviconUrl(editingTask.domain)} className="w-8 h-8 rounded bg-slate-100" onError={(e) => (e.target as any).src = "https://placeholder.im/32x32"} alt="" />
              <div>
                <p className="font-black text-lg text-slate-900">{editingTask.domain}</p>
                {editingTask.libraryDomainId && (
                  <Link to={`/library/${editingTask.libraryDomainId}`} onClick={() => setEditingTask(null)} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700">查看资源库档案 →</Link>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">任务状态</label>
              <select
                value={editTaskStatus}
                onChange={e => setEditTaskStatus(e.target.value as TaskStatus)}
                className={`w-full px-4 py-3 border rounded-xl outline-none font-bold text-sm cursor-pointer focus:ring-4 focus:ring-indigo-500/10 ${STATUS_CONFIG[editTaskStatus].color}`}
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">备注</label>
              <textarea
                value={editTaskNotes}
                onChange={e => setEditTaskNotes(e.target.value)}
                placeholder="记录沟通进展、联系方式、投稿要求等..."
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm h-32 resize-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
              />
            </div>
            {editingTask.scheduledDate && (
              <p className="text-xs text-slate-400 font-bold">计划日期：{new Date(editingTask.scheduledDate).toLocaleDateString()}</p>
            )}
            <div className="flex justify-end space-x-3 pt-2">
              <button onClick={() => setEditingTask(null)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700">取消</button>
              <button onClick={handleSaveTaskEdit} className="px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">保存</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
