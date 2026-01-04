import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Lightbulb,
  FlaskConical,
  Users,
  MessageSquare,
  FileText,
  Target,
  FolderKanban,
  Settings,
  StickyNote,
} from 'lucide-react';
import { useStore } from '../../store';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'ダッシュボード', href: '/', icon: LayoutDashboard },
  { name: 'VPoPエージェント', href: '/agent', icon: MessageSquare },
  { name: '仮説ツリー', href: '/hypotheses', icon: Lightbulb },
  { name: '実験ボード', href: '/experiments', icon: FlaskConical },
  { name: '壁打ちセッション', href: '/sessions', icon: Users },
  { name: 'メモ', href: '/memos', icon: StickyNote },
  { name: 'PRD', href: '/prd', icon: FileText },
  { name: 'NSM・指標', href: '/metrics', icon: Target },
  { name: '成果物', href: '/documents', icon: FolderKanban },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { projects, currentProjectId, setCurrentProject } = useStore();
  const currentProject = projects.find((p) => p.id === currentProjectId);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">VPoP Agent</h1>
          <p className="text-xs text-gray-500 mt-1">VP of Product エージェント</p>
        </div>

        {/* Project Selector */}
        <div className="p-4 border-b border-gray-200">
          <label className="block text-xs font-medium text-gray-500 mb-2">
            事業案
          </label>
          <select
            value={currentProjectId || ''}
            onChange={(e) => setCurrentProject(e.target.value || null)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">事業案を選択...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <Link
            to="/projects/new"
            className="block mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            + 新規事業案を作成
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Settings className="w-5 h-5" />
            設定
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Current Project Header */}
        {currentProject && (
          <div className="bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentProject.name}
                </h2>
                <p className="text-sm text-gray-500">{currentProject.description}</p>
              </div>
              <div className="ml-auto">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                  {currentProject.stage}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
