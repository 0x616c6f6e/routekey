import type { ExtensionMessage, MessageResponse } from '../types';

export async function sendMessage<T>(message: ExtensionMessage): Promise<T> {
  const response = (await chrome.runtime.sendMessage(message)) as MessageResponse<T> | undefined;
  if (!response) throw new Error('后台服务无响应');
  if (!response.ok) throw new Error(response.error ?? '操作失败，请重试');
  return response.data as T;
}
