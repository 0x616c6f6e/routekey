import { appStorage } from '../storage';
import type { ProxyNode } from '../types';
import { logger } from '../utils/logger';

const attempts = new Map<string, number>();
const MAX_ATTEMPTS = 2;
let temporaryNode: ProxyNode | undefined;

export function setTemporaryAuthNode(node?: ProxyNode): void {
  temporaryNode = node;
  attempts.clear();
}

async function credentialsFor(
  details: chrome.webRequest.WebAuthenticationChallengeDetails,
): Promise<chrome.webRequest.BlockingResponse> {
  if (!details.isProxy) return {};
  const count = attempts.get(details.requestId) ?? 0;
  if (count >= MAX_ATTEMPTS) {
    attempts.delete(details.requestId);
    logger.warn('代理认证失败次数过多', { requestId: details.requestId });
    return { cancel: true };
  }

  const [settings, nodes] = await Promise.all([appStorage.getSettings(), appStorage.getNodes()]);
  if (!temporaryNode && (!settings.proxyEnabled || settings.backend.type !== 'native')) return {};
  const node =
    temporaryNode ?? nodes.find((item) => item.id === settings.selectedNodeId && item.enabled);
  if (node && !['http', 'https'].includes(node.protocol)) return {};
  if (!node?.username || node.password === undefined) return {};

  attempts.set(details.requestId, count + 1);
  return { authCredentials: { username: node.username, password: node.password } };
}

export function registerProxyAuth(): void {
  chrome.webRequest.onAuthRequired.addListener(
    (details, callback) => {
      if (!callback) return;
      void credentialsFor(details)
        .then(callback)
        .catch(() => callback({ cancel: true }));
    },
    { urls: ['<all_urls>'] },
    ['asyncBlocking'],
  );

  const cleanup = (details: { requestId: string }): void => {
    attempts.delete(details.requestId);
  };
  chrome.webRequest.onCompleted.addListener(cleanup, { urls: ['<all_urls>'] });
  chrome.webRequest.onErrorOccurred.addListener(cleanup, { urls: ['<all_urls>'] });
}
