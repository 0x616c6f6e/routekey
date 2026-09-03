# MyProxy Browser Extension 项目实现文档

## 1. 项目目标

实现一个类似 GHelper 的 Chrome / Edge 浏览器代理扩展，但所有代理节点均由用户自行配置和管理。

第一阶段目标是实现一个完全本地化、无需第三方账号系统的浏览器插件，支持：

- HTTP 代理
- HTTPS 代理
- SOCKS4 代理
- SOCKS5 代理
- 多节点管理
- 节点快速切换
- Direct / Global / Rule / PAC 模式
- 用户名密码认证
- Bypass 直连列表
- 自定义域名代理规则
- JSON 配置导入 / 导出
- 节点延迟测试
- 可选 Mihomo / Clash Meta 后端控制
- 后续可扩展 sing-box

第一版优先保证 Chrome / Edge Manifest V3 可正常运行。

---

## 2. 产品定位

项目定位：

> 一个本地优先、用户自主管理节点、可独立运行，也可控制 Mihomo / sing-box 的浏览器代理管理扩展。

核心原则：

1. 用户数据默认只保存在浏览器本地。
2. 插件自身不提供公共代理节点。
3. 插件不依赖云端账号服务。
4. HTTP / SOCKS 节点直接通过浏览器代理 API 使用。
5. VLESS / VMess / Trojan / Shadowsocks / Hysteria2 等复杂协议交给本地代理核心处理。
6. 插件只负责 UI、规则、状态和后端控制。

---

## 3. 技术选型

### 3.1 浏览器平台

首期支持：

- Google Chrome
- Microsoft Edge

后续支持：

- Firefox

### 3.2 浏览器扩展标准

- Manifest V3
- Service Worker
- chrome.proxy
- chrome.storage
- chrome.webRequest
- chrome.webRequestAuthProvider（若可用）
- chrome.runtime
- chrome.tabs

### 3.3 前端方案

推荐：

- TypeScript
- React
- Vite
- Tailwind CSS

状态管理：

- Zustand

表单：

- React Hook Form

Schema 校验：

- Zod

图标：

- Lucide React

### 3.4 测试

- Vitest
- React Testing Library
- Playwright

### 3.5 代码质量

- ESLint
- Prettier
- TypeScript strict mode

---

## 4. 总体架构

```text
┌─────────────────────────────────────────────┐
│              Browser Extension              │
│                                             │
│  ┌──────────┐   ┌──────────────┐           │
│  │  Popup   │   │ Options Page │           │
│  └────┬─────┘   └──────┬───────┘           │
│       │                │                    │
│       └────────┬───────┘                    │
│                ▼                            │
│        ┌───────────────┐                    │
│        │ ServiceWorker │                    │
│        └──────┬────────┘                    │
│               │                             │
│   ┌───────────┼─────────────────────┐       │
│   ▼           ▼                     ▼       │
│ ProxyMgr   RuleEngine          BackendMgr   │
│   │           │                     │       │
│   ▼           ▼                     ▼       │
│chrome.proxy  PAC/Rules       Mihomo API     │
│                                             │
│             chrome.storage                  │
└─────────────────────────────────────────────┘
```

---

## 5. 两种代理运行模式

## 5.1 原生代理模式

直接支持：

- HTTP
- HTTPS
- SOCKS4
- SOCKS5

数据流：

```text
Browser
   │
   ▼
Extension
   │
   ▼
chrome.proxy
   │
   ▼
HTTP/SOCKS Proxy Node
   │
   ▼
Internet
```

## 5.2 本地代理核心模式

适用于：

- VLESS
- VMess
- Trojan
- Shadowsocks
- Hysteria2
- TUIC
- WireGuard
- Reality

数据流：

```text
Browser
   │
   ▼
Extension
   │
   ├── chrome.proxy -> 127.0.0.1:7890
   │
   └── REST API -> Mihomo 127.0.0.1:9090
                       │
                       ▼
                VLESS / Trojan / SS
                       │
                       ▼
                    Internet
```

插件不直接实现这些协议。

---

## 6. 项目目录结构

