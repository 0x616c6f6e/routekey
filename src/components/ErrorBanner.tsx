import { AlertTriangle, X } from 'lucide-react';
import { IconButton } from './ui';

export function ErrorBanner({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <div className="error-banner" role="alert">
      <AlertTriangle size={17} />
      <span>{message}</span>
      {onClose ? (
        <IconButton label="关闭错误提示" onClick={onClose}>
          <X size={16} />
        </IconButton>
      ) : null}
    </div>
  );
}
