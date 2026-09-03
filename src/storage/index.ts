import type { AppSettings, ExportConfig, ProxyNode, ProxyRuntimeState } from '../types';
import { StorageError, ValidationError } from '../utils/errors';
import { defaultSettings, migrateStorage, STORAGE_VERSION } from './migration';
import { appSettingsSchema, exportConfigSchema, proxyNodeSchema } from './schema';

const KEYS = {
  nodes: 'myproxy.nodes',
  settings: 'myproxy.settings',
  version: 'myproxy.version',
  runtime: 'myproxy.runtime',
} as const;

export interface StorageArea {
  get(keys?: string | string[] | Record<string, unknown>): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export class AppStorage {
  constructor(private readonly area: StorageArea = chrome.storage.local) {}

  async initialize(): Promise<void> {
    try {
      const raw = await this.area.get(Object.values(KEYS));
      const migrated = migrateStorage(raw);
      await this.area.set({
        [KEYS.nodes]: migrated.nodes,
        [KEYS.settings]: migrated.settings,
        [KEYS.version]: migrated.version,
      });
    } catch (error) {
      throw new StorageError('无法初始化本地配置', { cause: error });
    }
  }

  async getNodes(): Promise<ProxyNode[]> {
    const data = await this.area.get(KEYS.nodes);
    const parsed = proxyNodeSchema.array().safeParse(data[KEYS.nodes] ?? []);
    if (!parsed.success) throw new StorageError('保存的节点数据格式无效');
    return parsed.data;
  }

  async saveNodes(nodes: ProxyNode[]): Promise<void> {
    const parsed = proxyNodeSchema.array().safeParse(nodes);
    if (!parsed.success)
      throw new ValidationError(parsed.error.issues[0]?.message ?? '节点数据无效');
    await this.area.set({ [KEYS.nodes]: parsed.data });
  }

  async getSettings(): Promise<AppSettings> {
    const data = await this.area.get(KEYS.settings);
    const parsed = appSettingsSchema.safeParse(data[KEYS.settings] ?? defaultSettings);
    if (!parsed.success) throw new StorageError('保存的设置格式无效');
    return parsed.data;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const parsed = appSettingsSchema.safeParse(settings);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? '设置无效');
    await this.area.set({ [KEYS.settings]: parsed.data });
  }

  async saveRuntime(runtime: ProxyRuntimeState): Promise<void> {
    await this.area.set({ [KEYS.runtime]: runtime });
  }

  async importConfig(input: unknown): Promise<ExportConfig> {
    const parsed = exportConfigSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? '导入文件格式无效');
    }
    await this.area.set({
      [KEYS.nodes]: parsed.data.nodes,
      [KEYS.settings]: parsed.data.settings,
      [KEYS.version]: STORAGE_VERSION,
    });
    return parsed.data;
  }

  async exportConfig(includeSecrets = false): Promise<ExportConfig> {
    const [nodes, settings] = await Promise.all([this.getNodes(), this.getSettings()]);
    return {
      format: 'myproxy',
      version: 1,
      nodes: nodes.map((node) => ({
        ...node,
        username: includeSecrets ? node.username : undefined,
        password: includeSecrets ? node.password : undefined,
      })),
      settings: {
        ...settings,
        backend: {
          ...settings.backend,
          secret: includeSecrets ? settings.backend.secret : undefined,
        },
      },
    };
  }
}

export const appStorage = new AppStorage();
