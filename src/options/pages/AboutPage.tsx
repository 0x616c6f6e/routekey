import { Github, ShieldCheck } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="page-content narrow-page">
      <div className="page-title-row">
        <div>
          <h1>关于 MyProxy</h1>
          <p>本地优先的浏览器代理管理工具。</p>
        </div>
        <span className="version">v0.1.0</span>
      </div>
      <section className="about-hero">
        <div className="brand-mark large">M</div>
        <div>
          <h2>代理由你掌控</h2>
          <p>MyProxy 不提供公共节点、不依赖云端账号，也不会上传你的代理配置。</p>
        </div>
      </section>
      <section className="settings-section">
        <h2>
          <ShieldCheck size={19} /> 数据与安全
        </h2>
        <p>
          配置保存在 chrome.storage.local。浏览器扩展无法提供真正的系统级密钥存储，因此密码和 Secret
          在本地以明文保存。
        </p>
        <p>扩展不使用 eval、不执行导入的 JavaScript，也不远程加载扩展代码。</p>
      </section>
      <section className="settings-section">
        <h2>
          <Github size={19} /> 开源许可
        </h2>
        <p>本项目使用 MIT License。构建和浏览器加载说明请参阅仓库 README。</p>
      </section>
    </div>
  );
}
