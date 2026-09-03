import { AlertTriangle, Check, Gauge, Plus, Settings, Wifi, WifiOff } from 'lucide-react';
import { useEffect } from 'react';
import { ErrorBanner } from '../components/ErrorBanner';
import { Button, IconButton, Toggle } from '../components/ui';
import { useProxyStore } from '../store/proxy-store';
import type { ProxyMode } from '../types';

const popupModes: { mode: ProxyMode; label: string }[] = [
  { mode: 'rule', label: 'Rule' },
  { mode: 'global', label: 'Global' },
  { mode: 'direct', label: 'Direct' },
];

function openOptions(path = ''): void {
  if (path) {
    void chrome.tabs.create({ url: chrome.runtime.getURL(`options.html#${path}`) });
  } else {
    void chrome.runtime.openOptionsPage();
  }
}

export function Popup() {
  const {
    snapshot,
    loading,
    busy,
    error,
    latencies,
    load,
    setEnabled,
    setMode,
    selectNode,
    testNode,
    clearError,
  } = useProxyStore();
  useEffect(() => void load(), [load]);

  if (loading)
    return (
      <div className="popup-loading">
        <span className="spinner" />
        载入中
      </div>
    );
  if (!snapshot)
    return (
      <div className="popup-failure">
        <AlertTriangle size={24} />
        <strong>无法连接后台服务</strong>
        <p>{error}</p>
        <Button onClick={() => void load()}>重试</Button>
      </div>
    );

  const { nodes, settings, runtime } = snapshot;
  const enabledNodes = nodes.filter((node) => node.enabled);
  const active = runtime.activeNode ?? nodes.find((node) => node.id === settings.selectedNodeId);
  const conflict =
    runtime.proxyControlledBy === 'controlled_by_other_extensions' ||
    runtime.proxyControlledBy === 'not_controllable';

  return (
    <div className="popup-shell">
      <header className="popup-header">
        <div className="popup-brand">
          <div className="brand-mark">M</div>
          <div>
            <strong>MyProxy</strong>
            <span>{settings.proxyEnabled ? '代理已启用' : '代理已关闭'}</span>
          </div>
        </div>
        <IconButton label="打开设置" onClick={() => openOptions()}>
          <Settings size={19} />
        </IconButton>
      </header>

      <main className="popup-main">
        {error ? <ErrorBanner message={error} onClose={clearError} /> : null}
        {conflict ? <ErrorBanner message={runtime.lastError ?? '代理设置被其他程序控制'} /> : null}

        {nodes.length === 0 ? (
          <div className="popup-onboarding">
            <div className="onboarding-symbol">
              <Wifi size={30} />
            </div>
            <h1>添加第一个代理节点</h1>
            <p>MyProxy 不提供公共节点。配置你自己的 HTTP 或 SOCKS 代理即可开始。</p>
            <Button onClick={() => openOptions('nodes')}>
              <Plus size={17} /> 打开节点设置
            </Button>
          </div>
        ) : (
          <>
            <section className="proxy-control">
              <div className="control-copy">
                <span className={`connection-icon ${settings.proxyEnabled ? 'connected' : ''}`}>
                  {settings.proxyEnabled ? <Wifi size={19} /> : <WifiOff size={19} />}
                </span>
                <div>
                  <strong>浏览器代理</strong>
                  <span>
                    {runtime.lastError ? '配置异常' : settings.proxyEnabled ? '运行中' : '已停止'}
                  </span>
                </div>
              </div>
              <Toggle
                checked={settings.proxyEnabled}
                disabled={busy || conflict}
                onChange={(checked) => void setEnabled(checked)}
                label={settings.proxyEnabled ? 'ON' : 'OFF'}
              />
            </section>

            <section className="popup-section">
              <span className="section-label">运行模式</span>
              <div className="segmented">
                {popupModes.map((item) => (
                  <button
                    key={item.mode}
                    className={settings.mode === item.mode ? 'active' : ''}
                    disabled={busy}
                    onClick={() => void setMode(item.mode)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="current-node">
              <span className="section-label">当前节点</span>
              <div className="current-row">
                <div>
                  <strong>
                    {settings.mode === 'direct' ? 'DIRECT' : (active?.name ?? '未选择节点')}
                  </strong>
                  <span>
                    {settings.mode === 'direct'
                      ? '不经过代理服务器'
                      : active
                        ? `${active.protocol.toUpperCase()} · ${active.host}:${active.port}`
                        : '请在下方选择'}
                  </span>
                </div>
                {active && settings.mode !== 'direct' ? (
                  <span className="latency-value">
                    {latencies[active.id]?.latency ? `${latencies[active.id]?.latency} ms` : '--'}
                  </span>
                ) : null}
              </div>
            </section>

            <section className="popup-section nodes-section">
              <div className="section-heading">
                <span className="section-label">可用节点</span>
                <span>{enabledNodes.length} 个</span>
              </div>
              <div className="popup-node-list">
                {enabledNodes.map((node) => {
                  const selected = node.id === settings.selectedNodeId;
                  const latency = latencies[node.id];
                  return (
                    <button
                      key={node.id}
                      className={selected ? 'selected' : ''}
                      disabled={busy}
                      onClick={() => void selectNode(node.id)}
                    >
                      <span className="node-protocol">
                        {node.protocol.startsWith('socks') ? 'S' : 'H'}
                      </span>
                      <span className="node-copy">
                        <strong>{node.name}</strong>
                        <small>
                          {node.host}:{node.port}
                        </small>
                      </span>
                      <span
                        className="node-latency"
                        title="测试延迟"
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          void testNode(node.id);
                        }}
                      >
                        <Gauge size={14} />
                        {latency?.latency ? `${latency.latency}ms` : '--'}
                      </span>
                      {selected ? <Check size={17} className="node-check" /> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
      <footer className="popup-footer">
        <span>
          <span className="privacy-dot" />
          本地配置
        </span>
        <button onClick={() => openOptions()}>管理全部设置</button>
      </footer>
    </div>
  );
}
