import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren } from 'react';
import { X } from 'lucide-react';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  return <button className={`button button-${variant} ${className}`} {...props} />;
}

export function IconButton({
  label,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button className={`icon-button ${className}`} title={label} aria-label={label} {...props} />
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input ref={ref} className={`input ${className}`} {...props} />
  ),
);

Input.displayName = 'Input';

export function Field({
  label,
  error,
  hint,
  children,
}: PropsWithChildren<{ label: string; error?: string; hint?: string }>) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : null}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className="toggle-wrap">
      <input
        className="sr-only"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={`toggle ${checked ? 'toggle-on' : ''}`} aria-hidden="true">
        <span />
      </span>
      <span>{label}</span>
    </label>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: PropsWithChildren<{ title: string; onClose: () => void }>) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <IconButton label="关闭" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>
        {children}
      </section>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description: string }>) {
  return (
    <div className="empty-state">
      <div className="empty-mark">R</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
