import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { motion } from 'framer-motion';
import api from '../services/api';
import {
  FiUser, FiMail, FiLock, FiShield, FiCamera,
  FiCheckCircle, FiAlertTriangle, FiSave
} from 'react-icons/fi';

const ProfilePage = () => {
  const { user, refreshProfile } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [passwords, setPasswords] = useState({ current: '', new_: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [section, setSection] = useState('profile');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', profile);
      if (res.data.success) {
        showSuccess('Profile updated successfully.');
        await refreshProfile();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Profile update failed.');
    } finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new_ !== passwords.confirm) return showError("New passwords don't match.");
    setSavingPw(true);
    try {
      const res = await api.put('/auth/change-password', { current_password: passwords.current, new_password: passwords.new_ });
      if (res.data.success) {
        showSuccess('Password changed successfully.');
        setPasswords({ current: '', new_: '', confirm: '' });
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Password change failed.');
    } finally { setSavingPw(false); }
  };

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'KW';

  const TABS = [
    { id: 'profile', label: 'Profile Info', icon: FiUser },
    { id: 'security', label: 'Password', icon: FiLock },
    { id: '2fa', label: '2FA Security', icon: FiShield },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="max-w-2xl mx-auto space-y-6 pb-8"
    >
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-[#102542]">Account Settings</h2>
        <p className="text-xs text-[#102542]/60 font-medium mt-1">Manage your profile, security and authentication settings.</p>
      </div>

      {/* Avatar Card */}
      <div className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-3xl gradient-navy text-[#D4AF37] flex items-center justify-center text-xl font-extrabold shrink-0 shadow-glow-navy">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-extrabold text-[#102542] truncate">{user?.full_name}</h3>
          <p className="text-xs text-[#102542]/60 font-medium truncate">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
              user?.is_email_verified ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'
            }`}>
              {user?.is_email_verified ? <FiCheckCircle className="w-3 h-3" /> : <FiAlertTriangle className="w-3 h-3" />}
              {user?.is_email_verified ? 'Email Verified' : 'Email Unverified'}
            </span>
            <span className="text-[10px] font-extrabold uppercase text-[#D4AF37] px-2.5 py-0.5 rounded-full bg-[#D4AF37]/10">
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl border border-[#102542]/8 shadow-soft p-1.5 flex gap-1.5">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 ${
              section === tab.id
                ? 'gradient-navy text-[#D4AF37] shadow-glow-navy'
                : 'text-[#102542]/60 hover:text-[#102542] hover:bg-[#F8F4E8]'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:block">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Profile Section */}
      {section === 'profile' && (
        <div className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft overflow-hidden">
          <div className="h-1.5 gradient-gold" />
          <div className="p-6 sm:p-8">
            <h4 className="text-sm font-extrabold text-[#102542] mb-5">Personal Information</h4>
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              {[
                { label: 'Full Name', key: 'full_name', type: 'text', icon: FiUser, placeholder: 'Your full name' },
                { label: 'Email Address', key: 'email', type: 'email', icon: FiMail, placeholder: 'you@example.com' },
                { label: 'Phone Number', key: 'phone', type: 'tel', icon: FiShield, placeholder: '+1 555 000 0000' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[10px] font-bold text-[#102542]/70 uppercase tracking-widest mb-1.5">{f.label}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <f.icon className="w-4 h-4 text-[#102542]/40" />
                    </div>
                    <input
                      type={f.type}
                      value={profile[f.key]}
                      onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full pl-11 pr-4 py-3.5 bg-[#F8F4E8] border border-[#102542]/12 rounded-2xl text-sm text-[#102542] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 transition-all font-medium"
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
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Password Section */}
      {section === 'security' && (
        <div className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft overflow-hidden">
          <div className="h-1.5 gradient-gold" />
          <div className="p-6 sm:p-8">
            <h4 className="text-sm font-extrabold text-[#102542] mb-5">Change Password</h4>
            <form onSubmit={handleChangePassword} className="space-y-5">
              {[
                { label: 'Current Password', key: 'current', placeholder: '••••••••' },
                { label: 'New Password', key: 'new_', placeholder: 'Min 6 characters' },
                { label: 'Confirm New Password', key: 'confirm', placeholder: 'Re-enter new password' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[10px] font-bold text-[#102542]/70 uppercase tracking-widest mb-1.5">{f.label}</label>
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
                disabled={savingPw}
                className="w-full py-3.5 rounded-2xl gradient-navy text-[#F8F4E8] font-extrabold text-sm hover:shadow-glow-navy transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {savingPw ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiLock className="w-4 h-4" />}
                {savingPw ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2FA Section */}
      {section === '2fa' && (
        <div className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft overflow-hidden">
          <div className="h-1.5 gradient-gold" />
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center shrink-0">
                <FiShield className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#102542]">Two-Factor Authentication</h4>
                <p className="text-xs text-[#102542]/60 font-medium">TOTP-based authentication via Google Authenticator or Authy.</p>
              </div>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-2xl border ${
              user?.is_2fa_enabled ? 'bg-[#16A34A]/5 border-[#16A34A]/20' : 'bg-[#F59E0B]/5 border-[#F59E0B]/20'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-3 h-3 rounded-full ${user?.is_2fa_enabled ? 'bg-[#16A34A]' : 'bg-[#F59E0B]'}`} />
                <p className="text-xs font-bold text-[#102542]">
                  2FA is currently <strong className={user?.is_2fa_enabled ? 'text-[#16A34A]' : 'text-[#F59E0B]'}>
                    {user?.is_2fa_enabled ? 'ENABLED' : 'DISABLED'}
                  </strong>
                </p>
              </div>
              {user?.is_2fa_enabled && <FiCheckCircle className="w-5 h-5 text-[#16A34A]" />}
            </div>

            <div className="bg-[#F8F4E8] rounded-2xl p-4 border border-[#102542]/8 text-xs text-[#102542]/70 leading-relaxed font-medium space-y-2">
              <p className="font-extrabold text-[#102542] text-xs">Setup Instructions:</p>
              <ol className="space-y-1.5 list-decimal list-inside">
                <li>Download Google Authenticator or Authy on your mobile device.</li>
                <li>Visit your KashWave 2FA setup page and scan the QR code shown.</li>
                <li>Enter the 6-digit TOTP code to confirm activation.</li>
                <li>Store your backup recovery codes in a secure location.</li>
              </ol>
            </div>

            <button
              onClick={() => showSuccess('Navigate to /dashboard/2fa for full 2FA setup.')}
              className="w-full py-3.5 rounded-2xl gradient-navy text-[#F8F4E8] font-extrabold text-sm hover:shadow-glow-navy transition-all flex items-center justify-center gap-2"
            >
              <FiShield className="w-4 h-4 text-[#D4AF37]" />
              {user?.is_2fa_enabled ? 'Manage 2FA Settings' : 'Enable 2FA Now'}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ProfilePage;
