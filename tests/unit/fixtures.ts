import type { AppSettings, ProxyNode } from '../../src/types';

export const node: ProxyNode = {
  id: 'node-1',
  name: 'Local SOCKS',
  protocol: 'socks5',
  host: '127.0.0.1',
  port: 1080,
  username: 'alice',
  password: 'secret-password',
  enabled: true,
  tags: ['local'],
  createdAt: 1,
  updatedAt: 1,
};

export const settings: AppSettings = {
  proxyEnabled: false,
  mode: 'rule',
  selectedNodeId: node.id,
  bypassList: ['localhost', '*.local'],
  proxyRules: [],
  latencyTestUrl: 'https://www.gstatic.com/generate_204',
  backend: { type: 'native' },
};