```text
myproxy-extension/
│
├── public/
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon32.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── manifest.json
│
├── src/
│   ├── background/
│   │   ├── index.ts
│   │   ├── proxy-manager.ts
│   │   ├── auth-manager.ts
│   │   ├── rule-engine.ts
│   │   ├── pac-generator.ts
│   │   ├── backend-manager.ts
│   │   ├── mihomo-client.ts
│   │   └── message-handler.ts
│   │
│   ├── popup/
│   │   ├── Popup.tsx
│   │   ├── components/
│   │   │   ├── ProxySwitch.tsx
│   │   │   ├── NodeSelector.tsx
│   │   │   ├── ModeSelector.tsx
│   │   │   ├── NodeLatency.tsx
│   │   │   └── StatusCard.tsx
│   │   └── main.tsx
│   │
│   ├── options/
│   │   ├── Options.tsx
│   │   ├── pages/
│   │   │   ├── NodesPage.tsx
│   │   │   ├── RulesPage.tsx
│   │   │   ├── GeneralPage.tsx
│   │   │   ├── BackendPage.tsx
│   │   │   └── ImportExportPage.tsx
│   │   └── main.tsx
│   │
│   ├── components/
│   │   ├── NodeForm.tsx
│   │   ├── NodeList.tsx
│   │   ├── RuleEditor.tsx
│   │   └── ConfirmDialog.tsx
│   │
│   ├── hooks/
│   │   ├── useNodes.ts
│   │   ├── useProxyState.ts
│   │   └── useSettings.ts
│   │
│   ├── store/
│   │   ├── proxy-store.ts
│   │   └── settings-store.ts
│   │
│   ├── storage/
│   │   ├── index.ts
│   │   ├── schema.ts
│   │   └── migration.ts
│   │
│   ├── types/
│   │   ├── node.ts
│   │   ├── proxy.ts
│   │   ├── rule.ts
│   │   ├── backend.ts
│   │   └── message.ts
│   │
│   ├── utils/
│   │   ├── id.ts
│   │   ├── validation.ts
│   │   ├── latency.ts
│   │   └── logger.ts
│   │
│   └── styles/
│       └── globals.css
│
├── tests/
│   ├── unit/
│   └── e2e/
│
├── scripts/
│   └── build-manifest.ts
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── eslint.config.js
├── README.md
└── LICENSE
```

---

## 7. 核心数据模型

## 7.1 节点模型

```ts
export type ProxyProtocol =
  | 'http'
  | 'https'
  | 'socks4'
  | 'socks5';

export interface ProxyNode {
  id: string;
  name: string;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username?: string;
  password?: string;
  enabled: boolean;
  tags?: string[];
  remark?: string;
  createdAt: number;
  updatedAt: number;
}
```

---

## 7.2 代理模式

```ts
export type ProxyMode =
  | 'direct'
  | 'global'
  | 'rule'
  | 'pac';
```

---

## 7.3 规则模型

```ts
export type RuleAction = 'proxy' | 'direct';

export type RuleType =
  | 'domain'
  | 'domain-suffix'
  | 'domain-keyword'
  | 'ip-cidr';

export interface ProxyRule {
  id: string;
  type: RuleType;
  value: string;
  action: RuleAction;
  enabled: boolean;
}
```

第一版可以先不实现 IP-CIDR 的完整 PAC 支持，预留结构即可。

---

## 7.4 应用设置

```ts
export interface AppSettings {
  proxyEnabled: boolean;
  mode: ProxyMode;
  selectedNodeId?: string;

  bypassList: string[];

  proxyRules: ProxyRule[];

  backend: {
    type: 'native' | 'mihomo';
    apiUrl?: string;
    secret?: string;
    localProxyHost?: string;
    localProxyPort?: number;
  };
}
```

---

## 8. Storage 结构

使用：

```text
chrome.storage.local
```

禁止默认使用 sync 存储密码。

建议 key：

```text
myproxy.nodes
myproxy.settings
myproxy.version
myproxy.runtime
```

示例：

```json
{
  "myproxy.nodes": [],
  "myproxy.settings": {
    "proxyEnabled": false,
    "mode": "direct",
    "bypassList": [
      "localhost",
      "127.0.0.1",
      "*.local"
    ]
  },
  "myproxy.version": 1
}
```

