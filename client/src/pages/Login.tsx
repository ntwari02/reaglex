import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import AuthLayout from '../components/AuthLayout';

function hasSQLInjectionRisk(value: string): boolean {
  const pattern = /(;|--|\/\*|\*\/|\b(OR|AND)\b\s+\d+=\d+|\bxp_)/i;
  return pattern.test(value);
}

const inputClass =
  'w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all bg-white border placeholder-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { showToast } = useToastStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !password) { setError('Please enter both email and password'); setLoading(false); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address'); setLoading(false); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
    if (hasSQLInjectionRisk(email) || hasSQLInjectionRisk(password)) { setError('Input contains invalid characters'); setLoading(false); return; }

    try {
      const result = await login(email, password);
      if (!result.success) { setError(result.error || 'Login failed. Please check your credentials.'); setLoading(false); return; }

      showToast('Login successful. Welcome back to Reaglex!', 'success');
      const { user } = useAuthStore.getState();
      if (user?.role === 'seller') navigate('/seller');
      else if (user?.role === 'admin') navigate('/admin');
      else navigate('/');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout tab="login" formTitle="Sign in">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">
            {error}
          </div>
        )}

        {/* Email */}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter Email or Phone"
          className={inputClass}
          style={{ borderColor: '#e5e7eb' }}
        />

        {/* Password */}
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className={inputClass}
            style={{ borderColor: '#e5e7eb', paddingRight: '44px' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Recover password */}
        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-xs font-medium hover:underline"
            style={{ color: '#ff8c42' }}
          >
            Recover Password?
          </Link>
        </div>

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
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">Or Continue with</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Google only */}
        <button
          type="button"
          onClick={() => {
            const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            window.location.href = `${base}/auth/google?role=buyer`;
          }}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl border text-sm font-medium hover:bg-gray-50 transition hover:shadow-md"
          style={{ borderColor: '#e5e7eb', color: '#374151' }}
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48"><path d="M44.5 20H24V28.5H35.5C34.7 32.5 32.1 35.5 28.5 37.1V43.5H35.5C40.5 39.5 43.5 33.5 44.5 28.5V20Z" fill="#4285F4"/><path d="M24 44C30.5 44 36 41.5 39.5 37.5L32.5 31.5C30.5 33.5 27.5 35 24 35C18.5 35 13.5 31.5 11.5 26.5H4.5V33.5C7.5 39.5 15 44 24 44Z" fill="#34A853"/><path d="M11.5 26.5C11 25 11 23.5 11 22C11 20.5 11 19 11.5 17.5V10.5H4.5C3.5 15.5 3.5 20.5 4.5 26.5H11.5Z" fill="#FBBC05"/><path d="M24 13C27 13 29.5 14 31.5 16L38 9.5C36 7.5 33.5 6 30.5 5C21.5 5 14 9.5 11 17.5L18 22.5C19.5 18.5 21.5 13 24 13Z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <p className="text-center text-xs mt-2" style={{ color: '#9ca3af' }}>
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold hover:underline" style={{ color: '#ff8c42' }}>
            Sign Up
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
