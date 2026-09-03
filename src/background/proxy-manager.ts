import type { AppSettings, ProxyNode, ProxyRuntimeState } from '../types';
import { ProxyError } from '../utils/errors';
import { logger } from '../utils/logger';
import { AppStorage, appStorage } from '../storage';
import { generatePacScript } from './pac-generator';

function chromeError(): Error | undefined {
  const message = chrome.runtime.lastError?.message;
  return message ? new Error(message) : undefined;
}

function setProxy(value: chrome.proxy.ProxyConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.proxy.settings.set({ value, scope: 'regular' }, () => {
      const error = chromeError();
      if (error) reject(error);
      else resolve();
    });
  });
}

function clearProxy(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.proxy.settings.clear({ scope: 'regular' }, () => {
      const error = chromeError();
      if (error) reject(error);
      else resolve();
    });
  });
}

interface ProxySettingState {
  levelOfControl: string;
  value: unknown;
  incognitoSpecific?: boolean;
}

function getProxy(): Promise<ProxySettingState> {
  return new Promise((resolve) => {
    chrome.proxy.settings.get({ incognito: false }, (details) => resolve(details));
  });
}

function nativeProxyServer(node: ProxyNode): chrome.proxy.ProxyServer {
  return { scheme: node.protocol, host: node.host, port: node.port };
}

export class BrowserProxyManager {
  constructor(private readonly storage: AppStorage = appStorage) {}

  async enable(): Promise<ProxyRuntimeState> {
    const settings = await this.storage.getSettings();
    settings.proxyEnabled = true;
    await this.storage.saveSettings(settings);
    return this.apply();
  }

  async disable(): Promise<ProxyRuntimeState> {
    const settings = await this.storage.getSettings();
    settings.proxyEnabled = false;
    await this.storage.saveSettings(settings);
    try {
      await clearProxy();
      await chrome.action.setBadgeText({ text: '' });
      return this.updateRuntime(settings);
    } catch (error) {
      throw new ProxyError('无法释放浏览器代理设置', { cause: error });
    }
  }

  async apply(): Promise<ProxyRuntimeState> {
    const [settings, nodes] = await Promise.all([
      this.storage.getSettings(),
      this.storage.getNodes(),
    ]);

    if (!settings.proxyEnabled) {
      await clearProxy();
      await chrome.action.setBadgeText({ text: '' });
      return this.updateRuntime(settings);
    }

    const control = await getProxy();
    if (['controlled_by_other_extensions', 'not_controllable'].includes(control.levelOfControl)) {
      const message =
        control.levelOfControl === 'controlled_by_other_extensions'
          ? '代理设置正由其他扩展控制'
          : '浏览器策略禁止此扩展修改代理';
      const runtime = await this.updateRuntime(
        settings,
        undefined,
        message,
        control.levelOfControl,
      );
      throw new ProxyError(runtime.lastError ?? message);
    }

    let activeNode: ProxyNode | undefined;
    try {
      if (settings.mode === 'direct') {
        await setProxy({ mode: 'direct' });
      } else if (settings.mode === 'pac') {
        if (!settings.pacUrl) throw new ProxyError('请先配置 PAC URL');
        await setProxy({
          mode: 'pac_script',
          pacScript: { url: settings.pacUrl, mandatory: true },
        });
      } else {
        activeNode = this.resolveNode(settings, nodes);
        if (settings.mode === 'global') {
          await setProxy({
            mode: 'fixed_servers',
            rules: { singleProxy: nativeProxyServer(activeNode), bypassList: settings.bypassList },
          });
        } else {
          await setProxy({
            mode: 'pac_script',
            pacScript: {
              data: generatePacScript(activeNode, settings.proxyRules, settings.bypassList),
              mandatory: true,
            },
          });
        }
      }
      await this.updateBadge(true, settings.mode);
      return this.updateRuntime(settings, activeNode);
    } catch (error) {
      const message = error instanceof Error ? error.message : '无法应用代理设置';
      await this.updateBadge(false, settings.mode);
      await this.updateRuntime(settings, activeNode, message);
      if (error instanceof ProxyError) throw error;
      throw new ProxyError(`无法应用代理设置：${message}`, { cause: error });
    }
  }

  async getState(): Promise<ProxyRuntimeState> {
    const [settings, nodes, control] = await Promise.all([
      this.storage.getSettings(),
      this.storage.getNodes(),
      getProxy(),
    ]);
    const activeNode = nodes.find((node: ProxyNode) => node.id === settings.selectedNodeId);
    const conflict = ['controlled_by_other_extensions', 'not_controllable'].includes(
      control.levelOfControl,
    );
    return this.updateRuntime(
      settings,
      activeNode,
      conflict ? '代理设置正由其他扩展或浏览器策略控制' : undefined,
      control.levelOfControl,
    );
  }

  private resolveNode(settings: AppSettings, nodes: ProxyNode[]): ProxyNode {
    if (settings.backend.type === 'mihomo') {
      return {
        id: 'mihomo-local',
        name: 'Mihomo Local',
        protocol: 'http',
        host: settings.backend.localProxyHost ?? '127.0.0.1',
        port: settings.backend.localProxyPort ?? 7890,
        enabled: true,
        tags: ['mihomo'],
        createdAt: 0,
        updatedAt: 0,
      };
    }
    const node = nodes.find((item) => item.id === settings.selectedNodeId);
    if (!node) throw new ProxyError('请先选择一个代理节点');
    if (!node.enabled) throw new ProxyError('所选代理节点已停用');
    return node;
  }

  private async updateRuntime(
    settings: AppSettings,
    activeNode?: ProxyNode,
    lastError?: string,
    proxyControlledBy?: string,
  ): Promise<ProxyRuntimeState> {
    const runtime: ProxyRuntimeState = {
      enabled: settings.proxyEnabled,
      mode: settings.mode,
      selectedNodeId: settings.selectedNodeId,
      activeNode,
      lastError,
      proxyControlledBy,
    };
    await this.storage.saveRuntime(runtime);
    return runtime;
  }

  private async updateBadge(success: boolean, mode: string): Promise<void> {
    try {
      await chrome.action.setBadgeBackgroundColor({ color: success ? '#16805b' : '#c43d3d' });
      await chrome.action.setBadgeText({ text: success ? (mode === 'direct' ? 'D' : 'ON') : '!' });
    } catch (error) {
      logger.warn('无法更新扩展徽标', { error: error instanceof Error ? error.message : 'error' });
    }
  }
}

export const proxyManager = new BrowserProxyManager();