必须实现 storage migration。

---

## 9. Manifest V3 设计

manifest.json 基础结构：

```json
{
  "manifest_version": 3,
  "name": "MyProxy",
  "version": "0.1.0",
  "description": "User-managed browser proxy extension",

  "permissions": [
    "proxy",
    "storage",
    "webRequest",
    "tabs"
  ],

  "host_permissions": [
    "<all_urls>"
  ],

  "background": {
    "service_worker": "background.js",
    "type": "module"
  },

  "action": {
    "default_popup": "popup.html"
  },

  "options_page": "options.html"
}
```

实现时必须根据 Chrome 当前 Manifest V3 API 实际能力调整权限，不允许复制过时的 Manifest V2 示例。

---

## 10. Service Worker 职责

Service Worker 是整个插件的核心控制层。

职责：

1. 初始化配置。
2. 监听 popup/options 消息。
3. 修改 chrome.proxy 设置。
4. 管理代理认证。
5. 根据模式生成 PAC。
6. 保存运行状态。
7. 与 Mihomo API 通信。
8. 浏览器启动时恢复代理状态。
9. 扩展升级时执行 storage migration。

禁止将关键代理逻辑放在 React 页面中。

React 页面只能：

```text
UI -> runtime.sendMessage -> Service Worker
```

---

## 11. Popup 功能

Popup 大小建议：

```text
360 x 520
```

### 页面布局

```text
┌────────────────────────────┐
│ MyProxy                ⚙   │
├────────────────────────────┤
│                            │
│ Proxy        [ ON / OFF ]  │
│                            │
│ Current Node               │
│ HK-01                 42ms │
│                            │
│ Mode                       │
│ ● Rule                     │
│ ○ Global                   │
│ ○ Direct                   │
│                            │
│ Nodes                      │
│ HK-01                 42ms │
│ JP-01                 71ms │
│ US-01                132ms │
│                            │
└────────────────────────────┘
```

### Popup 功能

- 开关代理
- 显示当前节点
- 快速选择节点
- Direct
- Global
- Rule
- 显示延迟
- 打开 Options

---

## 12. Options 页面

左侧导航：

```text
General
Nodes
Rules
Backend
Import / Export
About
```

---

## 13. Node Management

Nodes 页面支持：

- 添加
- 编辑
- 删除
- 启用 / 禁用
- 批量删除
- 测试延迟
- 排序
- Tags

节点表格：

```text
Name        Protocol   Address             Latency
-------------------------------------------------
HK-01       SOCKS5     1.2.3.4:1080         42ms
JP-01       HTTP       5.6.7.8:8080         81ms
```

---

## 14. Node Form

表单字段：

```text
Name
Protocol
Host
Port
Username
Password
Tags
Remark
```

校验：

- host 不为空
- port 1 ~ 65535
- name 不为空
- protocol 必须合法

密码字段默认隐藏。

---

## 15. Proxy Manager

核心文件：

```text
src/background/proxy-manager.ts
```

接口：

```ts
export interface ProxyManager {
  enable(): Promise<void>;
  disable(): Promise<void>;
  setNode(node: ProxyNode): Promise<void>;
  setMode(mode: ProxyMode): Promise<void>;
  apply(): Promise<void>;
  getState(): Promise<ProxyRuntimeState>;
}
```

---

## 16. Direct 模式

调用：

```ts
chrome.proxy.settings.set({
  value: {
    mode: 'direct'
  },
  scope: 'regular'
});
```

---

## 17. Global 模式

使用 fixed_servers。

示意：

```ts
const config = {
  mode: 'fixed_servers',
  rules: {
    singleProxy: {
      scheme: node.protocol,
      host: node.host,
      port: node.port
    },
    bypassList: settings.bypassList
  }
};
```

调用：

```ts
chrome.proxy.settings.set({
  value: config,
  scope: 'regular'
});
```

必须处理不同协议名称与 Chrome scheme 的映射。

---

## 18. Rule 模式

Rule 模式优先通过 PAC Script 实现。

流程：

```text
ProxyRule[]
    │
    ▼
PAC Generator
    │
    ▼
FindProxyForURL(url, host)
    │
    ▼
chrome.proxy.settings
```

