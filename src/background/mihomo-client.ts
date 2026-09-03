import { BackendError } from '../utils/errors';

export class MihomoClient {
  constructor(
    private readonly apiUrl: string,
    private readonly secret?: string,
    private readonly timeoutMs = 5000,
  ) {}

  getVersion(): Promise<unknown> {
    return this.request('/version');
  }

  getProxies(): Promise<unknown> {
    return this.request('/proxies');
  }

  getProxy(name: string): Promise<unknown> {
    return this.request(`/proxies/${encodeURIComponent(name)}`);
  }

  async selectProxy(group: string, node: string): Promise<void> {
    await this.request(`/proxies/${encodeURIComponent(group)}`, {
      method: 'PUT',
      body: JSON.stringify({ name: node }),
    });
  }

  async testDelay(name: string, testUrl: string): Promise<number> {
    const result = await this.request(
      `/proxies/${encodeURIComponent(name)}/delay?timeout=${this.timeoutMs}&url=${encodeURIComponent(testUrl)}`,
    );
    if (!result || typeof result !== 'object' || !('delay' in result)) {
      throw new BackendError('Mihomo 返回了无效的延迟结果');
    }
    const delay = (result as { delay: unknown }).delay;
    if (typeof delay !== 'number') throw new BackendError('Mihomo 返回了无效的延迟结果');
    return delay;
  }

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.apiUrl.replace(/\/$/, '')}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.secret ? { Authorization: `Bearer ${this.secret}` } : {}),
          ...init.headers,
        },
      });
      if (!response.ok) throw new BackendError(`Mihomo API 返回 HTTP ${response.status}`);
      if (response.status === 204) return undefined;
      return await response.json();
    } catch (error) {
      if (error instanceof BackendError) throw error;
      throw new BackendError(`无法连接 Mihomo API：${this.apiUrl}`, { cause: error });
    } finally {
      clearTimeout(timer);
    }
  }
}
