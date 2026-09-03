import type { BackendSettings } from './backend';
import type { ProxyNode } from './node';
import type { ProxyRule } from './rule';

export type ProxyMode = 'direct' | 'global' | 'rule' | 'pac';

export interface AppSettings {
  proxyEnabled: boolean;
  mode: ProxyMode;
  selectedNodeId?: string;
  bypassList: string[];
  proxyRules: ProxyRule[];
  pacUrl?: string;
  latencyTestUrl: string;
  backend: BackendSettings;
}

export interface ProxyRuntimeState {
  enabled: boolean;
  mode: ProxyMode;
  selectedNodeId?: string;
  activeNode?: ProxyNode;
  lastError?: string;
  proxyControlledBy?: string;
}

export interface AppSnapshot {
  nodes: ProxyNode[];
  settings: AppSettings;
  runtime: ProxyRuntimeState;
}
