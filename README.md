# routekey

routekey 是一个本地优先的 Chrome / Edge Manifest V3 代理扩展。代理节点全部由用户管理；扩展不提供公共节点、不依赖云端账号，也不会上传节点配置。

## 功能

- HTTP、HTTPS、SOCKS4、SOCKS5 节点管理
- Direct、Global、Rule/PAC 运行模式
- 动态 PAC 域名规则与 Bypass 直连清单
- 仅针对代理挑战的用户名/密码认证
- `chrome.storage.local` 持久化与版本迁移
- 经过 Zod 校验的 JSON 导入/导出
- 代理控制权冲突提示、启动状态恢复和扩展 Badge
- 实验性原生节点延迟测试
- 本机 Mihomo API 连通性与浏览器本地入口配置

## 开发

要求 Node.js 20.19+，推荐使用 Node.js 20 LTS。

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npm run verify:build
```

`npm run dev` 适合开发页面样式。涉及 Service Worker、`chrome.proxy` 或认证的功能应使用构建后的扩展验证。

## 加载扩展

Chrome：

1. 运行 `npm run build`。
2. 打开 `chrome://extensions` 并启用“开发者模式”。
3. 点击“加载已解压的扩展程序”，选择项目的 `dist` 目录。

Edge：

1. 运行 `npm run build`。
2. 打开 `edge://extensions` 并启用“开发人员模式”。
3. 点击“加载解压缩的扩展”，选择项目的 `dist` 目录。

修改后台或 Manifest 后，需要在扩展管理页重新加载扩展。

## CI/CD 与发布

GitHub Actions 包含两条流水线：

- `CI`：分支 push、Pull Request 或手动触发时执行依赖安装、类型检查、ESLint、单元测试、依赖审计、构建和产物安全校验，并保留 14 天的扩展 ZIP。
- `Release`：推送 `v*` 标签后重复完整质量检查，校验标签、`package.json` 和 Manifest 版本一致，并创建包含 ZIP 与 SHA-256 文件的 GitHub Release。

准备一个新版本：

```bash
npm run version:set -- 0.2.0
npm run typecheck
npm run lint
npm run test
npm run build
npm run verify:build
git add package.json package-lock.json public/manifest.json
git commit -m "chore: release 0.2.0"
git tag v0.2.0
git push origin HEAD v0.2.0
```

版本脚本会同步修改 `package.json`、`package-lock.json` 和 `public/manifest.json`。Release 不包含 Chrome Web Store 或 Edge Add-ons 自动上架，因为商店发布需要单独配置开发者账号和发布凭据。

## 权限

- `proxy`：读取和设置浏览器代理。
- `storage`：将节点、规则和设置保存在当前浏览器配置文件。
- `webRequest`：接收认证相关请求事件。
- `webRequestAuthProvider`：Manifest V3 中为代理认证挑战提供凭据。
- `<all_urls>`：代理认证事件及用户配置的连通性测试可能覆盖任意目标地址。

扩展没有申请 `webRequestBlocking`；该权限在 Manifest V3 中通常只向由企业策略安装的扩展开放。认证使用 `onAuthRequired` 的 `asyncBlocking` 模式，并检查 `details.isProxy`，不会接管普通网页的 Basic Auth。

## 安全与限制

- 节点凭据和 Mihomo Secret 保存在 `chrome.storage.local`。浏览器扩展没有真正的系统密钥库，因此这些值在本地为明文；导出默认移除用户名、密码和 Secret。
- 自动提供用户名和密码仅适用于 HTTP/HTTPS 代理认证挑战；Chrome 原生代理 API 不提供通用的 SOCKS 用户名/密码字段。
- 导入内容必须通过格式版本和完整 Zod schema 校验，扩展不执行导入的 JavaScript，也不使用 `eval` 或 `new Function`。
- PAC URL 模式会让浏览器读取用户配置的 PAC 地址，应只使用可信来源。Rule 模式只生成受控 PAC 内容。
- 原生延迟测试会短暂将整个浏览器切换到被测节点，可能影响当时的其他请求，完成后会恢复设置。
- V1 的 PAC 规则支持完整域名、域名后缀和域名关键字；IP-CIDR 仅保留模型，生成 PAC 时跳过。
- Mihomo API 默认仅接受 `localhost`、`127.0.0.1` 或 `::1`。复杂协议由 Mihomo 处理，扩展仅将浏览器指向其本地 HTTP 入口。

## 项目结构

```text
src/background/  Service Worker、代理、认证、PAC 与 Mihomo 客户端
src/storage/     schema、迁移和存储封装
src/popup/       扩展 Popup
src/options/     完整设置页
src/components/  共享表单和界面组件
src/store/       Zustand UI 状态及消息调用
tests/unit/      核心业务单元测试
```

## License

MIT
