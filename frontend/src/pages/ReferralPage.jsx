import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { formatUGX, RULES } from '../utils/currency';
import api from '../services/api';
import {
  FiGift, FiCopy, FiCheckCircle, FiUsers, FiDollarSign,
  FiShare2, FiTrendingUp, FiAward, FiSmile, FiUserPlus
} from 'react-icons/fi';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.09, ease: 'easeOut' } })
};

const ReferralPage = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);

  const referralCode = user?.referral_code || `KW-${(user?.id || '').toString().padStart(5, '0')}`;
  const referralLink = `${window.location.origin}/?ref=${referralCode}`;

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const res = await api.get('/auth/referrals');
        if (res.data.success) {
          const data = res.data.data || [];
          setReferrals(data);
          const total = data.reduce((sum, r) => sum + (parseFloat(r.earned_amount) || 0), 0);
          setTotalEarned(total);
        }
      } catch (err) {
        console.error('Failed to fetch referrals:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReferrals();
    const interval = setInterval(fetchReferrals, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const levels = [
    { level: 'Level 1', rate: `${RULES.REFERRAL_L1}%`, label: 'Direct Referrals', desc: 'Earn 4% on every deposit from members you personally invite.', color: 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' },
    { level: 'Level 2', rate: `${RULES.REFERRAL_L2}%`, label: 'Indirect (2nd Gen)', desc: 'Earn 3% when your Level 1 referrals invite new investors.', color: 'border-[#102542] bg-[#102542]/10 text-[#102542]' },
    { level: 'Level 3', rate: `${RULES.REFERRAL_L3}%`, label: 'Indirect (3rd Gen)', desc: 'Earn 2% when your Level 2 referrals invite new investors.', color: 'border-[#16A34A] bg-[#16A34A]/10 text-[#16A34A]' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="max-w-3xl mx-auto space-y-8 pb-8"
    >
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-[#102542]">3-Level Referral Program</h2>
        <p className="text-xs text-[#102542]/60 font-medium mt-1">
          Earn multi-tier commissions (Level 1: 4% · Level 2: 3% · Level 3: 2%) plus a {formatUGX(RULES.WELCOME_BONUS)} welcome bonus.
        </p>
      </div>

      {/* Welcome Bonus Highlight */}
      <div className="flex items-center justify-between p-5 bg-[#16A34A]/10 border border-[#16A34A]/30 rounded-3xl text-[#102542]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#16A34A] text-white flex items-center justify-center font-extrabold">
            <FiSmile className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-[#16A34A]">Total Referral Earnings</p>
            <p className="text-[11px] text-[#102542]/70 font-medium">You've earned <strong>{formatUGX(totalEarned)}</strong> from your network deposits.</p>
          </div>
        </div>
        <span className="text-sm font-extrabold text-[#16A34A] px-3.5 py-1.5 bg-white rounded-xl border border-[#16A34A]/20">
          {formatUGX(totalEarned)}
        </span>
      </div>

      {/* Hero Invite Card */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="bg-[#102542] rounded-4xl p-8 sm:p-10 text-[#F8F4E8] relative overflow-hidden shadow-soft-lg"
      >
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#D4AF37]/10 rounded-full blur-2xl" />
        <div className="relative z-10 space-y-5">
          <div className="w-12 h-12 rounded-2xl gradient-gold flex items-center justify-center shadow-glow-gold">
            <FiGift className="w-6 h-6 text-[#102542]" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white">Invite Investors & Build Your Network</h3>
            <p className="text-xs text-[#F8F4E8]/60 font-medium mt-1 leading-relaxed">
              Share your referral link. Every deposit made by your network earns you instant UGX commissions across 3 generations.
            </p>
          </div>

          {/* Referral Code Box */}
          <div className="bg-white/10 border border-white/15 rounded-2xl p-4 space-y-2">
            <p className="text-[9px] text-[#F8F4E8]/50 font-extrabold uppercase tracking-widest">Your Referral Link</p>
            <div className="flex items-center gap-2">
              <p className="flex-1 font-mono text-[11px] text-[#D4AF37] font-bold truncate">{referralLink}</p>
              <button
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D4AF37] text-[#102542] text-[10px] font-extrabold hover:scale-105 transition-all"
              >
                {copied ? <FiCheckCircle className="w-3.5 h-3.5" /> : <FiCopy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Referral Code Only */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white/10 rounded-xl px-4 py-2.5 border border-white/10">
              <p className="text-[9px] text-[#F8F4E8]/50 font-bold uppercase tracking-widest">Referral Code</p>
              <p className="text-sm font-extrabold text-[#D4AF37] mt-0.5">{referralCode}</p>
            </div>
            <button className="p-3 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all" title="Share">
              <FiShare2 className="w-5 h-5 text-[#D4AF37]" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* 3-Level Commission Breakdown Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-extrabold text-[#102542]">3-Tier Referral Structure</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {levels.map((lvl, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={i}
              className={`bg-white rounded-3xl p-6 border shadow-soft space-y-3 relative overflow-hidden`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#102542]/50">{lvl.level}</span>
                <span className={`text-xl font-extrabold px-3 py-1 rounded-xl border ${lvl.color}`}>
                  {lvl.rate}
                </span>
              </div>
              <h4 className="text-xs font-extrabold text-[#102542]">{lvl.label}</h4>
              <p className="text-[11px] text-[#102542]/60 font-medium leading-relaxed">{lvl.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Referred Users List */}
      <div className="space-y-4">
        <h3 className="text-sm font-extrabold text-[#102542]">Your Referrals ({referrals.length})</h3>
        {loading ? (
          <div className="text-center py-8 text-[#102542]/50 text-sm">Loading referrals...</div>
        ) : referrals.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#102542]/8 p-8 text-center">
            <FiUserPlus className="w-12 h-12 text-[#102542]/20 mx-auto mb-3" />
            <p className="text-sm text-[#102542]/60 font-medium">No referrals yet. Share your link to start earning!</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#102542]/8 overflow-hidden">
            <div className="divide-y divide-[#102542]/8">
              {referrals.map((ref, i) => (
                <motion.div
                  key={ref.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 hover:bg-[#F8F4E8]/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#102542]/10 text-[#102542] flex items-center justify-center font-extrabold text-xs">
                      {ref.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-[#102542]">{ref.full_name || 'User'}</p>
                      <p className="text-[10px] text-[#102542]/50 font-medium">{ref.email || ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#102542]/40">Level {ref.level}</p>
                    <p className="text-xs font-extrabold text-[#D4AF37]">{ref.commission_rate}%</p>
                    {ref.earned_amount > 0 && (
                      <p className="text-[10px] font-bold text-[#16A34A]">+{formatUGX(ref.earned_amount)}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Program Terms */}
      <div className="bg-[#F8F4E8] rounded-2xl border border-[#102542]/8 p-5 text-xs text-[#102542]/70 font-medium leading-relaxed space-y-1.5">
        <p className="font-extrabold text-[#102542] text-xs">KashWave Referral Terms:</p>
        <p>• Level 1: 4% commission on direct referral deposits.</p>
        <p>• Level 2: 3% commission on 2nd-generation referral deposits.</p>
        <p>• Level 3: 2% commission on 3rd-generation referral deposits.</p>
        <p>• Welcome Bonus: {formatUGX(RULES.WELCOME_BONUS)} credited upon registration.</p>
        <p>• Referral Bonus: {formatUGX(RULES.REFERRAL_BONUS || 200)} credited to referrer when referee logs in for the first time.</p>
        <p>• All referral earnings are deposited directly into your available UGX main balance and can be withdrawn on Fridays.</p>
      </div>
    </motion.div>
  );
};

export default ReferralPage;
