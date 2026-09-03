import { describe, expect, it } from 'vitest';
import { AppStorage, type StorageArea } from '../../src/storage';
import { defaultSettings, migrateStorage } from '../../src/storage/migration';
import { node, settings } from './fixtures';

class MemoryStorage implements StorageArea {
  data: Record<string, unknown> = {};

  async get(keys?: string | string[]): Promise<Record<string, unknown>> {
    if (!keys) return { ...this.data };
    const list = typeof keys === 'string' ? [keys] : keys;
    return Object.fromEntries(list.map((key) => [key, this.data[key]]));
  }

  async set(items: Record<string, unknown>): Promise<void> {
    Object.assign(this.data, items);
  }
}

describe('storage', () => {
  it('migrates missing or invalid data to safe defaults', () => {
    expect(migrateStorage({ 'myproxy.nodes': 'invalid' })).toEqual({
      version: 1,
      nodes: [],
      settings: defaultSettings,
    });
  });

  it('persists validated nodes and settings', async () => {
    const area = new MemoryStorage();
    const storage = new AppStorage(area);
    await storage.initialize();
    await storage.saveNodes([node]);
    await storage.saveSettings(settings);
    expect(await storage.getNodes()).toEqual([node]);
    expect(await storage.getSettings()).toEqual(settings);
  });

  it('rejects an invalid import without overwriting storage', async () => {
    const area = new MemoryStorage();
    const storage = new AppStorage(area);
    await storage.initialize();
    await storage.saveNodes([node]);
    await expect(storage.importConfig({ format: 'myproxy', version: 99 })).rejects.toThrow();
    expect(await storage.getNodes()).toEqual([node]);
  });

  it('excludes credentials from exports by default', async () => {
    const area = new MemoryStorage();
    const storage = new AppStorage(area);
    await storage.initialize();
    await storage.saveNodes([node]);
    await storage.saveSettings({
      ...settings,
      backend: {
        type: 'mihomo',
        apiUrl: 'http://127.0.0.1:9090',
        localProxyHost: '127.0.0.1',
        localProxyPort: 7890,
        secret: 'backend-secret',
      },
    });
    const exported = await storage.exportConfig(false);
    expect(exported.nodes[0]?.username).toBeUndefined();
    expect(exported.nodes[0]?.password).toBeUndefined();
    expect(exported.settings.backend.secret).toBeUndefined();
  });
});
