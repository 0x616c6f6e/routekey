import type { AppSettings, ProxyNode } from '../types';
import { appSettingsSchema, proxyNodeSchema } from './schema';

export const STORAGE_VERSION = 1;

export const defaultSettings: AppSettings = {
  proxyEnabled: false,
  mode: 'direct',
  bypassList: ['localhost', '127.0.0.1', '[::1]', '*.local', '<local>'],
  proxyRules: [],
  latencyTestUrl: 'https://www.gstatic.com/generate_204',
  backend: { type: 'native' },
};

export interface MigratedStorage {
  version: number;
  nodes: ProxyNode[];
  settings: AppSettings;
}

export function migrateStorage(raw: Record<string, unknown>): MigratedStorage {
  const nodesResult = proxyNodeSchema.array().safeParse(raw['myproxy.nodes']);
  const settingsResult = appSettingsSchema.safeParse(raw['myproxy.settings']);

  return {
    version: STORAGE_VERSION,
    nodes: nodesResult.success ? nodesResult.data : [],
    settings: settingsResult.success ? settingsResult.data : { ...defaultSettings },
  };
}