---

## 19. PAC Generator

输入：

```ts
ProxyNode
ProxyRule[]
BypassList[]
```

输出：

```js
function FindProxyForURL(url, host) {
    if (host === "localhost") {
        return "DIRECT";
    }

    if (dnsDomainIs(host, ".google.com")) {
        return "SOCKS5 1.2.3.4:1080";
    }

    return "DIRECT";
}
```

PAC 必须动态生成。

不要让用户直接编辑任意 JS 作为默认规则编辑模式。

高级设置可以单独提供自定义 PAC。

---

## 20. 默认规则策略

Rule 模式建议默认：

```text
匹配 Proxy Rules -> PROXY
匹配 Direct Rules -> DIRECT
匹配 Bypass -> DIRECT
其他 -> DIRECT
```

未来增加：

```text
Default = PROXY / DIRECT
```

---

## 21. 用户名密码认证

HTTP Proxy 可能返回：

```text
407 Proxy Authentication Required
```

需要实现 auth-manager。

伪代码：

```ts
chrome.webRequest.onAuthRequired.addListener(
  handler,
  { urls: ['<all_urls>'] },
  ['asyncBlocking']
);
```

handler 根据当前节点返回：

```ts
{
  authCredentials: {
    username: node.username,
    password: node.password
  }
}
```

实现时必须按照当前 Chrome MV3 实际 API 支持方式调整。

需要防止：

```text
无限认证循环
错误节点认证串用
网页 Basic Auth 被错误接管
```

必须检查：

```text
details.isProxy
```

如果 API 提供该字段，仅处理代理认证。

---

## 22. 节点延迟检测

浏览器扩展本身无法可靠 TCP Ping 任意 SOCKS 节点。

第一版定义“延迟测试”为：

```text
切换目标代理 -> 请求测试 URL -> 测量耗时
```

测试 URL 可配置，例如：

```text
https://www.gstatic.com/generate_204
```

流程：

```text
保存当前节点
↓
切换测试节点
↓
fetch generate_204
↓
记录 duration
↓
恢复原节点
```

注意：该方案容易影响用户浏览流量。

更推荐后续 Mihomo 模式使用：

```text
Mihomo delay API
```

原生节点延迟测试在 V1 标记为 Experimental。

---

## 23. Mihomo Backend

Backend 设置：

```text
Type: Mihomo
API URL: http://127.0.0.1:9090
Secret:
Proxy Host: 127.0.0.1
Proxy Port: 7890
```

---

## 24. Mihomo Client

文件：

```text
src/background/mihomo-client.ts
```

接口：

```ts
interface MihomoClient {
  getVersion(): Promise<unknown>;
  getProxies(): Promise<unknown>;
  getProxy(name: string): Promise<unknown>;
  selectProxy(group: string, node: string): Promise<void>;
  testDelay(name: string): Promise<number>;
}
```

要求：

- API timeout
- 错误处理
- Secret Bearer Auth
- API 地址合法性验证
- 不允许远程 API 默认启用

---

## 25. Mihomo 模式工作流程

启用 Mihomo：

```text
Extension
   │
   ├── 查询 Mihomo API
   │
   ├── 获取策略组
   │
   ├── 获取节点
   │
   └── 选择节点

Browser
   │
   ▼
127.0.0.1:7890
   │
   ▼
Mihomo
```

插件 chrome.proxy 只设置：

```text
127.0.0.1:7890
```

节点切换通过 API 完成。

---

## 26. Runtime Messaging

所有 UI 与 background 通过消息通信。

消息格式：

```ts
export type ExtensionMessage =
  | { type: 'GET_STATE' }
  | { type: 'SET_ENABLED'; enabled: boolean }
  | { type: 'SET_MODE'; mode: ProxyMode }
  | { type: 'SELECT_NODE'; nodeId: string }
  | { type: 'ADD_NODE'; node: ProxyNode }
  | { type: 'UPDATE_NODE'; node: ProxyNode }
  | { type: 'DELETE_NODE'; nodeId: string }
  | { type: 'TEST_NODE'; nodeId: string };
```

Background 统一返回：

```ts
export interface MessageResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
```

---

## 27. Runtime State

