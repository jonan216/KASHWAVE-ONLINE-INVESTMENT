import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  FiTrendingUp, FiLock, FiMail, FiUser, FiArrowRight,
  FiCheckCircle, FiEye, FiEyeOff, FiShield, FiDollarSign, FiBarChart2, FiGift
} from 'react-icons/fi';
import ugxNotes from '../assets/ugx_notes.png';
import usdNotes from '../assets/usd_notes.png';

const passwordRules = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number',           test: (p) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const RegisterPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [searchParams] = useSearchParams();
  const [referredByCode, setReferredByCode] = useState('');

  useEffect(() => {
    const refFromUrl = searchParams.get('ref');
    if (refFromUrl) setReferredByCode(refFromUrl.toUpperCase());
  }, [searchParams]);

  const { register } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return showError('Passwords do not match. Please try again.');
    const failedRule = passwordRules.find(r => !r.test(password));
    if (failedRule) return showError(`Password requirement: ${failedRule.label}`);
    setLoading(true);
    try {
      const res = await register(fullName, email, password, referredByCode || null);
      if (res?.success) {
        showSuccess('Account created! Welcome to KashWave.');
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.msg
        || err.response?.data?.message
        || 'Registration failed. Please try again.';
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F4E8] font-poppins flex">
      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#102542] flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#D4AF37]/8 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shadow-glow-gold">
              <FiTrendingUp className="w-5 h-5 text-[#102542]" />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">KASH<span className="text-[#D4AF37]">WAVE</span></span>
          </Link>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-3xl xl:text-4xl font-black text-white leading-tight">
              Your journey to<br />
              <span className="text-[#D4AF37]">financial freedom</span><br />
              starts here.
            </h2>
            <p className="mt-3 text-sm text-[#F8F4E8]/70 leading-relaxed font-medium">
              Join 42,800+ investors earning automated daily returns through KashWave's institutional-grade yield engine.
            </p>
          </div>

          {/* ── Currency Image Cards ── */}
          <div className="relative h-44">
            {/* USD card — behind */}
            <div className="absolute bottom-0 right-0 w-4/5 rounded-2xl overflow-hidden shadow-2xl border border-white/10 rotate-3 origin-bottom-right">
              <div className="relative">
                <img src={usdNotes} alt="US Dollar notes" className="w-full h-28 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#102542]/80 to-transparent" />
                <div className="absolute bottom-2 left-3 flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-white/70 uppercase tracking-widest">USD</span>
                  <span className="text-xs font-black text-[#D4AF37]">US Dollar</span>
                </div>
              </div>
            </div>
            {/* UGX card — in front */}
            <div className="absolute bottom-4 left-0 w-4/5 rounded-2xl overflow-hidden shadow-2xl border border-[#D4AF37]/30 -rotate-2 origin-bottom-left">
              <div className="relative">
                <img src={ugxNotes} alt="Ugandan Shilling notes" className="w-full h-28 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#102542]/80 to-transparent" />
                <div className="absolute bottom-2 left-3 flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-white/70 uppercase tracking-widest">UGX</span>
                  <span className="text-xs font-black text-[#D4AF37]">Ugandan Shilling</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Stats Row ── */}
          <div className="grid grid-cols-2 gap-3">
             {[
               { icon: FiDollarSign, val: 'UGX 148M+', label: 'Managed' },
               { icon: FiBarChart2, val: '5% Daily', label: 'ROI Rate' },
               { icon: FiShield, val: 'Email Verify', label: 'Security' },
               { icon: FiCheckCircle, val: 'Free', label: 'Setup Fee' },
             ].map((item, i) => (
              <div key={i} className="bg-white/8 border border-white/10 rounded-2xl p-3.5 text-center">
                <item.icon className="w-5 h-5 text-[#D4AF37] mx-auto mb-1" />
                <p className="text-base font-extrabold text-white">{item.val}</p>
                <p className="text-[9px] text-[#F8F4E8]/60 font-bold uppercase tracking-wider">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[11px] text-[#F8F4E8]/40 font-medium">
          © 2026 KashWave Online Investment Platform
        </p>
      </div>

      {/* ── RIGHT PANEL — Form ── */}
      <div className="flex-1 flex flex-col justify-center px-5 sm:px-10 lg:px-14 xl:px-20 py-12">
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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#102542]">Create Your Investor Account</h1>
            <p className="text-xs text-[#102542]/60 font-medium mt-1">
              Free to join. Start earning daily returns in under 5 minutes.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-[10px] font-bold text-[#102542]/70 uppercase tracking-widest mb-1.5">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiUser className="w-4 h-4 text-[#102542]/40" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Alexander Wright"
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-[#102542]/12 rounded-2xl text-sm text-[#102542] placeholder-[#102542]/30 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 transition-all font-medium"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[10px] font-bold text-[#102542]/70 uppercase tracking-widest mb-1.5">Email Address</label>
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
              <label className="block text-[10px] font-bold text-[#102542]/70 uppercase tracking-widest mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiLock className="w-4 h-4 text-[#102542]/40" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPwFocused(true)}
                  onBlur={() => setPwFocused(false)}
                  placeholder="Min 8 chars, uppercase, number, symbol"
                  className="w-full pl-11 pr-12 py-3.5 bg-white border border-[#102542]/12 rounded-2xl text-sm text-[#102542] placeholder-[#102542]/30 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#102542]/40 hover:text-[#102542]"
                >
                  {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
              {/* Password requirements checklist */}
              {(pwFocused || password.length > 0) && (
                <div className="mt-2 p-3 bg-[#F8F4E8] border border-[#102542]/10 rounded-xl grid grid-cols-2 gap-1">
                  {passwordRules.map((rule) => {
                    const ok = rule.test(password);
                    return (
                      <p key={rule.label} className={`text-[10px] font-semibold flex items-center gap-1.5 ${
                        ok ? 'text-[#16A34A]' : 'text-[#102542]/50'
                      }`}>
                        <FiCheckCircle className={`w-3 h-3 shrink-0 ${ok ? 'text-[#16A34A]' : 'text-[#102542]/30'}`} />
                        {rule.label}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[10px] font-bold text-[#102542]/70 uppercase tracking-widest mb-1.5">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiLock className="w-4 h-4 text-[#102542]/40" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-[#102542]/12 rounded-2xl text-sm text-[#102542] placeholder-[#102542]/30 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 transition-all font-medium"
                />
              </div>
            </div>

            {/* Referral Code (optional) */}
            <div>
              <label className="block text-[10px] font-bold text-[#102542]/70 uppercase tracking-widest mb-1.5">
                Referral Code <span className="text-[#102542]/40 font-medium normal-case">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiGift className="w-4 h-4 text-[#102542]/40" />
                </div>
                <input
                  type="text"
                  value={referredByCode}
                  onChange={e => setReferredByCode(e.target.value.toUpperCase())}
                  placeholder="e.g. KW-ABC12345"
                  maxLength={15}
                  className={`w-full pl-11 pr-10 py-3.5 bg-white border rounded-2xl text-sm text-[#102542] placeholder-[#102542]/30 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 transition-all font-mono font-bold tracking-widest ${
                    referredByCode && searchParams.get('ref') ? 'border-[#16A34A]/40 bg-[#16A34A]/5' : 'border-[#102542]/12'
                  }`}
                />
                {referredByCode && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <FiCheckCircle className="w-4 h-4 text-[#16A34A]" />
                  </div>
                )}
              </div>
              {referredByCode && searchParams.get('ref') && (
                <p className="text-[10px] text-[#16A34A] font-semibold mt-1 flex items-center gap-1">
                  <FiCheckCircle className="w-3 h-3" /> Referral link applied — you'll both earn bonuses!
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl gradient-navy text-[#F8F4E8] font-extrabold text-sm hover:shadow-glow-navy hover:scale-[1.01] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Account...
                </span>
              ) : (
                <>Create Free Account <FiArrowRight className="text-[#D4AF37]" /></>
              )}
            </button>

            <p className="text-[10px] text-[#102542]/50 text-center font-medium leading-relaxed pt-1">
              By creating an account you agree to KashWave's Terms of Service and Risk Disclosure Policy.
            </p>
          </form>

          <p className="mt-5 text-center text-xs text-[#102542]/60 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="font-extrabold text-[#D4AF37] hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
