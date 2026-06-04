import { useState } from 'react';
import { Eye, EyeOff, Check, X, Loader2, Shield, Smartphone } from 'lucide-react';
import ModernSheet from '../ui/ModernSheet';
import { useToastStore } from '../../stores/toastStore';

const PRIMARY = 'var(--brand-primary)';

export default function SecuritySettingsSheet({ open, onClose }) {
  const showToast = useToastStore((s) => s.showToast);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [twoFa, setTwoFa] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSave =
    currentPassword &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

  const updatePassword = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    showToast('Password updated', 'success');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <ModernSheet
      open={open}
      onClose={onClose}
      title="Security"
      subtitle="Password, 2FA, and active sessions"
      tall
    >
      <div className="rx-sec-sheet space-y-5">
        <section className="rx-sec-block">
          <h3 className="rx-sec-block-title">Change password</h3>
          <label className="rx-sec-field">
            <span>Current password</span>
            <div className="rx-sec-input-wrap">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowCurrent((v) => !v)} aria-label="Toggle visibility">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          <label className="rx-sec-field">
            <span>New password</span>
            <div className="rx-sec-input-wrap">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowNew((v) => !v)} aria-label="Toggle visibility">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="rx-sec-strength">
              {[1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={newPassword.length >= i * 2 ? 'on' : ''}
                  data-level={newPassword.length >= 10 ? 3 : newPassword.length >= 6 ? 2 : 1}
                />
              ))}
            </div>
          </label>
          <label className="rx-sec-field">
            <span>Confirm password</span>
            <div className="rx-sec-input-wrap">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              {confirmPassword &&
                (newPassword === confirmPassword ? (
                  <Check size={16} className="text-emerald-500" />
                ) : (
                  <X size={16} className="text-red-500" />
                ))}
            </div>
          </label>
          <button
            type="button"
            className="rx-sec-primary-btn"
            disabled={!canSave || saving}
            onClick={updatePassword}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Update password
          </button>
        </section>

        <section className="rx-sec-block">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rx-sec-icon-wrap">
                <Shield size={18} />
              </span>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Two-factor authentication
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Extra protection at sign-in
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={twoFa}
              className={`rx-sec-toggle${twoFa ? ' is-on' : ''}`}
              onClick={() => setTwoFa((v) => !v)}
            >
              <span className="rx-sec-toggle-knob" />
            </button>
          </div>
        </section>

        <section className="rx-sec-block">
          <h3 className="rx-sec-block-title flex items-center gap-2">
            <Smartphone size={16} />
            This device
          </h3>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            You are signed in on this browser. Sign out other devices from desktop account settings.
          </p>
          <button type="button" className="rx-sec-outline-btn" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
            Sign out other devices
          </button>
        </section>
      </div>
    </ModernSheet>
  );
}
