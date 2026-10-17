'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'live' | 'demo'>('live');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          username: mode === 'live' ? username.trim() : undefined,
          password: mode === 'live' ? password : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Authentication failed. Please verify credentials.');
        return;
      }

      // Successful login
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to connect to local authentication server.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setErrorMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'demo' }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setErrorMessage('Failed to start demo session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfcfb] dark:bg-[#141518] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top institution header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#1c1917] text-white dark:bg-[#f3f4f6] dark:text-[#141518] border border-[#e7e4de] dark:border-[#2a2d35] mb-3 shadow-xs">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1c1917] dark:text-[#f3f4f6]">
          ETLAB Modern Portal
        </h1>
        <p className="text-xs font-medium text-[#78716c] dark:text-[#9ca3af] mt-1 uppercase tracking-wider">
          TKM College of Engineering, Kollam
        </p>
        <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-1">
          Redesigned academic intelligence, attendance analytics, and timetable dashboard
        </p>
      </div>

      {/* Main card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-[#1b1d22] py-7 px-6 sm:px-8 rounded-xl border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs">
          {/* Mode Switcher Tabs */}
          <div className="flex p-1 bg-[#f4f1eb] dark:bg-[#202227] rounded-lg mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('live');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                mode === 'live'
                  ? 'bg-white dark:bg-[#1b1d22] text-[#1c1917] dark:text-[#f3f4f6] shadow-xs'
                  : 'text-[#78716c] hover:text-[#1c1917] dark:text-[#9ca3af] dark:hover:text-[#f3f4f6]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#1c1917] dark:text-[#f3f4f6]" />
              Live ETLAB (TKMCE)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('demo');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                mode === 'demo'
                  ? 'bg-white dark:bg-[#1b1d22] text-[#1c1917] dark:text-[#f3f4f6] shadow-xs'
                  : 'text-[#78716c] hover:text-[#1c1917] dark:text-[#9ca3af] dark:hover:text-[#f3f4f6]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#78716c] dark:text-[#9ca3af]" />
              Interactive Demo
            </button>
          </div>

          {/* Mode Explanation Banner */}
          {mode === 'live' ? (
            <div className="mb-5 p-3 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] text-xs text-[#1c1917] dark:text-[#f3f4f6] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Authorized TKMCE ETLAB Connection</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#78716c] dark:text-[#9ca3af]">
                Sign in with your standard TKMCE credentials. Your session is established directly via HTTPS with{' '}
                <code className="px-1 py-0.5 rounded bg-[#f4f1eb] dark:bg-[#282b33] font-mono text-[10px] text-[#1c1917] dark:text-[#f3f4f6]">
                  tkmce.etlab.in
                </code>
                . Passwords are never stored or logged anywhere.
              </p>
            </div>
          ) : (
            <div className="mb-5 p-3 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] text-xs text-[#1c1917] dark:text-[#f3f4f6] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <Sparkles className="w-4 h-4 text-[#1c1917] dark:text-[#f3f4f6] shrink-0" />
                <span>Synthetic Demo Exploration</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#78716c] dark:text-[#9ca3af]">
                Explore the full attendance simulator, timetable, and academic dashboard instantly using realistic KTU S6 Computer Science data.
              </p>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40 flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {mode === 'live' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1c1917] dark:text-[#f3f4f6] mb-1.5">
                  ETLAB Username / Admission No.
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c] dark:text-[#9ca3af]" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. 23CS1042 or admission no."
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-lg bg-[#fdfcfb] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] placeholder:text-[#a8a29e] dark:placeholder:text-[#6b7280] outline-none focus:border-[#1c1917] dark:focus:border-[#f3f4f6]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
                    ETLAB Password
                  </label>
                  <a
                    href="https://tkmce.etlab.in/user/resetpassword"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#78716c] dark:text-[#9ca3af] hover:underline flex items-center gap-1"
                  >
                    Forgot password? <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c] dark:text-[#9ca3af]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your ETLAB password"
                    className="w-full pl-9 pr-10 py-2 text-xs font-medium rounded-lg bg-[#fdfcfb] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] placeholder:text-[#a8a29e] dark:placeholder:text-[#6b7280] outline-none focus:border-[#1c1917] dark:focus:border-[#f3f4f6]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716c] hover:text-[#1c1917] dark:text-[#9ca3af] dark:hover:text-[#f3f4f6]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 rounded-lg font-medium text-xs bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-[#141518] shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-[#fdfcfb] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] space-y-1.5 text-xs">
                <div className="flex items-center gap-2 font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Demo Student Profile</span>
                </div>
                <p className="text-[#78716c] dark:text-[#9ca3af] leading-relaxed">
                  Adwait S. • TKM23CS042 • B.Tech Computer Science (S6) • TKM College of Engineering
                </p>
                <div className="pt-1 flex items-center gap-3 text-[11px] text-[#78716c] dark:text-[#9ca3af]">
                  <span>Overall: 83.2%</span>
                  <span>• Target: 75%</span>
                  <span>• 7 Courses</span>
                </div>
              </div>

              <button
                onClick={handleDemoSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg font-medium text-xs bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-[#141518] shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span>Launching Demo Workspace...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Enter Demo Dashboard</span>
                  </>
                )}
              </button>
            </div>
          )}

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
          <p>© 2026 TKM College of Engineering Academic Portal Interface</p>
        </div>
      </div>
    </div>
  );
}
