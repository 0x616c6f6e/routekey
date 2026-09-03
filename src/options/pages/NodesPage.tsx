import { ArrowDown, ArrowUp, Gauge, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ErrorBanner } from '../../components/ErrorBanner';
import { NodeForm } from '../../components/NodeForm';
import { Button, EmptyState, IconButton, Modal } from '../../components/ui';
import { useProxyStore } from '../../store/proxy-store';
import type { ProxyNode } from '../../types';

export function NodesPage() {
  const {
    snapshot,
    busy,
    error,
    latencies,
    saveNode,
    deleteNodes,
    reorderNodes,
    testNode,
    clearError,
  } = useProxyStore();
  const [editing, setEditing] = useState<ProxyNode | 'new'>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const nodes = snapshot?.nodes ?? [];

  const toggleNode = async (node: ProxyNode) => {
    await saveNode({ ...node, enabled: !node.enabled, updatedAt: Date.now() }, true);
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= nodes.length) return;
    const ids = nodes.map((node) => node.id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    await reorderNodes(ids);
  };

  return (
    <div className="page-content">
      <div className="page-title-row">
        <div>
          <h1>代理节点</h1>
          <p>管理浏览器可直接使用的 HTTP 与 SOCKS 代理。</p>
        </div>
        <div className="row-actions">
          {selected.size > 0 ? (
            <Button
              variant="danger"
              onClick={() => void deleteNodes([...selected])}
              disabled={busy}
            >
              <Trash2 size={16} /> 删除 {selected.size} 项
            </Button>
          ) : null}
          <Button onClick={() => setEditing('new')}>
            <Plus size={17} /> 添加节点
          </Button>
        </div>
      </div>

      {error ? <ErrorBanner message={error} onClose={clearError} /> : null}

      {nodes.length === 0 ? (
        <EmptyState
          title="还没有代理节点"
          description="添加一个自有代理节点后即可启用 Global 或 Rule 模式。"
        >
          <Button onClick={() => setEditing('new')}>
            <Plus size={17} /> 添加代理节点
          </Button>
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="check-cell">
                  <input
                    type="checkbox"
                    aria-label="选择全部节点"
                    checked={selected.size === nodes.length}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked ? new Set(nodes.map((node) => node.id)) : new Set(),
                      )
                    }
                  />
                </th>
                <th>节点</th>
                <th>协议</th>
                <th>地址</th>
                <th>延迟</th>
                <th>状态</th>
                <th className="actions-cell">操作</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node, index) => {
                const latency = latencies[node.id];
                return (
                  <tr key={node.id} className={!node.enabled ? 'muted-row' : ''}>
                    <td className="check-cell">
                      <input
                        type="checkbox"
                        aria-label={`选择 ${node.name}`}
                        checked={selected.has(node.id)}
                        onChange={(event) => {
                          const next = new Set(selected);
                          if (event.target.checked) next.add(node.id);
                          else next.delete(node.id);
                          setSelected(next);
                        }}
                      />
                    </td>
                    <td>
                      <strong>{node.name}</strong>
                      {node.tags.length ? (
                        <div className="tags">
                          {node.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span className="protocol-label">{node.protocol.toUpperCase()}</span>
                    </td>
                    <td className="mono">
                      {node.host}:{node.port}
                    </td>
                    <td>
                      {latency?.status === 'connected'
                        ? `${latency.latency} ms`
                        : latency?.status === 'unavailable'
                          ? '超时'
                          : '--'}
                    </td>
                    <td>
                      <span className={`status-dot ${node.enabled ? 'status-active' : ''}`} />
                      {node.enabled ? '启用' : '停用'}
                    </td>
                    <td className="actions-cell">
                      <div className="icon-actions">
                        <IconButton
                          label="上移"
                          disabled={index === 0 || busy}
                          onClick={() => void move(index, -1)}
                        >
                          <ArrowUp size={16} />
                        </IconButton>
                        <IconButton
                          label="下移"
                          disabled={index === nodes.length - 1 || busy}
                          onClick={() => void move(index, 1)}
                        >
                          <ArrowDown size={16} />
                        </IconButton>
                        <IconButton
                          label="测试延迟"
                          disabled={busy || !node.enabled}
                          onClick={() => void testNode(node.id)}
                        >
                          <Gauge size={16} />
                        </IconButton>
                        <IconButton
                          label={node.enabled ? '停用节点' : '启用节点'}
                          disabled={busy}
                          onClick={() => void toggleNode(node)}
                        >
                          <Power size={16} />
                        </IconButton>
                        <IconButton label="编辑节点" onClick={() => setEditing(node)}>
                          <Pencil size={16} />
                        </IconButton>
                        <IconButton
                          label="删除节点"
                          className="danger-icon"
                          disabled={busy}
                          onClick={() => void deleteNodes([node.id])}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="table-foot">
            原生延迟测试会短暂切换浏览器代理，并在完成后恢复当前设置。
          </div>
        </div>
      )}

      {editing ? (
        <Modal
          title={editing === 'new' ? '添加代理节点' : '编辑代理节点'}
          onClose={() => setEditing(undefined)}
        >
          <NodeForm
            initial={editing === 'new' ? undefined : editing}
            busy={busy}
            onCancel={() => setEditing(undefined)}
            onSubmit={async (node) => {
              await saveNode(node, editing !== 'new');
              setEditing(undefined);
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}
