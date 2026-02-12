import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Globe, Library, FileUp, BarChart3, FolderKanban } from 'lucide-react';
import IntelList from './pages/IntelList';
import SiteDashboard from './pages/SiteDashboard';
import LibraryList from './pages/LibraryList';
import LibraryDetail from './pages/LibraryDetail';
import ExportToLibrary from './pages/ExportToLibrary';
import SnapshotDetail from './pages/SnapshotDetail';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import ImportModal from './components/ImportModal';

const Navbar = ({ onOpenImport }: { onOpenImport: () => void }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);
  const navItems = [
    { path: '/intel', label: '站点智能', icon: Globe },
    { path: '/library', label: '资源库', icon: Library },
    { path: '/projects', label: '外链计划', icon: FolderKanban }
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-10">
            <Link to="/intel" className="flex items-center space-x-2 text-indigo-600 font-black text-2xl tracking-tight">
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                <BarChart3 className="w-6 h-6" />
              </div>
              <span className="hidden sm:inline">Backlink Intel</span>
            </Link>
            <div className="hidden md:flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive(item.path)
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                  <item.icon className={`w-4 h-4 mr-2 ${isActive(item.path) ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={onOpenImport}
              className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 text-white bg-indigo-600 hover:bg-indigo-700 transform active:scale-95 transition-all"
            >
              <FileUp className="w-4 h-4 mr-2" />
              导入数据
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default function App() {
  const [isImportOpen, setIsImportOpen] = useState(false);

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
        <Navbar onOpenImport={() => setIsImportOpen(true)} />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Navigate to="/intel" replace />} />
            <Route path="/intel" element={<IntelList />} />
            <Route path="/intel/:siteId" element={<SiteDashboard />} />
            <Route path="/intel/:siteId/snapshot/:snapshotId" element={<SnapshotDetail />} />
            <Route path="/intel/:siteId/export-to-library" element={<ExportToLibrary />} />
            <Route path="/library" element={<LibraryList />} />
            <Route path="/library/:domainId" element={<LibraryDetail />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
          </Routes>
        </main>
        <footer className="bg-white border-t border-slate-100 py-10 mt-12">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-slate-400 text-sm">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <BarChart3 className="w-4 h-4" />
              <span className="font-bold text-slate-500">Backlink Intel</span>
              <span>&copy; 2025</span>
            </div>
            <div className="flex space-x-6">
              <span>本地离线存储模式</span>
              <a href="#" className="hover:text-indigo-600">隐私声明</a>
            </div>
          </div>
        </footer>
        <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
      </div>
    </HashRouter>
  );
}