```ts
export interface ProxyRuntimeState {
  enabled: boolean;
  mode: ProxyMode;
  selectedNodeId?: string;
  activeNode?: ProxyNode;
  lastError?: string;
  proxyControlledBy?: string;
}
```

---

## 28. 处理代理被其他扩展控制

必须通过：

```ts
chrome.proxy.settings.get()
```

判断：

```text
levelOfControl
```

常见状态：

```text
controlled_by_this_extension
controllable_by_this_extension
controlled_by_other_extensions
not_controllable
```

UI 必须显示：

```text
Proxy is controlled by another extension
```

不能静默失败。

---

## 29. 浏览器启动恢复

监听：

```ts
chrome.runtime.onStartup
chrome.runtime.onInstalled
```

Startup：

```text
读取 settings
↓
如果 proxyEnabled == true
↓
重新 apply proxy
```

Installed：

```text
初始化 storage
执行 migration
```

---

## 30. 导入 / 导出

导出 JSON：

```json
{
  "format": "myproxy",
  "version": 1,
  "nodes": [],
  "settings": {},
  "rules": []
}
```

导入必须：

1. Schema Validate
2. Version Validate
3. 数据清洗
4. 用户确认
5. 写入 storage

禁止直接 JSON.parse 后覆盖 storage。

---

## 31. 密码处理

浏览器扩展无法提供真正安全的密钥存储。

V1：

- 密码保存在 chrome.storage.local
- UI 默认隐藏
- 导出配置时默认不导出密码
- 用户可选择“包含敏感信息”

明确提示：

> Saved proxy credentials are stored locally in this browser profile.

V2 可以增加：

- WebCrypto AES-GCM
- Master Password

但不要在 V1 做伪安全加密。

---

## 32. 日志系统

logger.ts：

```ts
logger.debug()
logger.info()
logger.warn()
logger.error()
```

生产版默认：

```text
INFO
```

不允许日志输出：

```text
password
secret
完整认证 header
```

---

## 33. 错误处理

统一错误类型：

```ts
export class ProxyError extends Error {}
export class StorageError extends Error {}
export class BackendError extends Error {}
export class ValidationError extends Error {}
```

UI 禁止只显示：

```text
Unknown error
```

必须提供用户可理解的信息。

示例：

```text
Unable to connect to Mihomo API at 127.0.0.1:9090
```

---

## 34. UI 状态

节点状态：

```text
Connected
Unavailable
Testing
Unknown
```

延迟显示：

```text
42 ms
128 ms
Timeout
--
```

---

## 35. 安全要求

必须遵守：

1. 不执行用户导入的任意 JS。
2. 不使用 eval。
3. 不使用 new Function。
4. 不向第三方服务器上传节点。
5. 不远程加载脚本。
6. 不把密码写日志。
7. API secret 不显示明文。
8. CSP 符合 Manifest V3。
9. 最小化权限。
10. 所有输入用 Zod 校验。

---

## 36. UX 细节

### Proxy Enabled

扩展图标显示：

```text
绿色/启用状态
```

### Direct

显示：

```text
DIRECT
```

### Proxy Error

Badge：

```text
!
```

---

## 37. 首次启动向导

首次打开：

```text
Welcome to MyProxy

[ Add Proxy Node ]

or

[ Configure Mihomo ]
```

不要自动配置任何代理。

---

## 38. MVP 范围

第一版本 v0.1.0 必须完成：

- Manifest V3
- Chrome / Edge
- React + TypeScript
- Options 页面
- Popup 页面
- HTTP 节点
- HTTPS 节点
- SOCKS4
- SOCKS5
- CRUD
- Global
- Direct
- Rule
- PAC Generator
- Bypass
- Proxy Auth
- Storage
- Import / Export
- 基本错误处理
- 基本单元测试

---

## 39. v0.2.0

加入：

- Mihomo API
- 策略组
- 节点延迟
- 节点切换
- Mihomo 状态

---

## 40. v0.3.0

加入：

- 自动选择最低延迟节点
- 节点健康检查
- Rule Set
- 自定义默认策略
- 域名规则批量导入

---

## 41. v0.4.0

加入：

