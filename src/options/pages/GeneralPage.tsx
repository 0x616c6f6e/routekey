import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Button, Field, Input } from '../../components/ui';
import { useProxyStore } from '../../store/proxy-store';
import type { AppSettings } from '../../types';

export function GeneralPage() {
  const { snapshot, busy, error, saveSettings, clearError } = useProxyStore();
  const [draft, setDraft] = useState<AppSettings>();
  const [bypassText, setBypassText] = useState('');
  useEffect(() => {
    if (!snapshot) return;
    setDraft(snapshot.settings);
    setBypassText(snapshot.settings.bypassList.join('\n'));
  }, [snapshot]);
  if (!draft) return null;

  const save = () =>
    saveSettings({
      ...draft,
      bypassList: bypassText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    });

  return (
    <div className="page-content narrow-page">
      <div className="page-title-row">
        <div>
          <h1>常规设置</h1>
          <p>配置默认模式、直连清单与连通性测试地址。</p>
        </div>
        <Button disabled={busy} onClick={() => void save()}>
          <Save size={17} /> 保存设置
        </Button>
      </div>
      {error ? <ErrorBanner message={error} onClose={clearError} /> : null}
      <section className="settings-section">
        <h2>启动状态</h2>
        <div className="setting-row">
          <div>
            <strong>当前代理状态</strong>
            <p>浏览器重新启动后会恢复这个状态。</p>
          </div>
          <span className={`state-pill ${draft.proxyEnabled ? 'state-on' : ''}`}>
            {draft.proxyEnabled ? '已启用' : '已关闭'}
          </span>
        </div>
        <Field label="默认运行模式">
          <select
            className="input"
            value={draft.mode}
            onChange={(event) =>
              setDraft({ ...draft, mode: event.target.value as AppSettings['mode'] })
            }
          >
            <option value="direct">Direct</option>
            <option value="global">Global</option>
            <option value="rule">Rule</option>
            <option value="pac">PAC URL</option>
          </select>
        </Field>
        {draft.mode === 'pac' ? (
          <Field label="PAC URL" hint="PAC 内容由浏览器获取和执行，请仅使用可信地址。">
            <Input
              value={draft.pacUrl ?? ''}
              placeholder="https://example.com/proxy.pac"
              onChange={(event) => setDraft({ ...draft, pacUrl: event.target.value || undefined })}
            />
          </Field>
        ) : null}
      </section>
      <section className="settings-section">
        <h2>直连清单</h2>
        <Field label="每行一项" hint="支持域名、*.example.com、IP 地址、CIDR 与 <local>。">
          <textarea
            className="input textarea mono"
            rows={9}
            value={bypassText}
            onChange={(event) => setBypassText(event.target.value)}
          />
        </Field>
      </section>
      <section className="settings-section">
        <h2>延迟测试</h2>
        <Field label="测试 URL" hint="原生节点测试会向此地址发起一次请求。">
          <Input
            value={draft.latencyTestUrl}
            onChange={(event) => setDraft({ ...draft, latencyTestUrl: event.target.value })}
          />
        </Field>
      </section>
    </div>
  );
}
