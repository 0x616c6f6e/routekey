import type { ProxyNode, ProxyRule } from '../types';
import { ProxyError } from '../utils/errors';

function pacProxy(node: ProxyNode): string {
  const directive = {
    http: 'PROXY',
    https: 'HTTPS',
    socks4: 'SOCKS',
    socks5: 'SOCKS5',
  }[node.protocol];
  return `${directive} ${node.host}:${node.port}`;
}

function normalizedRuleValue(rule: ProxyRule): string {
  return rule.value.trim().toLowerCase().replace(/^\*\./, '').replace(/^\./, '');
}

function conditionForRule(rule: ProxyRule): string | undefined {
  const value = JSON.stringify(normalizedRuleValue(rule));
  switch (rule.type) {
    case 'domain':
      return `host === ${value}`;
    case 'domain-suffix':
      return `(host === ${value} || dnsDomainIs(host, "." + ${value}))`;
    case 'domain-keyword':
      return `host.indexOf(${value}) !== -1`;
    case 'ip-cidr':
      return undefined;
  }
}

function bypassCondition(pattern: string): string | undefined {
  const clean = pattern.trim().toLowerCase();
  if (!clean) return undefined;
  if (clean === '<local>') return 'isPlainHostName(host)';
  if (clean.includes('/')) return undefined;
  const hostPattern = clean.replace(/^https?:\/\//, '').replace(/:\d+$/, '');
  if (hostPattern.startsWith('*.')) {
    const suffix = JSON.stringify(hostPattern.slice(2));
    return `(host === ${suffix} || dnsDomainIs(host, "." + ${suffix}))`;
  }
  if (hostPattern.includes('*') || hostPattern.includes('?')) {
    return `shExpMatch(host, ${JSON.stringify(hostPattern)})`;
  }
  return `host === ${JSON.stringify(hostPattern)}`;
}

export function generatePacScript(
  node: ProxyNode,
  rules: ProxyRule[],
  bypassList: string[],
): string {
  if (!node.enabled) throw new ProxyError('所选节点已停用');

  const lines = ['function FindProxyForURL(url, host) {', '  host = host.toLowerCase();'];

  for (const bypass of bypassList) {
    const condition = bypassCondition(bypass);
    if (condition) lines.push(`  if (${condition}) return "DIRECT";`);
  }

  for (const rule of rules) {
    if (!rule.enabled) continue;
    const condition = conditionForRule(rule);
    if (!condition) continue;
    const result = rule.action === 'proxy' ? pacProxy(node) : 'DIRECT';
    lines.push(`  if (${condition}) return ${JSON.stringify(result)};`);
  }

  lines.push('  return "DIRECT";', '}');
  return lines.join('\n');
}

export function matchesRule(host: string, rule: ProxyRule): boolean {
  if (!rule.enabled || rule.type === 'ip-cidr') return false;
  const normalizedHost = host.toLowerCase().replace(/\.$/, '');
  const value = normalizedRuleValue(rule);
  if (rule.type === 'domain') return normalizedHost === value;
  if (rule.type === 'domain-suffix') {
    return normalizedHost === value || normalizedHost.endsWith(`.${value}`);
  }
  return normalizedHost.includes(value);
}
