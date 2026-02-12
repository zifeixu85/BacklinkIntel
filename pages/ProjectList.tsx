import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db/db';
import { OutreachProject, OutreachTask } from '../types';
import { Plus, FolderKanban, Trash2, Loader2 } from 'lucide-react';
import Modal from '../components/Modal';

export default function ProjectList() {
  const [projects, setProjects] = useState<OutreachProject[]>([]);
  const [tasks, setTasks] = useState<OutreachTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTargetUrl, setNewTargetUrl] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [p, t] = await Promise.all([
        db.projects.toArray(),
        db.outreachTasks.toArray()
      ]);
      setProjects(p.sort((a, b) => b.updatedAt - a.updatedAt));
      setTasks(t);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const id = crypto.randomUUID();
    const now = Date.now();
    const project: OutreachProject = {
      id, name: newName.trim(), siteId: null, targetUrl: newTargetUrl.trim() || null, description: newDesc.trim() || null,
      createdAt: now, updatedAt: now
    };
    await db.projects.add(project);
    setProjects(prev => [project, ...prev]);
    setShowCreate(false);
    setNewName('');
    setNewTargetUrl('');
    setNewDesc('');
  };

  const handleDelete = async (id: string) => {
    await db.outreachTasks.where('projectId').equals(id).delete();
    await db.projects.delete(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.filter(t => t.projectId !== id));
    setDeleteConfirm(null);
  };

  const getProjectStats = (projectId: string) => {
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    const total = projectTasks.length;
    const completed = projectTasks.filter(t => t.status === 'completed').length;
    const inProgress = projectTasks.filter(t => t.status === 'in_progress').length;
    return { total, completed, inProgress };
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">外链计划</h1>
          <p className="text-slate-500 font-bold mt-1">管理 {projects.length} 个外链推广项目</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all font-bold text-sm flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" /> 新建项目
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
          <FolderKanban className="w-16 h-16 text-slate-200 mx-auto mb-6" />
          <p className="text-slate-400 font-black uppercase tracking-widest">暂无项目</p>
          <p className="text-slate-300 text-sm mt-2">点击上方按钮创建第一个外链推广项目</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => {
            const stats = getProjectStats(project.id);
            const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
            return (
              <div key={project.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all group relative">
                {deleteConfirm === project.id && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10">
                    <p className="text-sm font-bold text-slate-700 mb-4">确认删除此项目及所有任务？</p>
                    <div className="flex space-x-3">
                      <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">取消</button>
                      <button onClick={() => handleDelete(project.id)} className="px-4 py-2 text-sm font-bold text-white bg-red-500 rounded-lg hover:bg-red-600">删除</button>
                    </div>
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <Link to={`/projects/${project.id}`} className="flex-1">
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{project.name}</h3>
                    {project.targetUrl && <p className="text-xs font-bold text-indigo-500 mt-1">{project.targetUrl}</p>}
                  </Link>
                  <button
                    onClick={() => setDeleteConfirm(project.id)}
                    className="p-1.5 rounded-lg text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {project.description && <p className="text-sm text-slate-400 mb-4 line-clamp-2">{project.description}</p>}
                <div className="mt-auto">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
                    <span>{stats.completed}/{stats.total} 完成</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  {stats.inProgress > 0 && (
                    <p className="text-[10px] text-amber-500 font-bold mt-2">{stats.inProgress} 个进行中</p>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[10px] text-slate-300 font-bold">{new Date(project.updatedAt).toLocaleDateString()}</span>
                  <Link to={`/projects/${project.id}`} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">查看详情 →</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="新建外链项目">
        <div className="max-w-md mx-auto space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">项目名称</label>
            <input
              type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="例如：2025 Q1 外链推广"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">目标网站（可选）</label>
            <input
              type="text" value={newTargetUrl} onChange={e => setNewTargetUrl(e.target.value)}
              placeholder="例如：https://mysite.com"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">描述（可选）</label>
            <textarea
              value={newDesc} onChange={e => setNewDesc(e.target.value)}
              placeholder="项目描述..."
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm h-24 resize-none"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button onClick={() => setShowCreate(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700">取消</button>
            <button onClick={handleCreate} disabled={!newName.trim()} className="px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50 transition-all">创建</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
