import type { AppSnapshot, ExtensionMessage, MessageResponse, ProxyNode } from '../types';
import { appStorage } from '../storage';
import { extensionMessageSchema } from '../storage/schema';
import { errorMessage, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { testNativeNode } from './latency';
import { MihomoClient } from './mihomo-client';
import { proxyManager } from './proxy-manager';

let operationQueue: Promise<unknown> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const next = operationQueue.then(operation, operation);
  operationQueue = next.catch(() => undefined);
  return next;
}

async function snapshot(): Promise<AppSnapshot> {
  const [nodes, settings, runtime] = await Promise.all([
    appStorage.getNodes(),
    appStorage.getSettings(),
    proxyManager.getState(),
  ]);
  return { nodes, settings, runtime };
}

async function applyIfNeeded(): Promise<void> {
  const settings = await appStorage.getSettings();
  if (settings.proxyEnabled) await proxyManager.apply();
}

async function saveNode(node: ProxyNode, update: boolean): Promise<AppSnapshot> {
  const nodes = await appStorage.getNodes();
  const index = nodes.findIndex((item) => item.id === node.id);
  if (update && index < 0) throw new ValidationError('要编辑的节点不存在');
  if (!update && index >= 0) throw new ValidationError('节点 ID 已存在');
  if (update) nodes[index] = node;
  else nodes.push(node);
  await appStorage.saveNodes(nodes);

  const settings = await appStorage.getSettings();
  if (update && settings.selectedNodeId === node.id && !node.enabled) {
    settings.selectedNodeId = nodes.find((item) => item.enabled)?.id;
    if (!settings.selectedNodeId && settings.mode !== 'direct') settings.proxyEnabled = false;
  }
  if (!settings.selectedNodeId && node.enabled) {
    settings.selectedNodeId = node.id;
  }
  await appStorage.saveSettings(settings);
  await applyIfNeeded();
  return snapshot();
}

async function handle(message: ExtensionMessage): Promise<unknown> {
  switch (message.type) {
    case 'GET_STATE':
      return proxyManager.getState();
    case 'GET_SNAPSHOT':
      return snapshot();
    case 'SET_ENABLED':
      return message.enabled ? proxyManager.enable() : proxyManager.disable();
    case 'SET_MODE': {
      const settings = await appStorage.getSettings();
      settings.mode = message.mode;
      await appStorage.saveSettings(settings);
      if (settings.proxyEnabled) await proxyManager.apply();
      return snapshot();
    }
    case 'SELECT_NODE': {
      const nodes = await appStorage.getNodes();
      const selected = nodes.find((node) => node.id === message.nodeId);
      if (!selected) throw new ValidationError('所选节点不存在');
      if (!selected.enabled) throw new ValidationError('所选节点已停用');
      const settings = await appStorage.getSettings();
      settings.selectedNodeId = selected.id;
      await appStorage.saveSettings(settings);
      await applyIfNeeded();
      return snapshot();
    }
    case 'ADD_NODE':
      return saveNode(message.node, false);
    case 'UPDATE_NODE':
      return saveNode(message.node, true);
    case 'DELETE_NODE':
    case 'DELETE_NODES': {
      const ids = new Set(message.type === 'DELETE_NODE' ? [message.nodeId] : message.nodeIds);
      const nodes = (await appStorage.getNodes()).filter((node) => !ids.has(node.id));
      await appStorage.saveNodes(nodes);
      const settings = await appStorage.getSettings();
      if (settings.selectedNodeId && ids.has(settings.selectedNodeId)) {
        settings.selectedNodeId = nodes.find((node) => node.enabled)?.id;
        if (!settings.selectedNodeId && settings.mode !== 'direct') settings.proxyEnabled = false;
        await appStorage.saveSettings(settings);
      }
      if (settings.proxyEnabled) await proxyManager.apply();
      else await proxyManager.disable();
      return snapshot();
    }
    case 'REORDER_NODES': {
      const nodes = await appStorage.getNodes();
      const byId = new Map(nodes.map((node) => [node.id, node]));
      if (message.nodeIds.length !== nodes.length || message.nodeIds.some((id) => !byId.has(id))) {
        throw new ValidationError('节点排序数据不完整');
      }
      await appStorage.saveNodes(message.nodeIds.map((id) => byId.get(id)!));
      return snapshot();
    }
    case 'TEST_NODE': {
      const nodes = await appStorage.getNodes();
      const node = nodes.find((item) => item.id === message.nodeId);
      if (!node) throw new ValidationError('测试节点不存在');
      return testNativeNode(node, () => proxyManager.apply());
    }
    case 'SAVE_SETTINGS':
      await appStorage.saveSettings(message.settings);
      if (message.settings.proxyEnabled) await proxyManager.apply();
      else await proxyManager.disable();
      return snapshot();
    case 'SAVE_RULES': {
      const settings = await appStorage.getSettings();
      settings.proxyRules = message.rules;
      await appStorage.saveSettings(settings);
      await applyIfNeeded();
      return snapshot();
    }
    case 'IMPORT_CONFIG':
      await appStorage.importConfig(message.config);
      if ((await appStorage.getSettings()).proxyEnabled) await proxyManager.apply();
      else await proxyManager.disable();
      return snapshot();
    case 'EXPORT_CONFIG':
      return appStorage.exportConfig(message.includeSecrets);
    case 'TEST_BACKEND': {
      const settings = await appStorage.getSettings();
      if (settings.backend.type !== 'mihomo' || !settings.backend.apiUrl) {
        throw new ValidationError('请先保存 Mihomo 配置');
      }
      return new MihomoClient(settings.backend.apiUrl, settings.backend.secret).getVersion();
    }
  }
}

export function registerMessageHandler(): void {
  chrome.runtime.onMessage.addListener((raw: unknown, _sender, sendResponse) => {
    const parsed = extensionMessageSchema.safeParse(raw);
    if (!parsed.success) {
      sendResponse({ ok: false, error: '消息格式无效' } satisfies MessageResponse);
      return false;
    }

    const parsedMessage = parsed.data as ExtensionMessage;
    void serialize(() => handle(parsedMessage))
      .then((data) => sendResponse({ ok: true, data } satisfies MessageResponse))
      .catch((error: unknown) => {
        const errorText = errorMessage(error);
        logger.error('后台操作失败', { type: parsedMessage.type, error: errorText });
        sendResponse({ ok: false, error: errorText } satisfies MessageResponse);
      });
    return true;
  });
}
