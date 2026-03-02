import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Briefcase } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';
import AuthLayout from '../components/AuthLayout';

function hasSQLInjectionRisk(value: string): boolean {
  const pattern = /(;|--|\/\*|\*\/|\b(OR|AND)\b\s+\d+=\d+|\bxp_)/i;
  return pattern.test(value);
}

const inputClass =
  'w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all bg-white border placeholder-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100';

export function Signup() {
  const navigate = useNavigate();
  const { showToast } = useToastStore();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'buyer' as 'buyer' | 'seller',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters'); setLoading(false); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address'); setLoading(false); return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters'); setLoading(false); return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match'); setLoading(false); return;
    }
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service'); setLoading(false); return;
    }
    if (hasSQLInjectionRisk(formData.fullName) || hasSQLInjectionRisk(formData.email) || hasSQLInjectionRisk(formData.password)) {
      setError('Input contains invalid characters'); setLoading(false); return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.message || 'Failed to create account'); setLoading(false); return; }

      showToast(
        formData.role === 'seller'
          ? 'Account created! Your seller profile is pending verification.'
          : 'Account created successfully! Please log in.',
        'success'
      );
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout tab="signup" formTitle="Create account">
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">
            {error}
          </div>
        )}

        {/* Full Name */}
        <input
          type="text"
          required
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          placeholder="Full Name"
          className={inputClass}
          style={{ borderColor: '#e5e7eb' }}
        />

        {/* Email */}
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Email Address"
          className={inputClass}
          style={{ borderColor: '#e5e7eb' }}
        />

        {/* Password */}
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Password"
            className={inputClass}
            style={{ borderColor: '#e5e7eb', paddingRight: '44px' }}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Confirm Password */}
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            required
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="Confirm Password"
            className={inputClass}
            style={{ borderColor: '#e5e7eb', paddingRight: '44px' }}
          />
          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Role selector */}
        <div className="grid grid-cols-2 gap-2">
          {(['buyer', 'seller'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFormData({ ...formData, role: r })}
              className="flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 text-xs font-semibold transition-all"
              style={{
                borderColor: formData.role === r ? '#ff8c42' : '#e5e7eb',
                background: formData.role === r ? 'rgba(255,140,66,0.07)' : 'white',
                color: formData.role === r ? '#ff8c42' : '#6b7280',
              }}
            >
              {r === 'buyer' ? <User className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
              {r === 'buyer' ? 'Buy Products' : 'Sell Products'}
            </button>
          ))}
        </div>

        {/* Terms */}
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 w-3.5 h-3.5 rounded accent-orange-500 flex-shrink-0"
          />
          <span className="text-xs leading-tight" style={{ color: '#6b7280' }}>
            I agree to the{' '}
            <span style={{ color: '#ff8c42' }}>Terms of Service</span>
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-2xl text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #ff8c42 0%, #ff5f00 100%)',
            boxShadow: '0 8px 24px rgba(255,140,66,0.35)',
          }}
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">Or sign up with</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={() => {
            const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            window.location.href = `${base}/auth/google?role=${formData.role}`;
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border text-sm font-medium hover:bg-gray-50 transition hover:shadow-md"
          style={{ borderColor: '#e5e7eb', color: '#374151' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 48 48"><path d="M44.5 20H24V28.5H35.5C34.7 32.5 32.1 35.5 28.5 37.1V43.5H35.5C40.5 39.5 43.5 33.5 44.5 28.5V20Z" fill="#4285F4"/><path d="M24 44C30.5 44 36 41.5 39.5 37.5L32.5 31.5C30.5 33.5 27.5 35 24 35C18.5 35 13.5 31.5 11.5 26.5H4.5V33.5C7.5 39.5 15 44 24 44Z" fill="#34A853"/><path d="M11.5 26.5C11 25 11 23.5 11 22C11 20.5 11 19 11.5 17.5V10.5H4.5C3.5 15.5 3.5 20.5 4.5 26.5H11.5Z" fill="#FBBC05"/><path d="M24 13C27 13 29.5 14 31.5 16L38 9.5C36 7.5 33.5 6 30.5 5C21.5 5 14 9.5 11 17.5L18 22.5C19.5 18.5 21.5 13 24 13Z" fill="#EA4335"/></svg>
          Sign up with Google
        </button>

        <p className="text-center text-xs" style={{ color: '#9ca3af' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold hover:underline" style={{ color: '#ff8c42' }}>
            Sign In
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
