import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NodeForm } from '../../src/components/NodeForm';

describe('NodeForm', () => {
  it('submits registered input values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<NodeForm busy={false} onCancel={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('名称'), { target: { value: 'WORK' } });
    fireEvent.change(screen.getByLabelText('主机'), { target: { value: '127.0.0.1' } });
    fireEvent.change(screen.getByLabelText('端口'), { target: { value: '7890' } });
    fireEvent.click(screen.getByRole('button', { name: '保存节点' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'WORK',
        protocol: 'socks5',
        host: '127.0.0.1',
        port: 7890,
      }),
    );
    expect(screen.queryByText('Required')).not.toBeInTheDocument();
    expect(screen.queryByText('Expected number, received nan')).not.toBeInTheDocument();
  });
});
