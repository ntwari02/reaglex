import { useEffect, useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, AlertCircle, ArrowRight } from 'lucide-react';

export function authFieldId(label: string) {
  return `auth-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

export function focusAuthErrorSummary() {
  requestAnimationFrame(() => {
    document.getElementById('auth-error-summary')?.focus();
  });
}

export function focusAuthField(label: string) {
  requestAnimationFrame(() => {
    document.getElementById(authFieldId(label))?.focus();
  });
}

export function useFormErrorFocus(error: string, fieldLabel?: string) {
  useEffect(() => {
    if (!error) return;
    if (fieldLabel) {
      focusAuthField(fieldLabel);
      return;
    }
    focusAuthErrorSummary();
  }, [error, fieldLabel]);
}

export function AuthInput({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  valid,
  focused,
  leftIcon: LeftIcon,
  rightEl,
  onFocus,
  onBlur,
  required,
  autoFocus,
  autoComplete,
  helperText,
  hideLabel,
}: {
  label: string;
  type?: string;
  name?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  valid?: boolean;
  focused?: boolean;
  leftIcon?: React.ComponentType<{ size?: string | number; style?: React.CSSProperties; className?: string }>;
  rightEl?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
  required?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  helperText?: string;
  hideLabel?: boolean;
}) {
  const fieldId = authFieldId(label);
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;
  const describedBy = [error ? errorId : null, helperText ? helperId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="agf-field">
      {!hideLabel && (
        <label htmlFor={fieldId} className="agf-field__label">
          {label}
          {required ? <span className="sr-only"> (required)</span> : null}
        </label>
      )}
      {helperText && (
        <p id={helperId} className="agf-field__helper">
          {helperText}
        </p>
      )}
      <div className="agf-field__wrap">
        {LeftIcon && (
          <span className="agf-field__icon" aria-hidden>
            <LeftIcon size={18} />
          </span>
        )}
        <input
          id={fieldId}
          name={name || fieldId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={[
            'agf-input',
            !LeftIcon ? 'agf-input--no-icon' : '',
            rightEl ? 'agf-input--has-right' : '',
            error ? 'is-error' : '',
            valid ? 'is-valid' : '',
            focused && !error ? 'is-focused' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
        {rightEl && <span className="agf-field__icon agf-field__icon--right">{rightEl}</span>}
        {valid && !rightEl && (
          <span className="agf-field__icon agf-field__icon--right" aria-hidden>
            <Check size={16} style={{ color: 'var(--badge-success-text)' }} />
          </span>
        )}
      </div>
      {error && (
        <motion.p id={errorId} role="alert" className="agf-field__error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AlertCircle size={12} aria-hidden /> {error}
        </motion.p>
      )}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  const reduceMotion = useReducedMotion();
  if (!message) return null;
  return (
    <motion.div
      id="auth-error-summary"
      role="alert"
      aria-live="assertive"
      tabIndex={-1}
      initial={reduceMotion ? false : { opacity: 0, height: 0 }}
      animate={reduceMotion ? false : { opacity: 1, height: 'auto' }}
      className="agf-error-banner outline-none"
    >
      <AlertCircle size={15} className="flex-shrink-0" aria-hidden />
      {message}
    </motion.div>
  );
}

export function PrimaryBtn({
  children,
  onClick,
  type = 'submit',
  disabled,
  loading,
  success,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'submit' | 'button';
  disabled?: boolean;
  loading?: boolean;
  success?: boolean;
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading || success}
      className="agf-btn-primary"
      style={success ? { background: 'var(--badge-success-text, #10b981)', boxShadow: 'none' } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      aria-busy={loading || undefined}
    >
      {loading && (
        <span
          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
          aria-hidden
        />
      )}
      {loading && <span className="sr-only">Loading</span>}
      {children}
    </motion.button>
  );
}

export function OrDivider() {
  return <div className="agf-divider">or continue with</div>;
}

export function GoogleBtn({ onClick, label = 'Google' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="agf-social-btn" aria-label={`Continue with ${label}`}>
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 48 48" aria-hidden>
        <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.77-6.77C35.41 2.38 30.21 0 24 0 14.67 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.5 17.79 9.5 24 9.5z" />
        <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.16 7.09-10.29 7.09-17.55z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.67 48 24 48z" />
      </svg>
      <span>{label}</span>
    </button>
  );
}

export function OtpInputs({
  digits,
  inputRefs,
  locked,
  error,
  errorMessage,
  onChange,
  onKeyDown,
  onPaste,
}: {
  digits: string[];
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  locked: boolean;
  error: boolean;
  errorMessage?: string;
  onChange: (i: number, raw: string) => void;
  onKeyDown: (i: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
}) {
  const hintId = useId();
  const errorId = useId();

  return (
    <div>
      <p id={hintId} className="sr-only">
        Enter the 6-digit verification code. You can paste the full code into any box.
      </p>
      <div
        className="agf-otp-grid"
        role="group"
        aria-labelledby={hintId}
        aria-describedby={error && errorMessage ? errorId : hintId}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            value={d}
            disabled={locked}
            onChange={(e) => onChange(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            className={['agf-otp-digit', d ? 'is-filled' : '', error ? 'is-error' : ''].filter(Boolean).join(' ')}
            aria-label={`Digit ${i + 1} of 6`}
            aria-invalid={error || undefined}
          />
        ))}
      </div>
      {error && errorMessage && (
        <p id={errorId} role="alert" className="agf-field__error text-center mt-3">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export function applyOtpInput(
  index: number,
  raw: string,
  current: string[],
): { next: string[]; focusIndex: number } {
  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly.length <= 1) {
    const next = [...current];
    next[index] = digitsOnly;
    return { next, focusIndex: digitsOnly && index < 5 ? index + 1 : index };
  }
  const chars = digitsOnly.slice(0, 6).split('');
  const next = Array.from({ length: 6 }, (_, i) => chars[i] || '');
  return { next, focusIndex: Math.min(5, chars.length - 1) };
}
