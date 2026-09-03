export type ProxyProtocol = 'http' | 'https' | 'socks4' | 'socks5';

export interface ProxyNode {
  id: string;
  name: string;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username?: string;
  password?: string;
  enabled: boolean;
  tags: string[];
  remark?: string;
  createdAt: number;
  updatedAt: number;
}

export type NodeStatus = 'connected' | 'unavailable' | 'testing' | 'unknown';

export interface NodeLatencyResult {
  nodeId: string;
  status: Exclude<NodeStatus, 'testing'>;
  latency?: number;
  error?: string;
  testedAt: number;
}
