import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import {
  FiShield, FiLock, FiCheckCircle, FiAlertTriangle,
  FiActivity, FiSmartphone, FiKey, FiSave, FiMail
} from 'react-icons/fi';

const SecurityPage = () => {
  const { user, refreshProfile } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [passwords, setPasswords] = useState({ current: '', new_: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new_ !== passwords.confirm) return showError("New passwords don't match.");
    if (passwords.new_.length < 6) return showError('Password must be at least 6 characters.');
    setSaving(true);
    try {
      const res = await api.put('/auth/change-password', {
        current_password: passwords.current,
        new_password: passwords.new_
      });
      if (res.data.success) {
        showSuccess('Password changed successfully.');
        setPasswords({ current: '', new_: '', confirm: '' });
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Password change failed.');
    } finally { setSaving(false); }
  };

  const handleRequestVerification = async (e) => {
    e.preventDefault();
    if (!verifyEmail) return showError('Please enter your email address.');
    setVerifying(true);
    try {
      const res = await api.post('/auth/request-email-verification', { email: verifyEmail });
      if (res.data.success) {
        showSuccess('Verification code sent! Check your email.');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to send verification code.');
    } finally { setVerifying(false); }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    if (!verifyCode || !verifyEmail) return showError('Please enter the verification code.');
    setVerifying(true);
    try {
      const userForId = await api.get('/auth/me');
      const userId = userForId.data.data.user.id;
      const res = await api.post('/auth/verify-email', { code: verifyCode, userId });
      if (res.data.success) {
        showSuccess('Email verified successfully!');
        setVerifyCode('');
        refreshProfile();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Verification failed.');
    } finally { setVerifying(false); }
  };

  const securityItems = [
    {
      icon: FiCheckCircle,
      color: user?.is_email_verified ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-[#F59E0B]/10 text-[#F59E0B]',
      label: 'Email Verification',
      status: user?.is_email_verified ? 'Verified' : 'Not Verified',
      statusColor: user?.is_email_verified ? 'text-[#16A34A]' : 'text-[#F59E0B]',
    },
    {
      icon: FiLock,
      color: 'bg-[#16A34A]/10 text-[#16A34A]',
      label: 'Password Encryption',
      status: 'AES-256 Active',
      statusColor: 'text-[#16A34A]',
    },
    {
      icon: FiActivity,
      color: 'bg-[#102542]/10 text-[#102542]',
      label: 'Account Monitoring',
      status: '24/7 Active',
      statusColor: 'text-[#102542]',
    },
  ];

  const loginHistory = [
    { device: 'Chrome on Windows', location: 'Lagos, Nigeria', time: 'Today, 07:12 AM', current: true },
    { device: 'Mobile - Safari', location: 'Lagos, Nigeria', time: 'Yesterday, 11:45 PM', current: false },
    { device: 'Chrome on Windows', location: 'Lagos, Nigeria', time: '3 days ago', current: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="max-w-2xl mx-auto space-y-7 pb-8"
    >
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-[#102542]">Security Center</h2>
        <p className="text-xs text-[#102542]/60 font-medium mt-1">Manage your account security settings and view recent login activity.</p>
      </div>

      {/* Security Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {securityItems.map((item, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-[#102542]/8 shadow-soft flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-[#102542]">{item.label}</p>
              <p className={`text-[10px] font-bold mt-0.5 ${item.statusColor}`}>{item.status}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Email Verification */}
      {!user?.is_email_verified && (
        <div className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft overflow-hidden">
          <div className="h-1.5 gradient-gold" />
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
                <FiMail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#102542]">Verify Your Email</h3>
                <p className="text-[10px] text-[#102542]/60 font-medium">Enter your email to receive a verification code.</p>
              </div>
            </div>
            <form onSubmit={handleRequestVerification} className="space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={verifyEmail}
                  onChange={e => setVerifyEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3.5 bg-[#F8F4E8] border border-[#102542]/12 rounded-2xl text-sm text-[#102542] placeholder-[#102542]/30 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 transition-all font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={verifying}
                className="w-full py-3.5 rounded-2xl gradient-navy text-[#F8F4E8] font-extrabold text-sm hover:shadow-glow-navy transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {verifying ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiMail className="w-4 h-4 text-[#D4AF37]" />}
                {verifying ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>

            <form onSubmit={handleVerifyEmail} className="space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-1.5">Verification Code</label>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full px-4 py-3.5 bg-[#F8F4E8] border border-[#102542]/12 rounded-2xl text-sm text-[#102542] placeholder-[#102542]/30 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 transition-all font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={verifying}
                className="w-full py-3.5 rounded-2xl gradient-navy text-[#F8F4E8] font-extrabold text-sm hover:shadow-glow-navy transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {verifying ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiCheckCircle className="w-4 h-4 text-[#D4AF37]" />}
                {verifying ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft overflow-hidden">
        <div className="h-1.5 gradient-gold" />
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
              <FiKey className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#102542]">Change Password</h3>
              <p className="text-[10px] text-[#102542]/60 font-medium">Use a strong, unique password for maximum security.</p>
            </div>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {[
              { label: 'Current Password',    key: 'current', placeholder: '••••••••••' },
              { label: 'New Password',         key: 'new_',    placeholder: 'Min 6 characters' },
              { label: 'Confirm New Password', key: 'confirm', placeholder: 'Re-enter new password' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-1.5">{f.label}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiLock className="w-4 h-4 text-[#102542]/40" />
                  </div>
                  <input
                    type="password"
                    value={passwords[f.key]}
                    onChange={e => setPasswords(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full pl-11 pr-4 py-3.5 bg-[#F8F4E8] border border-[#102542]/12 rounded-2xl text-sm text-[#102542] placeholder-[#102542]/30 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 transition-all font-medium"
                  />
                </div>
              </div>
            ))}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-2xl gradient-navy text-[#F8F4E8] font-extrabold text-sm hover:shadow-glow-navy transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave className="w-4 h-4" />}
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Login History */}
      <div className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft overflow-hidden">
        <div className="px-6 sm:px-7 py-5 border-b border-[#102542]/8">
          <h3 className="text-sm font-extrabold text-[#102542]">Recent Login Activity</h3>
          <p className="text-[10px] text-[#102542]/60 font-medium mt-0.5">Last 3 sessions on your account</p>
        </div>
        <div className="divide-y divide-[#102542]/6">
          {loginHistory.map((session, i) => (
            <div key={i} className="flex items-center justify-between px-6 sm:px-7 py-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${session.current ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-[#102542]/8 text-[#102542]/50'}`}>
                  <FiActivity className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#102542]">{session.device}</p>
                  <p className="text-[10px] text-[#102542]/50 font-medium">{session.location} · {session.time}</p>
                </div>
              </div>
              {session.current && (
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#16A34A] bg-[#16A34A]/10 px-2.5 py-1 rounded-full">Current</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default SecurityPage;
