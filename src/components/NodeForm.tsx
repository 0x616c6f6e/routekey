import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { ProxyNode } from '../types';
import { createId } from '../utils/id';
import { Button, Field, IconButton, Input } from './ui';

const formSchema = z.object({
  name: z.string().trim().min(1, '请输入节点名称').max(100),
  protocol: z.enum(['http', 'https', 'socks4', 'socks5']),
  host: z.string().trim().min(1, '请输入主机地址').max(253),
  port: z.coerce.number().int('端口必须为整数').min(1).max(65535),
  username: z.string().max(256),
  password: z.string().max(1024),
  tags: z.string().max(500),
  remark: z.string().max(1000),
});

type FormValues = z.infer<typeof formSchema>;

export function NodeForm({
  initial,
  busy,
  onSubmit,
  onCancel,
}: {
  initial?: ProxyNode;
  busy: boolean;
  onSubmit: (node: ProxyNode) => Promise<void>;
  onCancel: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initial?.name ?? '',
      protocol: initial?.protocol ?? 'socks5',
      host: initial?.host ?? '127.0.0.1',
      port: initial?.port ?? 1080,
      username: initial?.username ?? '',
      password: initial?.password ?? '',
      tags: initial?.tags.join(', ') ?? '',
      remark: initial?.remark ?? '',
    },
  });

  const submit = handleSubmit(async (values) => {
    const now = Date.now();
    await onSubmit({
      id: initial?.id ?? createId(),
      name: values.name.trim(),
      protocol: values.protocol,
      host: values.host.trim(),
      port: values.port,
      username: values.username || undefined,
      password: values.password || undefined,
      enabled: initial?.enabled ?? true,
      tags: values.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      remark: values.remark || undefined,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    });
  });

  return (
    <form onSubmit={submit} className="form-stack">
      <div className="form-grid">
        <Field label="名称" error={errors.name?.message}>
          <Input autoFocus placeholder="例如 HK-01" {...register('name')} />
        </Field>
        <Field label="协议" error={errors.protocol?.message}>
          <select className="input" {...register('protocol')}>
            <option value="http">HTTP</option>
            <option value="https">HTTPS</option>
            <option value="socks4">SOCKS4</option>
            <option value="socks5">SOCKS5</option>
          </select>
        </Field>
        <Field label="主机" error={errors.host?.message}>
          <Input placeholder="127.0.0.1" spellCheck={false} {...register('host')} />
        </Field>
        <Field label="端口" error={errors.port?.message}>
          <Input type="number" min={1} max={65535} {...register('port')} />
        </Field>
        <Field label="用户名" error={errors.username?.message}>
          <Input autoComplete="off" {...register('username')} />
        </Field>
        <Field label="密码" error={errors.password?.message}>
          <div className="password-input">
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('password')}
            />
            <IconButton
              type="button"
              label={showPassword ? '隐藏密码' : '显示密码'}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </IconButton>
          </div>
        </Field>
      </div>
      <Field label="标签" hint="多个标签用逗号分隔" error={errors.tags?.message}>
        <Input placeholder="香港, 工作" {...register('tags')} />
      </Field>
      <Field label="备注" error={errors.remark?.message}>
        <textarea className="input textarea" rows={3} {...register('remark')} />
      </Field>
      <p className="security-note">
        代理凭据会保存在当前浏览器配置文件的本地存储中。自动认证仅适用于 HTTP/HTTPS 代理挑战。
      </p>
      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? '保存中...' : '保存节点'}
        </Button>
      </div>
    </form>
  );
}
