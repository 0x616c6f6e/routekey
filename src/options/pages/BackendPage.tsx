import { Cable, Eye, EyeOff, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Button, Field, IconButton, Input } from '../../components/ui';
import { useProxyStore } from '../../store/proxy-store';
import type { AppSettings } from '../../types';

export function BackendPage() {
  const { snapshot, busy, error, saveSettings, testBackend, clearError } = useProxyStore();
  const [draft, setDraft] = useState<AppSettings>();
  const [showSecret, setShowSecret] = useState(false);
  const [testMessage, setTestMessage] = useState<string>();
  useEffect(() => setDraft(snapshot?.settings), [snapshot]);
  if (!draft) return null;
  const backend = draft.backend;
  const patch = (value: Partial<AppSettings['backend']>) =>
    setDraft({ ...draft, backend: { ...backend, ...value } });

  return (
    <div className="page-content narrow-page">
      <div className="page-title-row">
        <div>
          <h1>本地后端</h1>
          <p>使用 Mihomo 承载浏览器不能直接处理的代理协议。</p>
        </div>
        <Button disabled={busy} onClick={() => void saveSettings(draft)}>
          <Save size={17} /> 保存配置
        </Button>
      </div>
      {error ? <ErrorBanner message={error} onClose={clearError} /> : null}
      <section className="settings-section">
        <Field label="后端类型">
          <div className="segmented wide-segmented">
            <button
              className={backend.type === 'native' ? 'active' : ''}
              onClick={() => patch({ type: 'native' })}
            >
              浏览器原生
            </button>
            <button
              className={backend.type === 'mihomo' ? 'active' : ''}
              onClick={() =>
                patch({
                  type: 'mihomo',
                  apiUrl: backend.apiUrl ?? 'http://127.0.0.1:9090',
                  localProxyHost: backend.localProxyHost ?? '127.0.0.1',
                  localProxyPort: backend.localProxyPort ?? 7890,
                })
              }
            >
              Mihomo
            </button>
          </div>
        </Field>
        {backend.type === 'mihomo' ? (
          <>
            <Field label="API 地址" hint="出于安全考虑，仅允许 localhost 与回环地址。">
              <Input
                value={backend.apiUrl ?? ''}
                onChange={(e) => patch({ apiUrl: e.target.value })}
              />
            </Field>
            <Field label="API Secret">
              <div className="password-input">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={backend.secret ?? ''}
                  onChange={(e) => patch({ secret: e.target.value || undefined })}
                />
                <IconButton
                  label={showSecret ? '隐藏 Secret' : '显示 Secret'}
                  onClick={() => setShowSecret((v) => !v)}
                >
                  {showSecret ? <EyeOff size={17} /> : <Eye size={17} />}
                </IconButton>
              </div>
            </Field>
            <div className="form-grid">
              <Field label="本地代理主机">
                <Input
                  value={backend.localProxyHost ?? ''}
                  onChange={(e) => patch({ localProxyHost: e.target.value })}
                />
              </Field>
              <Field label="本地代理端口">
                <Input
                  type="number"
                  min={1}
                  max={65535}
                  value={backend.localProxyPort ?? ''}
                  onChange={(e) => patch({ localProxyPort: Number(e.target.value) })}
                />
              </Field>
            </div>
            <div className="inline-test">
              <Button
                variant="secondary"
                onClick={() =>
                  void testBackend()
                    .then(() => setTestMessage('连接成功'))
                    .catch((cause: unknown) =>
                      setTestMessage(cause instanceof Error ? cause.message : '连接失败'),
                    )
                }
              >
                <Cable size={17} /> 测试连接
              </Button>
              {testMessage ? <span>{testMessage}</span> : null}
            </div>
          </>
        ) : (
          <div className="info-strip">
            原生模式直接使用 Chrome 的代理 API，支持 HTTP、HTTPS、SOCKS4 和 SOCKS5。
          </div>
        )}
      </section>
    </div>
  );
}