- Firefox
- sing-box API
- 多 Backend
- Backup
- Password Encryption

---

## 42. 开发顺序

### Phase 1

项目初始化：

```text
Vite
React
TypeScript
Tailwind
Manifest V3
```

确保扩展可以加载。

### Phase 2

Storage：

```text
schema
CRUD
migration
```

### Phase 3

Proxy Manager：

```text
Direct
Global
Node switch
```

### Phase 4

Popup：

```text
Enable
Mode
Node
Status
```

### Phase 5

Options：

```text
Node CRUD
Settings
Bypass
```

### Phase 6

Rule Engine：

```text
PAC Generator
Domain rules
```

### Phase 7

Proxy Authentication

### Phase 8

Import Export

### Phase 9

Tests

### Phase 10

Mihomo

---

## 43. Definition of Done

一个功能只有满足以下条件才算完成：

- TypeScript 无错误
- ESLint 无错误
- 核心逻辑有测试
- Chrome 可加载
- Edge 可加载
- 浏览器重启后状态正确恢复
- Direct 正常
- Proxy 正常
- 代理不可用时 UI 有错误信息
- 没有输出敏感信息

---

## 44. 验收测试

### Test 1

添加：

```text
SOCKS5
127.0.0.1
1080
```

点击 Enable。

确认浏览器流量进入 SOCKS5。

### Test 2

切换 Direct。

确认浏览器恢复直连。

### Test 3

创建：

```text
google.com -> PROXY
localhost -> DIRECT
```

确认 PAC 生效。

### Test 4

浏览器关闭再打开。

确认配置恢复。

### Test 5

代理节点错误。

确认插件显示错误状态。

### Test 6

另一个扩展控制代理。

确认 MyProxy 提示冲突。

### Test 7

导出配置，再导入。

确认节点与规则恢复。

---

## 45. Codex 实现要求

Codex 必须遵守：

1. 不一次生成一个巨大文件。
2. 按模块拆分。
3. 优先完成可运行 MVP。
4. 每完成一个阶段运行测试。
5. 不使用 Manifest V2 API。
6. 遇到 Chrome API 不确定时，以当前官方 Manifest V3 文档为准。
7. 不通过 hacks 绕过 CSP。
8. 不添加不必要的 npm 依赖。
9. 所有业务模型使用 TypeScript。
10. 所有用户配置使用 Zod 校验。
11. Service Worker 必须无 DOM 依赖。
12. UI 不直接调用 chrome.proxy。
13. proxy 操作只能通过 background。
14. Storage 必须封装。
15. 不直接散落 chrome.storage 调用。
16. 所有 runtime message 必须有 TypeScript 类型。

---

# Codex 主提示词

下面内容可以直接发送给 Codex：

