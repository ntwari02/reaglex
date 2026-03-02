import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowLeft, Sun, Moon, Home } from 'lucide-react';
import { ToastContainer, useToast } from '../components/ui/toast';

export function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { toasts, showToast, removeToast } = useToast();
  const email = location.state?.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0];
    }

    if (!/^\d*$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) {
      return;
    }

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'recovery',
    });

    if (error) {
      setError(error.message || 'Invalid OTP. Please try again.');
      setLoading(false);
    } else {
      navigate('/reset-password', { state: { email } });
    }
  };

  const handleResendOTP = async () => {
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError('Failed to resend OTP. Please try again.');
    } else {
      setError('');
      showToast('New OTP sent to your email!', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0f] flex">
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 p-3 bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:scale-110 transition-transform group"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5 text-yellow-500 group-hover:rotate-45 transition-transform duration-300" />
        ) : (
          <Moon className="h-5 w-5 text-gray-700 group-hover:-rotate-12 transition-transform duration-300" />
        )}
      </button>
      <Link
        to="/"
        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 p-3 bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:scale-110 transition-transform group"
        aria-label="Go to home"
      >
        <Home className="h-5 w-5 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform duration-300" />
      </Link>

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-cyan-600 via-teal-600 to-blue-700 dark:from-cyan-900 dark:via-teal-900 dark:to-blue-950">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-teal-500/20 to-cyan-600/20 dark:from-cyan-500/10 dark:via-teal-500/10 dark:to-cyan-600/10" />
        <img
          src="https://images.pexels.com/photos/5709661/pexels-photo-5709661.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Shopping Cart"
          className="w-full h-full object-cover mix-blend-overlay opacity-40 dark:opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/80 via-transparent to-transparent dark:from-[#0a0a0f] dark:via-transparent dark:to-transparent" />

        <div className="absolute top-8 left-8">
          <img
            src="/logo.jpg"
            alt="REAGLE-X Logo"
            className="h-16 w-16 rounded-full object-cover shadow-lg"
          />
        </div>

        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h1 className="text-5xl font-bold mb-4 leading-tight">
            Almost There!
          </h1>
          <p className="text-lg text-cyan-100 dark:text-cyan-100 leading-relaxed max-w-lg">
            Enter the verification code we sent to your email to continue resetting your password.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden text-center">
            <div className="flex items-center justify-center mb-4">
              <img
                src="/logo.jpg"
                alt="REAGLE-X Logo"
                className="h-16 w-16 rounded-full object-cover shadow-lg"
              />
            </div>
          </div>

          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>

          <div className="mb-10">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Verify OTP
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Enter the 6-digit code sent to <span className="font-semibold">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Verification Code
              </label>
              <div className="flex gap-3 justify-between">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-14 h-14 text-center text-2xl font-bold bg-white dark:bg-[#1a1a2e]/80 border border-gray-300 dark:border-gray-700/50 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.some(digit => !digit)}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white py-4 rounded-xl font-semibold hover:from-orange-700 hover:to-orange-800 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-orange-500/20"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOTP}
                className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-semibold transition"
              >
                Didn't receive the code? Resend OTP
              </button>
            </div>
          </form>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
