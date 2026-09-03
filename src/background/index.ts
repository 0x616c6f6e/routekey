import { appStorage } from '../storage';
import { errorMessage } from '../utils/errors';
import { logger } from '../utils/logger';
import { registerProxyAuth } from './auth-manager';
import { registerMessageHandler } from './message-handler';
import { proxyManager } from './proxy-manager';

async function initialize(restoreProxy: boolean): Promise<void> {
  try {
    await appStorage.initialize();
    const settings = await appStorage.getSettings();
    if (restoreProxy && settings.proxyEnabled) await proxyManager.apply();
  } catch (error) {
    logger.error('扩展初始化失败', { error: errorMessage(error) });
    await chrome.action.setBadgeBackgroundColor({ color: '#c43d3d' });
    await chrome.action.setBadgeText({ text: '!' });
  }
}

registerMessageHandler();
registerProxyAuth();

chrome.runtime.onInstalled.addListener(() => {
  void initialize(true);
});

chrome.runtime.onStartup.addListener(() => {
  void initialize(true);
});

void initialize(false);
