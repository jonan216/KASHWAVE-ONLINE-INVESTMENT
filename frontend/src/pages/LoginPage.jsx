import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  FiTrendingUp, FiLock, FiMail, FiShield, FiArrowRight,
  FiCheckCircle, FiEye, FiEyeOff
} from 'react-icons/fi';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(email, password, requires2FA ? totpCode : null);
      if (res?.requires2FA) {
        setRequires2FA(true);
        showSuccess('Enter your 6-digit authenticator code to continue.');
      } else if (res?.success) {
        showSuccess('Welcome back! Redirecting to your dashboard...');
        navigate(res.data?.user?.role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
   };

  return (
    <div className="min-h-screen bg-[#F8F4E8] font-poppins flex">
      {/* ── LEFT PANEL (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#102542] flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#D4AF37]/8 rounded-full translate-y-1/2 -translate-x-1/2" />

        {/* Logo */}
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shadow-glow-gold">
              <FiTrendingUp className="w-5 h-5 text-[#102542]" />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">KASH<span className="text-[#D4AF37]">WAVE</span></span>
          </Link>
        </div>

        {/* Center Content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl xl:text-4xl font-black text-white leading-tight">
              Welcome back,<br />
              <span className="text-[#D4AF37]">Investor.</span>
            </h2>
            <p className="mt-3 text-sm text-[#F8F4E8]/70 leading-relaxed font-medium">
              Access your automated investment portfolio, real-time earnings dashboard, and secure withdrawal system.
            </p>
          </div>

          {/* Feature checklist */}
          <ul className="space-y-3">
            {[
              'Daily automated ROI credited 24/7',
              'Real-time portfolio valuation tracking',
              'Instant deposit & withdrawal processing',
              'Bank-grade security & 2FA protection'
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-[#F8F4E8]/80 font-medium">
                <div className="w-5 h-5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center shrink-0">
                  <FiCheckCircle className="w-3.5 h-3.5" />
                </div>
                {item}
              </li>
            ))}
          </ul>

          {/* Floating stat chip */}
          <div className="bg-white/10 border border-white/15 rounded-2xl p-4 inline-flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl gradient-gold flex items-center justify-center">
              <FiTrendingUp className="w-4 h-4 text-[#102542]" />
            </div>
            <div>
              <p className="text-[10px] text-[#F8F4E8]/60 font-bold uppercase">Platform Total Payout</p>
              <p className="text-base font-extrabold text-white">$64.2M+ Distributed</p>
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="relative z-10 text-[11px] text-[#F8F4E8]/40 font-medium">
          © 2026 KashWave Online Investment Platform
        </p>
      </div>

      {/* ── RIGHT PANEL — Form ── */}
      <div className="flex-1 flex flex-col justify-center px-5 sm:px-10 lg:px-14 xl:px-20 py-12">
        {/* Mobile Logo */}
        <div className="lg:hidden mb-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-navy flex items-center justify-center">
              <FiTrendingUp className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <span className="text-lg font-extrabold text-[#102542]">KASH<span className="text-[#D4AF37]">WAVE</span></span>
          </Link>
        </div>

        <div className="max-w-md w-full mx-auto">
          <div className="mb-7">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#102542]">
              {requires2FA ? 'Two-Factor Verification' : 'Sign In to Your Account'}
            </h1>
            <p className="text-xs text-[#102542]/60 font-medium mt-1">
              {requires2FA
                ? 'Enter the 6-digit code from your authenticator app.'
                : 'Access your investment portfolio and earnings dashboard.'}
            </p>
           </div>

           <form onSubmit={handleLogin} className="space-y-4">
            {!requires2FA ? (
              <>
                {/* Email */}
                <div>
                  <label className="block text-[10px] font-bold text-[#102542]/70 uppercase tracking-widest mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiMail className="w-4 h-4 text-[#102542]/40" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3.5 bg-white border border-[#102542]/12 rounded-2xl text-sm text-[#102542] placeholder-[#102542]/30 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold text-[#102542]/70 uppercase tracking-widest">
                      Password
                    </label>
                    <a href="#" className="text-[10px] text-[#D4AF37] font-bold hover:underline">Forgot Password?</a>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiLock className="w-4 h-4 text-[#102542]/40" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3.5 bg-white border border-[#102542]/12 rounded-2xl text-sm text-[#102542] placeholder-[#102542]/30 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#102542]/40 hover:text-[#102542] transition-colors"
                    >
                      {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <FiShield className="w-3.5 h-3.5" /> Authenticator Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-4 bg-white border-2 border-[#D4AF37] rounded-2xl text-center text-2xl font-black tracking-[0.5em] text-[#102542] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl gradient-navy text-[#F8F4E8] font-extrabold text-sm hover:shadow-glow-navy hover:scale-[1.01] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                <>
                  {requires2FA ? 'Verify Code' : 'Sign In to Portal'} <FiArrowRight className="text-[#D4AF37]" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#102542]/60 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="font-extrabold text-[#D4AF37] hover:underline">
              Create Account — It's Free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
