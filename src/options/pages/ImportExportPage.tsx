import { Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Button, Toggle } from '../../components/ui';
import { useProxyStore } from '../../store/proxy-store';

export function ImportExportPage() {
  const { busy, error, importConfig, exportConfig, clearError } = useProxyStore();
  const [includeSecrets, setIncludeSecrets] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const download = async () => {
    const config = await exportConfig(includeSecrets);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `routekey-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const upload = async (file?: File) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!window.confirm('导入将覆盖当前节点和设置，确定继续吗？')) return;
      await importConfig(parsed);
    } catch (cause) {
      useProxyStore.setState({
        error: cause instanceof Error ? cause.message : '无法读取导入文件',
      });
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="page-content narrow-page">
      <div className="page-title-row">
        <div>
          <h1>导入与导出</h1>
          <p>以经过校验的 routekey JSON 格式备份配置。</p>
        </div>
      </div>
      {error ? <ErrorBanner message={error} onClose={clearError} /> : null}
      <section className="transfer-section">
        <div>
          <h2>导出配置</h2>
          <p>默认排除代理密码、用户名与后端 Secret。</p>
        </div>
        <Toggle checked={includeSecrets} onChange={setIncludeSecrets} label="包含敏感信息" />
        {includeSecrets ? (
          <div className="warning-strip">导出文件包含明文凭据，请妥善保管。</div>
        ) : null}
        <Button onClick={() => void download()}>
          <Download size={17} /> 下载 JSON
        </Button>
      </section>
      <section className="transfer-section">
        <div>
          <h2>导入配置</h2>
          <p>仅接受 format 为 routekey、version 为 1 且通过完整 schema 校验的文件。</p>
        </div>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          onChange={(event) => void upload(event.target.files?.[0])}
        />
        <Button variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
          <Upload size={17} /> 选择 JSON 文件
        </Button>
      </section>
    </div>
  );
}
