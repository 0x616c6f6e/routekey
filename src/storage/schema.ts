import { z } from 'zod';
import type { AppSettings, ExportConfig, ProxyNode, ProxyRule } from '../types';

const trimmedString = z.string().trim();

export const proxyProtocolSchema = z.enum(['http', 'https', 'socks4', 'socks5']);
export const proxyModeSchema = z.enum(['direct', 'global', 'rule', 'pac']);

export const proxyNodeSchema: z.ZodType<ProxyNode> = z.object({
  id: trimmedString.min(1).max(100),
  name: trimmedString.min(1, '节点名称不能为空').max(100),
  protocol: proxyProtocolSchema,
  host: trimmedString.min(1, '主机不能为空').max(253),
  port: z.number().int().min(1).max(65535),
  username: z.string().max(256).optional(),
  password: z.string().max(1024).optional(),
  enabled: z.boolean(),
  tags: z.array(trimmedString.min(1).max(50)).max(30),
  remark: z.string().max(1000).optional(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const proxyRuleSchema: z.ZodType<ProxyRule> = z.object({
  id: trimmedString.min(1).max(100),
  type: z.enum(['domain', 'domain-suffix', 'domain-keyword', 'ip-cidr']),
  value: trimmedString.min(1).max(500),
  action: z.enum(['proxy', 'direct']),
  enabled: z.boolean(),
});

export const backendSettingsSchema = z
  .object({
    type: z.enum(['native', 'mihomo']),
    apiUrl: z.string().url().optional(),
    secret: z.string().max(2048).optional(),
    localProxyHost: trimmedString.min(1).max(253).optional(),
    localProxyPort: z.number().int().min(1).max(65535).optional(),
  })
  .superRefine((value, context) => {
    if (value.type !== 'mihomo') return;
    if (!value.apiUrl || !value.localProxyHost || !value.localProxyPort) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mihomo 模式需要 API 地址及本地代理地址',
      });
      return;
    }
    const api = new URL(value.apiUrl);
    if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(api.hostname)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mihomo API 默认仅允许本机地址',
        path: ['apiUrl'],
      });
    }
  });

export const appSettingsSchema: z.ZodType<AppSettings> = z.object({
  proxyEnabled: z.boolean(),
  mode: proxyModeSchema,
  selectedNodeId: trimmedString.min(1).max(100).optional(),
  bypassList: z.array(trimmedString.min(1).max(500)).max(5000),
  proxyRules: z.array(proxyRuleSchema).max(10000),
  pacUrl: z.string().url().optional(),
  latencyTestUrl: z.string().url(),
  backend: backendSettingsSchema,
});

export const exportConfigSchema: z.ZodType<ExportConfig> = z.object({
  format: z
    .union([z.literal('routekey'), z.literal('myproxy')])
    .transform(() => 'routekey' as const),
  version: z.literal(1),
  nodes: z.array(proxyNodeSchema).max(5000),
  settings: appSettingsSchema,
});

export const extensionMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('GET_STATE') }),
  z.object({ type: z.literal('GET_SNAPSHOT') }),
  z.object({ type: z.literal('SET_ENABLED'), enabled: z.boolean() }),
  z.object({ type: z.literal('SET_MODE'), mode: proxyModeSchema }),
  z.object({ type: z.literal('SELECT_NODE'), nodeId: trimmedString.min(1).max(100) }),
  z.object({ type: z.literal('ADD_NODE'), node: proxyNodeSchema }),
  z.object({ type: z.literal('UPDATE_NODE'), node: proxyNodeSchema }),
  z.object({ type: z.literal('DELETE_NODE'), nodeId: trimmedString.min(1).max(100) }),
  z.object({
    type: z.literal('DELETE_NODES'),
    nodeIds: z.array(trimmedString.min(1).max(100)).max(5000),
  }),
  z.object({
    type: z.literal('REORDER_NODES'),
    nodeIds: z.array(trimmedString.min(1).max(100)).max(5000),
  }),
  z.object({ type: z.literal('TEST_NODE'), nodeId: trimmedString.min(1).max(100) }),
  z.object({ type: z.literal('SAVE_SETTINGS'), settings: appSettingsSchema }),
  z.object({ type: z.literal('SAVE_RULES'), rules: z.array(proxyRuleSchema).max(10000) }),
  z.object({ type: z.literal('IMPORT_CONFIG'), config: z.unknown() }),
  z.object({ type: z.literal('EXPORT_CONFIG'), includeSecrets: z.boolean() }),
  z.object({ type: z.literal('TEST_BACKEND') }),
]);
