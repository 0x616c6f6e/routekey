import { Boxes, Cable, CircleHelp, Download, ListTree, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useProxyStore } from '../store/proxy-store';
import { AboutPage } from './pages/AboutPage';
import { BackendPage } from './pages/BackendPage';
import { GeneralPage } from './pages/GeneralPage';
import { ImportExportPage } from './pages/ImportExportPage';
import { NodesPage } from './pages/NodesPage';
import { RulesPage } from './pages/RulesPage';

type Page = 'general' | 'nodes' | 'rules' | 'backend' | 'transfer' | 'about';

const nav: { id: Page; label: string; icon: typeof Settings2 }[] = [
  { id: 'general', label: '常规设置', icon: Settings2 },
  { id: 'nodes', label: '代理节点', icon: Boxes },
  { id: 'rules', label: '域名规则', icon: ListTree },
  { id: 'backend', label: '本地后端', icon: Cable },
  { id: 'transfer', label: '导入与导出', icon: Download },
  { id: 'about', label: '关于', icon: CircleHelp },
];

export function Options() {
  const [page, setPage] = useState<Page>(() => {
    const hash = location.hash.slice(1);
    return nav.some((item) => item.id === hash) ? (hash as Page) : 'general';
  });
  const { load, loading } = useProxyStore();
  useEffect(() => void load(), [load]);

  const navigate = (next: Page) => {
    setPage(next);
    history.replaceState(null, '', `#${next}`);
  };

  return (
    <div className="options-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">R</div>
          <div>
            <strong>routekey</strong>
            <span>本地代理控制台</span>
          </div>
        </div>
        <nav aria-label="设置导航">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={page === item.id ? 'active' : ''}
                onClick={() => navigate(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <span className="privacy-dot" />
          仅保存在本机
        </div>
      </aside>
      <main className="options-main">
        {loading ? (
          <div className="loading-state">
            <span className="spinner" />
            正在载入配置...
          </div>
        ) : null}
        {!loading && page === 'general' ? <GeneralPage /> : null}
        {!loading && page === 'nodes' ? <NodesPage /> : null}
        {!loading && page === 'rules' ? <RulesPage /> : null}
        {!loading && page === 'backend' ? <BackendPage /> : null}
        {!loading && page === 'transfer' ? <ImportExportPage /> : null}
        {!loading && page === 'about' ? <AboutPage /> : null}
      </main>
    </div>
  );
}