```text
你是一名高级 Chrome Extension / TypeScript 工程师。

请根据仓库中的 myproxy_project_plan.md，从零实现 MyProxy 浏览器插件。

项目目标：
实现一个 Manifest V3 Chrome / Edge 浏览器代理扩展，类似 GHelper，但代理节点完全由用户自行配置。

第一阶段支持：
- HTTP Proxy
- HTTPS Proxy
- SOCKS4
- SOCKS5
- Direct
- Global
- Rule/PAC
- 多节点 CRUD
- 节点快速切换
- Bypass List
- Proxy Username / Password
- chrome.storage.local
- JSON Import / Export
- Popup
- Options
- 状态恢复
- 错误处理

技术栈：
- TypeScript
- React
- Vite
- Tailwind CSS
- Zustand
- Zod
- Vitest
- Manifest V3

架构要求：

UI
↓
chrome.runtime.sendMessage
↓
Service Worker
↓
ProxyManager / RuleEngine / Storage
↓
chrome.proxy

禁止 React UI 直接调用 chrome.proxy。

请严格执行以下步骤：

STEP 1
检查仓库当前内容。
如果项目为空，则初始化 Vite + React + TypeScript 项目。

STEP 2
建立文档要求的目录结构。

STEP 3
先完成 Manifest V3 和 build 配置，让 npm run build 后生成一个可以在 Chrome：
chrome://extensions -> Load unpacked
直接加载的 dist 目录。

STEP 4
实现 types 和 storage schema。
使用 Zod 对所有持久化配置进行验证。
实现 storage migration。

STEP 5
实现 ProxyManager：
- Direct
- Global
- fixed_servers
- HTTP
- HTTPS
- SOCKS4
- SOCKS5
- bypassList

STEP 6
实现 Runtime Messaging。
所有 Popup / Options 操作都通过 Service Worker。

STEP 7
实现 Options Node CRUD。

STEP 8
实现 Popup：
- Enable / Disable
- 当前 Node
- Node Selector
- Direct / Global / Rule
- 当前状态

STEP 9
实现 PAC Generator 和 Rule Engine。
至少支持：
- domain
- domain-suffix
- domain-keyword
- direct/proxy

STEP 10
实现 HTTP Proxy Authentication。
必须避免把普通网页 HTTP Basic Authentication 当成代理认证。

STEP 11
实现 Import / Export。
导入必须经过 Zod 校验。
默认导出不包含密码。

STEP 12
实现 Proxy levelOfControl 检测。
如果代理被其他 Extension 或 Policy 控制，UI 必须提示。

STEP 13
实现浏览器启动后的代理状态恢复。

STEP 14
为：
- storage
- PAC generator
- rule matcher
- message schema
写 Vitest 单元测试。

STEP 15
运行：
- npm run typecheck
- npm run lint
- npm run test
- npm run build

修复所有错误。

STEP 16
生成 README.md，包含：
- 项目介绍
- 开发环境
- npm install
- npm run dev
- npm run build
- Chrome 加载方法
- Edge 加载方法
- 权限说明
- 安全说明

开发原则：
- 不使用 Manifest V2
- 不使用 eval
- 不使用 new Function
- 不远程加载 JS
- 不上传用户代理信息
- 不记录 password / secret
- 使用 TypeScript strict
- 不滥用 any
- Service Worker 不依赖 DOM
- 代码模块化
- 错误必须可观察和可诊断

如果发现需求与当前 Chrome Manifest V3 API 不兼容：
不要伪造 API。
请先查清当前 API 行为，然后使用当前官方支持的实现方式，并在 README 中说明限制。

每完成一个主要阶段：
先确保项目仍可编译，再继续下一阶段。

不要只生成 Demo。
目标是生成一个结构完整、可维护、可继续开发的正式项目。
```

---

# 推荐后续 Codex 提示词：Mihomo

MVP 稳定后，再让 Codex 执行：

```text
基于现有 MyProxy 项目增加 Mihomo Backend。

要求：

1. Backend 类型增加：
   native
   mihomo

2. Mihomo 设置：
   API URL
   Secret
   Local Proxy Host
   Local Proxy Port

3. 实现 MihomoClient。

4. 支持读取：
   version
   proxies
   proxy groups
   current selected node

5. 支持策略组节点切换。

6. 支持节点 Delay Test。

7. Mihomo 模式下 chrome.proxy 指向本地代理入口，例如：
   127.0.0.1:7890

8. 节点切换通过 Mihomo API 完成，而不是修改 chrome.proxy node。

9. API 连接失败不能影响扩展 Options 页面正常打开。

10. 不记录 Mihomo secret。

11. API 默认仅建议 localhost。

12. 增加 Mihomo Backend 页面和状态显示。

完成后运行完整测试和 build。
```

---

# 最终目标架构

```text
                         MyProxy
                           │
            ┌──────────────┴──────────────┐
            │                             │
          Native                        Backend
            │                             │
    ┌───────┴────────┐             ┌──────┴───────┐
    │                │             │              │
  HTTP             SOCKS5        Mihomo        sing-box
    │                │             │              │
    └──────────┬─────┘             └──────┬───────┘
               │                          │
               ▼                          ▼
           chrome.proxy             localhost proxy
               │                          │
               └─────────────┬────────────┘
                             ▼
                          Internet
```

这个架构可以保证：

- 第一版简单可靠。
- 用户可以直接使用自己的 SOCKS5 / HTTP 节点。
- 后续可以兼容 Clash / Mihomo 生态。
- 不需要在浏览器扩展里重复实现 VLESS、VMess、Trojan 等复杂协议。
- 可以持续扩展规则系统和节点管理能力。
