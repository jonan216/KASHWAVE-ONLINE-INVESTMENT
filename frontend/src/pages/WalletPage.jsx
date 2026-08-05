import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { formatUGX, RULES } from '../utils/currency';
import {
  FiDollarSign, FiTrendingUp, FiArrowDownLeft, FiArrowUpRight,
  FiBriefcase, FiCheckCircle, FiActivity, FiLock, FiCalendar
} from 'react-icons/fi';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.08, ease: 'easeOut' } })
};

const WalletPage = () => {
  const { wallet } = useAuth();

  const mainBalance    = parseFloat(wallet?.main_balance    || 0);
  const investBalance  = parseFloat(wallet?.investment_balance || 0);
  const totalEarnings  = parseFloat(wallet?.total_earnings  || 0);
  const totalWithdrawn = parseFloat(wallet?.total_withdrawn || 0);
  const totalAssets    = mainBalance + investBalance;

  const walletCards = [
    {
      label: 'Available Balance',
      value: mainBalance,
      icon: FiDollarSign,
      color: 'bg-[#D4AF37]/15 text-[#D4AF37]',
      desc: 'Ready for withdrawal or investing',
    },
    {
      label: 'Locked Capital',
      value: investBalance,
      icon: FiLock,
      color: 'bg-[#102542]/10 text-[#102542]',
      desc: 'Capital locked for 60-day plan',
    },
    {
      label: 'Total Profits (5%/day)',
      value: totalEarnings,
      icon: FiTrendingUp,
      color: 'bg-[#16A34A]/10 text-[#16A34A]',
      desc: 'Mon–Fri automated ROI returns',
    },
    {
      label: 'Total Withdrawn',
      value: totalWithdrawn,
      icon: FiArrowUpRight,
      color: 'bg-[#F59E0B]/10 text-[#F59E0B]',
      desc: 'Paid via Mobile Money',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-8 pb-8"
    >
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-[#102542]">My Wallet (UGX)</h2>
        <p className="text-xs text-[#102542]/60 font-medium mt-1">Full overview of your asset balances and Mobile Money transactions in Ugandan Shillings.</p>
      </div>

      {/* Total Assets Hero Card */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="bg-[#102542] rounded-4xl p-8 sm:p-10 text-[#F8F4E8] relative overflow-hidden shadow-soft-lg"
      >
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-[10px] text-[#F8F4E8]/60 uppercase tracking-widest font-extrabold">Total Portfolio Assets</p>
            <p className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              {formatUGX(totalAssets)}
            </p>
            <div className="flex items-center gap-2 mt-3 text-xs text-[#F8F4E8]/70 font-semibold">
              <FiCheckCircle className="w-4 h-4 text-[#16A34A]" />
              Mobile Money Wallet Verified (MTN / Airtel)
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link
              to="/dashboard/deposit"
              className="px-5 py-2.5 rounded-xl gradient-gold text-[#102542] font-extrabold text-xs shadow-glow-gold hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              <FiArrowDownLeft className="w-4 h-4" /> Deposit UGX
            </Link>
            <Link
              to="/dashboard/withdraw"
              className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-extrabold text-xs hover:bg-white/15 transition-all flex items-center gap-2"
            >
              <FiArrowUpRight className="w-4 h-4" /> Withdraw (Fridays)
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Business Rules Info Strip */}
      <div className="bg-white rounded-2xl border border-[#102542]/8 shadow-soft p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#102542]">
        <span className="flex items-center gap-2 font-medium">
          <FiCalendar className="w-4 h-4 text-[#D4AF37]" />
          Min Deposit: <strong>{formatUGX(RULES.MIN_INVEST)}</strong> · Min Withdraw: <strong>{formatUGX(RULES.MIN_WITHDRAW)}</strong>
        </span>
        <span className="flex items-center gap-2 font-medium">
          <FiLock className="w-4 h-4 text-[#102542]" />
          Capital Lock: <strong>60 Days</strong> · Earnings: <strong>Mon–Fri 5%/day</strong>
        </span>
      </div>

      {/* Balance Breakdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {walletCards.map((card, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={i}
            className="bg-white rounded-4xl p-6 border border-[#102542]/8 shadow-soft hover:shadow-soft-lg transition-all"
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-extrabold text-[#102542]/50 uppercase tracking-widest">{card.label}</p>
            <p className="text-xl font-extrabold text-[#102542] mt-1">{formatUGX(card.value)}</p>
            <p className="text-[10px] text-[#102542]/50 font-medium mt-1">{card.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft p-6">
        <h3 className="text-sm font-extrabold text-[#102542] mb-4 flex items-center gap-2">
          <FiActivity className="w-4 h-4 text-[#D4AF37]" /> Quick Wallet Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { to: '/dashboard/deposit',   icon: FiArrowDownLeft, label: 'Fund Account',   sub: 'MTN / Airtel Mobile Money', bg: 'gradient-gold text-[#102542] shadow-glow-gold' },
            { to: '/dashboard/withdraw',  icon: FiArrowUpRight,  label: 'Withdraw ROI',  sub: 'Processed on Fridays', bg: 'gradient-navy text-[#F8F4E8] shadow-glow-navy' },
            { to: '/dashboard/plans',     icon: FiTrendingUp,    label: 'Invest Now',    sub: '5% per day (60 Days)', bg: 'bg-[#16A34A] text-white' },
          ].map((btn, i) => (
            <Link
              key={i}
              to={btn.to}
              className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-extrabold text-xs hover:scale-[1.02] transition-all ${btn.bg}`}
            >
              <btn.icon className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-extrabold">{btn.label}</p>
                <p className="text-[10px] font-medium opacity-70">{btn.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default WalletPage;
