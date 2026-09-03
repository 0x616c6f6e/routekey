import type { ProxyNode } from './node';
import type { AppSettings, ProxyMode } from './proxy';
import type { ProxyRule } from './rule';

export type ExtensionMessage =
  | { type: 'GET_STATE' }
  | { type: 'GET_SNAPSHOT' }
  | { type: 'SET_ENABLED'; enabled: boolean }
  | { type: 'SET_MODE'; mode: ProxyMode }
  | { type: 'SELECT_NODE'; nodeId: string }
  | { type: 'ADD_NODE'; node: ProxyNode }
  | { type: 'UPDATE_NODE'; node: ProxyNode }
  | { type: 'DELETE_NODE'; nodeId: string }
  | { type: 'DELETE_NODES'; nodeIds: string[] }
  | { type: 'REORDER_NODES'; nodeIds: string[] }
  | { type: 'TEST_NODE'; nodeId: string }
  | { type: 'SAVE_SETTINGS'; settings: AppSettings }
  | { type: 'SAVE_RULES'; rules: ProxyRule[] }
  | { type: 'IMPORT_CONFIG'; config: unknown }
  | { type: 'EXPORT_CONFIG'; includeSecrets: boolean }
  | { type: 'TEST_BACKEND' };

export interface MessageResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface ExportConfig {
  format: 'routekey';
  version: 1;
  nodes: ProxyNode[];
  settings: AppSettings;
}
