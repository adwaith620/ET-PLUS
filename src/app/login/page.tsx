'use client';

import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // If user is already authenticated, redirect directly to dashboard
  React.useEffect(() => {
    document.title = 'Login | ETPlus';
    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          window.location.replace('/dashboard');
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'live',
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Authentication failed. Please verify credentials.');
        setLoading(false);
        return;
      }

      // Successful login: Direct browser navigation guarantees the session cookie
      // is dispatched with the document request, completely avoiding client router redirect caching.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/dashboard';
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to connect to authentication server.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfcfb] dark:bg-[#141518] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top institution header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center mb-3">
          <BrandLogo size={48} className="rounded-xl shadow-xs" priority />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1c1917] dark:text-[#f3f4f6]">
          ETPlus
        </h1>
        <p className="text-xs font-medium text-[#78716c] dark:text-[#9ca3af] mt-1 uppercase tracking-wider">
          TKM College of Engineering, Kollam
        </p>
        <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-1">
          Academic intelligence, attendance analytics, and timetable dashboard
        </p>
      </div>

      {/* Main card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-[#1b1d22] py-7 px-6 sm:px-8 rounded-xl border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs">
          {/* Connection Banner */}
          <div className="mb-5 p-3 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] text-xs text-[#1c1917] dark:text-[#f3f4f6] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Authorized TKMCE ETLAB Connection</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#78716c] dark:text-[#9ca3af]">
              Sign in with your institutional credentials. Your session is authenticated directly with{' '}
              <code className="px-1 py-0.5 rounded bg-[#f4f1eb] dark:bg-[#282b33] font-mono text-[10px] text-[#1c1917] dark:text-[#f3f4f6]">
                tkmce.etlab.in
              </code>
              . Passwords are never stored or logged anywhere.
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-5 p-3 rounded-lg bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40 flex items-start gap-2.5 text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-username" className="block text-xs font-semibold text-[#1c1917] dark:text-[#f3f4f6] mb-1.5">
                ETLAB Username / Admission No.
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c] dark:text-[#9ca3af]" />
                <input
                  id="login-username"
                  type="text"
                  required
                  disabled={loading}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. 23CS1042 or admission no."
                  className="w-full pl-9 pr-3 py-2.5 min-h-[44px] text-xs font-medium rounded-lg bg-[#fdfcfb] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] placeholder:text-[#a8a29e] dark:placeholder:text-[#6b7280] outline-none focus:border-[#1c1917] dark:focus:border-[#f3f4f6] disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
                  ETLAB Password
                </label>
                <a
                  href="https://tkmce.etlab.in/user/resetpassword"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#78716c] dark:text-[#9ca3af] hover:underline flex items-center gap-1 min-h-[36px]"
                >
                  Forgot password? <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c] dark:text-[#9ca3af]" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your ETLAB password"
                  className="w-full pl-9 pr-12 py-2.5 min-h-[44px] text-xs font-medium rounded-lg bg-[#fdfcfb] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] placeholder:text-[#a8a29e] dark:placeholder:text-[#6b7280] outline-none focus:border-[#1c1917] dark:focus:border-[#f3f4f6] disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#78716c] hover:text-[#1c1917] dark:text-[#9ca3af] dark:hover:text-[#f3f4f6]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 min-h-[44px] px-4 rounded-lg font-medium text-xs bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-[#141518] shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Authenticating with ETLAB...</span>
              ) : (
                <>
                  <span>Sign in with ETLAB</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Features Badges */}
          <div className="mt-6 pt-5 border-t border-[#e7e4de] dark:border-[#2a2d35] grid grid-cols-2 gap-2 text-[11px] text-[#78716c] dark:text-[#9ca3af]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Direct HTTPS Auth</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Password Never Saved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>HttpOnly Cookies</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Read-Only Portal</span>
            </div>
          </div>
        </div>

        {/* Official Links Footer */}
        <div className="mt-6 text-center text-xs text-[#78716c] dark:text-[#9ca3af] space-y-1">
          <p>
            Official ETLAB Portal:{' '}
            <a
              href="https://tkmce.etlab.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1c1917] dark:text-[#f3f4f6] hover:underline inline-flex items-center gap-0.5 font-medium"
            >
              tkmce.etlab.in <ExternalLink className="w-3 h-3 inline" />
            </a>
          </p>
          <p>© 2026 ETPlus • TKM College of Engineering Student Interface</p>
        </div>
      </div>
    </div>
  );
}
