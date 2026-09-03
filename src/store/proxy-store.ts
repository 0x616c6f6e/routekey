import { create } from 'zustand';
import type {
  AppSettings,
  AppSnapshot,
  ExportConfig,
  NodeLatencyResult,
  ProxyMode,
  ProxyNode,
  ProxyRule,
} from '../types';
import { sendMessage } from '../utils/messaging';

interface ProxyStore {
  snapshot?: AppSnapshot;
  loading: boolean;
  busy: boolean;
  error?: string;
  latencies: Record<string, NodeLatencyResult>;
  load(): Promise<void>;
  setEnabled(enabled: boolean): Promise<void>;
  setMode(mode: ProxyMode): Promise<void>;
  selectNode(nodeId: string): Promise<void>;
  saveNode(node: ProxyNode, update: boolean): Promise<void>;
  deleteNodes(nodeIds: string[]): Promise<void>;
  reorderNodes(nodeIds: string[]): Promise<void>;
  saveSettings(settings: AppSettings): Promise<void>;
  saveRules(rules: ProxyRule[]): Promise<void>;
  testNode(nodeId: string): Promise<void>;
  importConfig(config: unknown): Promise<void>;
  exportConfig(includeSecrets: boolean): Promise<ExportConfig>;
  testBackend(): Promise<unknown>;
  clearError(): void;
}

async function updateSnapshot(
  set: (value: Partial<ProxyStore>) => void,
  operation: () => Promise<AppSnapshot>,
): Promise<void> {
  set({ busy: true, error: undefined });
  try {
    set({ snapshot: await operation() });
  } catch (error) {
    set({ error: error instanceof Error ? error.message : '操作失败' });
    throw error;
  } finally {
    set({ busy: false });
  }
}

export const useProxyStore = create<ProxyStore>((set) => ({
  loading: true,
  busy: false,
  latencies: {},
  async load() {
    set({ loading: true, error: undefined });
    try {
      set({ snapshot: await sendMessage<AppSnapshot>({ type: 'GET_SNAPSHOT' }) });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '无法载入配置' });
    } finally {
      set({ loading: false });
    }
  },
  setEnabled: (enabled) =>
    updateSnapshot(set, async () => {
      await sendMessage({ type: 'SET_ENABLED', enabled });
      return sendMessage<AppSnapshot>({ type: 'GET_SNAPSHOT' });
    }),
  setMode: (mode) => updateSnapshot(set, () => sendMessage({ type: 'SET_MODE', mode })),
  selectNode: (nodeId) => updateSnapshot(set, () => sendMessage({ type: 'SELECT_NODE', nodeId })),
  saveNode: (node, update) =>
    updateSnapshot(set, () => sendMessage({ type: update ? 'UPDATE_NODE' : 'ADD_NODE', node })),
  deleteNodes: (nodeIds) =>
    updateSnapshot(set, () => sendMessage({ type: 'DELETE_NODES', nodeIds })),
  reorderNodes: (nodeIds) =>
    updateSnapshot(set, () => sendMessage({ type: 'REORDER_NODES', nodeIds })),
  saveSettings: (settings) =>
    updateSnapshot(set, () => sendMessage({ type: 'SAVE_SETTINGS', settings })),
  saveRules: (rules) => updateSnapshot(set, () => sendMessage({ type: 'SAVE_RULES', rules })),
  async testNode(nodeId) {
    set({ busy: true, error: undefined });
    try {
      const result = await sendMessage<NodeLatencyResult>({ type: 'TEST_NODE', nodeId });
      set((state) => ({ latencies: { ...state.latencies, [nodeId]: result } }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '延迟测试失败' });
    } finally {
      set({ busy: false });
    }
  },
  importConfig: (config) =>
    updateSnapshot(set, () => sendMessage({ type: 'IMPORT_CONFIG', config })),
  exportConfig: (includeSecrets) =>
    sendMessage<ExportConfig>({ type: 'EXPORT_CONFIG', includeSecrets }),
  testBackend: () => sendMessage({ type: 'TEST_BACKEND' }),
  clearError: () => set({ error: undefined }),
}));
