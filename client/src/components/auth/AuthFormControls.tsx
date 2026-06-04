import { useEffect, useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, AlertCircle, ArrowRight } from 'lucide-react';

const PRIMARY = 'var(--brand-primary)';
const SUCCESS = 'var(--badge-success-text)';

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

/** Move focus to the banner or first invalid field when a form-level error appears */
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
}) {
  const fieldId = authFieldId(label);
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;
  const describedBy = [error ? errorId : null, helperText ? helperId : null].filter(Boolean).join(' ') || undefined;

  const inputState = error ? 'premium-input--error' : valid ? 'premium-input--valid' : '';

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={fieldId}
        className="auth-mobile-input-label premium-input-label text-[11px] font-bold uppercase tracking-[0.1em]"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
        {required ? (
          <span className="auth-required-mark" style={{ color: PRIMARY }} aria-hidden>
            {' '}
            *
          </span>
        ) : null}
        <span className="sr-only">{required ? ' (required)' : ''}</span>
      </label>
      {helperText && (
        <p id={helperId} className="auth-field-helper text-[12px] leading-snug" style={{ color: 'var(--text-muted)' }}>
          {helperText}
        </p>
      )}
      <div className="premium-input-wrap">
        {LeftIcon && (
          <span className="premium-input-icon premium-input-icon--left" aria-hidden>
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
            'premium-input auth-mobile-input w-full outline-none text-base sm:text-[15px]',
            LeftIcon ? 'premium-input--has-left-icon' : '',
            rightEl || valid ? 'premium-input--has-right-icon' : '',
            inputState,
            focused && !error ? 'is-focused' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ color: 'var(--text-primary)' }}
        />
        {rightEl && (
          <span className="premium-input-icon premium-input-icon--right premium-input-icon--interactive">
            {rightEl}
          </span>
        )}
        {valid && !rightEl && (
          <span className="premium-input-icon premium-input-icon--right" aria-hidden>
            <Check size={16} style={{ color: SUCCESS }} />
            <span className="sr-only">Valid</span>
          </span>
        )}
      </div>
      {error && (
        <motion.p
          id={errorId}
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="auth-field-error text-[12px] flex items-center gap-1"
          style={{ color: 'var(--badge-error-text)' }}
        >
          <AlertCircle size={11} aria-hidden /> {error}
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
      className="auth-error-banner flex items-center gap-2.5 px-4 py-3 rounded-2xl text-[13px] font-medium outline-none"
      style={{
        background: 'var(--badge-error-bg)',
        border: '1px solid var(--badge-error-border)',
        color: 'var(--badge-error-text)',
      }}
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
  const reduceMotion = useReducedMotion();
  const bg = success ? 'var(--accent-success-gradient)' : 'var(--gradient-brand-cta)';

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!reduceMotion && !disabled && !loading ? { y: -2 } : {}}
      whileTap={!reduceMotion && !disabled ? { scale: 0.98 } : {}}
      aria-busy={loading || undefined}
      aria-disabled={disabled || loading || undefined}
      className="auth-mobile-btn-primary auth-cta-primary relative w-full min-h-[48px] h-12 sm:h-14 rounded-xl sm:rounded-2xl font-bold text-[15px] sm:text-[16px] flex items-center justify-center gap-2.5 overflow-hidden border-none cursor-pointer select-none"
      style={{
        background: bg,
        color: 'var(--text-on-accent)',
        boxShadow:
          disabled && !success
            ? 'none'
            : success
              ? '0 8px 24px color-mix(in srgb, var(--badge-success-text) 35%, transparent)'
              : 'var(--shadow-cta-hover), var(--shadow-cta)',
        opacity: disabled && !success ? 0.55 : 1,
      }}
    >
      <span className="relative flex items-center gap-2">
        {loading && (
          <span
            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
            aria-hidden
          />
        )}
        {loading && <span className="sr-only">Loading</span>}
        {success && <span className="sr-only">Success</span>}
        {children}
      </span>
    </motion.button>
  );
}

export function OrDivider() {
  return (
    <div className="auth-or-divider flex items-center gap-3 my-1" role="separator" aria-label="Or">
      <div className="flex-1 h-px auth-or-line" />
      <span className="text-[11px] font-semibold tracking-wider uppercase auth-or-label">or</span>
      <div className="flex-1 h-px auth-or-line" />
    </div>
  );
}

export function GoogleBtn({ onClick, label = 'Continue with Google' }: { onClick: () => void; label?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={!reduceMotion ? { y: -1 } : {}}
      whileTap={!reduceMotion ? { scale: 0.98 } : {}}
      aria-label={label}
      className="auth-mobile-btn-google auth-oauth-google w-full min-h-[48px] h-12 sm:h-[54px] rounded-xl sm:rounded-2xl flex items-center justify-center gap-3 text-[15px] font-semibold border-none cursor-pointer"
      style={{
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        boxShadow: '0 0 0 1.5px var(--border-card)',
      }}
    >
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 48 48" aria-hidden>
        <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.77-6.77C35.41 2.38 30.21 0 24 0 14.67 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.5 17.79 9.5 24 9.5z" />
        <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.16 7.09-10.29 7.09-17.55z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.67 48 24 48z" />
      </svg>
      <span>{label}</span>
    </motion.button>
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
        className="auth-otp-grid"
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
            className={[
              'premium-input-exempt auth-otp-digit',
              d ? 'is-filled' : '',
              error ? 'is-error' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={`Digit ${i + 1} of 6`}
            aria-invalid={error || undefined}
          />
        ))}
      </div>
      {error && errorMessage && (
        <p id={errorId} role="alert" className="auth-otp-error text-[13px] text-center mt-3" style={{ color: 'var(--badge-error-text)' }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}

/** Fill OTP from paste or multi-character input; returns next digits array */
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
