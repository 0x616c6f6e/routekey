import type { NodeLatencyResult, ProxyNode } from '../types';
import { appStorage } from '../storage';
import { ProxyError } from '../utils/errors';
import { setTemporaryAuthNode } from './auth-manager';

function setTemporaryProxy(node: ProxyNode): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.proxy.settings.set(
      {
        value: {
          mode: 'fixed_servers',
          rules: { singleProxy: { scheme: node.protocol, host: node.host, port: node.port } },
        },
        scope: 'regular',
      },
      () =>
        chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve(),
    );
  });
}

export async function testNativeNode(
  node: ProxyNode,
  restore: () => Promise<unknown>,
): Promise<NodeLatencyResult> {
  const settings = await appStorage.getSettings();
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    setTemporaryAuthNode(node);
    await setTemporaryProxy(node);
    const response = await fetch(settings.latencyTestUrl, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok && response.status !== 204)
      throw new ProxyError(`测试请求返回 ${response.status}`);
    return {
      nodeId: node.id,
      status: 'connected',
      latency: Math.round(performance.now() - started),
      testedAt: Date.now(),
    };
  } catch (error) {
    return {
      nodeId: node.id,
      status: 'unavailable',
      error: error instanceof Error ? error.message : '测试失败',
      testedAt: Date.now(),
    };
  } finally {
    clearTimeout(timer);
    setTemporaryAuthNode();
    await restore();
  }
}
