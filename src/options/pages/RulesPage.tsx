import { Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Button, EmptyState, IconButton, Input } from '../../components/ui';
import { useProxyStore } from '../../store/proxy-store';
import type { ProxyRule } from '../../types';
import { createId } from '../../utils/id';

export function RulesPage() {
  const { snapshot, busy, error, saveRules, clearError } = useProxyStore();
  const [rules, setRules] = useState<ProxyRule[]>([]);
  useEffect(() => setRules(snapshot?.settings.proxyRules ?? []), [snapshot?.settings.proxyRules]);

  const addRule = () =>
    setRules((current) => [
      ...current,
      { id: createId(), type: 'domain-suffix', value: '', action: 'proxy', enabled: true },
    ]);

  const update = (id: string, patch: Partial<ProxyRule>) =>
    setRules((current) => current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));

  return (
    <div className="page-content">
      <div className="page-title-row">
        <div>
          <h1>域名规则</h1>
          <p>Rule 模式按列表从上到下匹配，未匹配的请求默认直连。</p>
        </div>
        <div className="row-actions">
          <Button variant="secondary" onClick={addRule}>
            <Plus size={17} /> 添加规则
          </Button>
          <Button
            disabled={busy || rules.some((rule) => !rule.value.trim())}
            onClick={() => void saveRules(rules)}
          >
            <Save size={17} /> 保存规则
          </Button>
        </div>
      </div>
      {error ? <ErrorBanner message={error} onClose={clearError} /> : null}
      <div className="info-strip">
        Bypass 列表始终优先于此处规则。IP-CIDR 已保留数据结构，但 V1 的 PAC 生成器会跳过该类型。
      </div>
      {rules.length === 0 ? (
        <EmptyState title="没有自定义规则" description="添加需要代理或强制直连的域名规则。">
          <Button onClick={addRule}>
            <Plus size={17} /> 添加第一条规则
          </Button>
        </EmptyState>
      ) : (
        <div className="rules-list">
          <div className="rule-head">
            <span>启用</span>
            <span>匹配类型</span>
            <span>匹配值</span>
            <span>动作</span>
            <span />
          </div>
          {rules.map((rule) => (
            <div className="rule-row" key={rule.id}>
              <input
                type="checkbox"
                aria-label="启用规则"
                checked={rule.enabled}
                onChange={(e) => update(rule.id, { enabled: e.target.checked })}
              />
              <select
                className="input"
                value={rule.type}
                onChange={(e) => update(rule.id, { type: e.target.value as ProxyRule['type'] })}
              >
                <option value="domain">完整域名</option>
                <option value="domain-suffix">域名后缀</option>
                <option value="domain-keyword">域名关键字</option>
                <option value="ip-cidr">IP-CIDR</option>
              </select>
              <Input
                value={rule.value}
                placeholder="example.com"
                spellCheck={false}
                onChange={(e) => update(rule.id, { value: e.target.value })}
              />
              <select
                className="input"
                value={rule.action}
                onChange={(e) => update(rule.id, { action: e.target.value as ProxyRule['action'] })}
              >
                <option value="proxy">代理</option>
                <option value="direct">直连</option>
              </select>
              <IconButton
                label="删除规则"
                className="danger-icon"
                onClick={() => setRules((current) => current.filter((item) => item.id !== rule.id))}
              >
                <Trash2 size={17} />
              </IconButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
