import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { formatCurrency, RULES } from '../utils/currency';
import {
  FiArrowUpRight, FiShield, FiAlertTriangle, FiInfo,
  FiCalendar, FiSmartphone, FiClock, FiLock, FiGlobe,
  FiCheckCircle, FiXCircle, FiFilter, FiList
} from 'react-icons/fi';

const isFriday = () => new Date().getDay() === 5;

const statusConfig = {
  pending:  { label: 'Pending',  style: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20', icon: FiClock },
  approved: { label: 'Approved', style: 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20', icon: FiCheckCircle },
  rejected: { label: 'Rejected', style: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20', icon: FiXCircle },
};

const WithdrawPage = () => {
  const { wallet, refreshProfile } = useAuth();
  const { showSuccess, showError }  = useNotification();
  const navigate = useNavigate();

  const [walletType, setWalletType]     = useState('momo'); // 'momo' | 'bank'
  const [momoProvider, setMomoProvider] = useState('MTN Mobile Money');
  const [amount, setAmount]             = useState('20000');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName]   = useState('');
  const [bankName, setBankName]         = useState('Stanbic Bank Uganda');
  const [submitting, setSubmitting]     = useState(false);

  // Withdrawal History State
  const [history, setHistory]           = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyFilter, setHistoryFilter]   = useState('all');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/transactions');
        if (res.data.success) {
          const withdrawalsOnly = res.data.data.filter(t => t.type === 'withdrawal');
          setHistory(withdrawalsOnly);
        }
      } catch (err) {
        console.error('Fetch history error:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);

  const availableUGX = parseFloat(wallet?.main_balance || 0);

  const numAmount = parseFloat(amount || 0);
  const minAllowed = RULES.MIN_WITHDRAW; // 10,000 UGX

  const friday = isFriday();

  // 1% dynamic withdrawal fee
  const withdrawFee = numAmount * 0.01;
  const netAmount = numAmount - withdrawFee;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!friday) return showError('Withdrawals are only processed on Fridays. Please return on Friday.');
    if (numAmount < minAllowed) return showError(`Minimum withdrawal is ${formatCurrency(minAllowed)}.`);
    if (numAmount > availableUGX) return showError(`Insufficient available balance.`);
    if (!accountNumber.trim()) return showError('Please enter your Mobile Money or Bank Account number.');

    setSubmitting(true);
    try {
      const destination = walletType === 'momo'
        ? `${momoProvider} | ${accountNumber} | ${accountName}`
        : `Bank Transfer (${bankName}) | Acc: ${accountNumber} | ${accountName}`;

      const res = await api.post('/transactions/withdraw', {
        amount: numAmount,
        payment_method: walletType === 'momo' ? momoProvider : 'Bank Transfer',
        wallet_address: destination
      });

      if (res.data.success) {
        showSuccess(res.data.message);
        await refreshProfile();
        // Refresh local history
        setHistory(prev => [res.data.data || {
          id: Date.now(),
          reference_code: `WD_${Math.random().toString(36).substring(2,8).toUpperCase()}`,
          amount: numAmount,
          payment_method: walletType === 'momo' ? momoProvider : 'Bank Transfer',
          status: 'pending',
          created_at: new Date().toISOString()
        }, ...prev]);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Withdrawal request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredHistory = history.filter(h => historyFilter === 'all' || h.status === historyFilter);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="max-w-4xl mx-auto space-y-8 pb-8"
    >
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-[#102542]">Withdrawal Hub</h2>
        <p className="text-xs text-[#102542]/60 font-medium mt-1">
          Withdraw your available savings & referral profits in Ugandan Shillings (UGX).
        </p>
      </div>

      {/* Friday Gate Status Banner */}
      <div className={`flex items-start gap-3 p-4 rounded-2xl border ${
        friday ? 'bg-[#16A34A]/10 border-[#16A34A]/30 text-[#16A34A]' : 'bg-[#DC2626]/8 border-[#DC2626]/25 text-[#DC2626]'
      }`}>
        <FiCalendar className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-xs font-medium leading-relaxed font-mono">
          {friday ? (
            <p className="font-extrabold">✅ Friday withdrawal window is open. Requests submitted today are queued for verification.</p>
          ) : (
            <p>
              <strong className="font-extrabold text-sm">Notice: Friday-only withdrawals enforced.</strong> Payout queue remains locked until Friday. You can prepare requests in advance.
            </p>
          )}
        </div>
      </div>

      {/* Balance Summary Card */}
      <div className="bg-[#102542] rounded-4xl p-7 text-[#F8F4E8] relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
        <div>
          <p className="text-[10px] text-[#F8F4E8]/60 uppercase font-extrabold tracking-widest">Available Balance for Payout</p>
          <p className="text-3xl font-extrabold text-white mt-1">
            {formatCurrency(availableUGX)}
          </p>
        </div>
        <div className="bg-white/10 rounded-2xl px-4 py-2 border border-white/10 text-right">
          <p className="text-[9px] text-[#F8F4E8]/60 uppercase font-bold">Standard Withdrawal Fee</p>
          <p className="text-sm font-extrabold text-[#D4AF37] mt-0.5">1.0% Dynamic Fee</p>
        </div>
      </div>

      {/* Main Withdrawal Form */}
      <div className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft overflow-hidden">
        <div className="h-1.5 gradient-gold" />
        <form onSubmit={handleSubmit} className="p-6 sm:p-9 space-y-6">

          {/* 1. Wallet Type Selector (Bank vs Mobile Money) */}
          <div>
            <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-3">
              Select Wallet Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setWalletType('momo')}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  walletType === 'momo'
                    ? 'bg-[#102542] text-white border-[#102542] shadow-glow-navy'
                    : 'bg-[#F8F4E8] text-[#102542] border-[#102542]/10'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${walletType === 'momo' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-[#102542]/10 text-[#102542]'}`}>
                  <FiSmartphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-extrabold">Mobile Money</p>
                  <p className={`text-[10px] ${walletType === 'momo' ? 'text-white/60' : 'text-[#102542]/50'}`}>MTN MoMo / Airtel Money</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setWalletType('bank')}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  walletType === 'bank'
                    ? 'bg-[#102542] text-white border-[#102542] shadow-glow-navy'
                    : 'bg-[#F8F4E8] text-[#102542] border-[#102542]/10'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${walletType === 'bank' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-[#102542]/10 text-[#102542]'}`}>
                  <FiGlobe className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-extrabold">Bank Account</p>
                  <p className={`text-[10px] ${walletType === 'bank' ? 'text-white/60' : 'text-[#102542]/50'}`}>Wire / Direct Transfer</p>
                </div>
              </button>
            </div>
          </div>

          {/* If Mobile Money provider picker */}
          {walletType === 'momo' && (
            <div>
              <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-2 font-mono">
                Mobile Money Provider
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['MTN Mobile Money', 'Airtel Money'].map(provider => (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => setMomoProvider(provider)}
                    className={`py-3 rounded-xl border text-xs font-extrabold transition-all ${
                      momoProvider === provider
                        ? 'gradient-navy text-[#D4AF37] border-transparent shadow-sm'
                        : 'bg-[#F8F4E8] text-[#102542]/70 border-[#102542]/10'
                    }`}
                  >
                    {provider}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* If Bank details */}
          {walletType === 'bank' && (
            <div>
              <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                placeholder="e.g. Stanbic Bank / Equity Bank"
                className="w-full px-4 py-3 bg-[#F8F4E8] border border-[#102542]/12 rounded-2xl text-xs font-semibold text-[#102542]"
              />
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-1.5 font-mono">
              Withdrawal Amount (UGX)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none font-extrabold text-sm text-[#102542]/50">
                UGX
              </div>
              <input
                type="number"
                required
                min={minAllowed}
                max={availableUGX}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full pl-14 pr-4 py-3.5 bg-[#F8F4E8] border border-[#102542]/12 rounded-2xl text-lg font-extrabold text-[#102542] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div className="flex justify-between items-center text-[10px] mt-2 bg-[#F8F4E8] p-3 rounded-xl border border-[#102542]/6 font-semibold">
              <span className="text-[#102542]/50">Min: {formatCurrency(minAllowed)}</span>
              <span className="text-[#102542]/70">
                Fee (1%): <strong className="text-[#DC2626]">{formatCurrency(withdrawFee)}</strong>
              </span>
              <span className="text-[#102542]/70">
                Net Payout: <strong className="text-[#16A34A]">{formatCurrency(netAmount)}</strong>
              </span>
            </div>
          </div>

          {/* Destination Number & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-1 font-mono">
                {walletType === 'momo' ? 'Mobile Money Number' : 'Bank Account Number'}
              </label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                placeholder={walletType === 'momo' ? 'e.g. 0770 123 456' : 'e.g. 0102 9384 100'}
                className="w-full px-4 py-3 bg-[#F8F4E8] border border-[#102542]/12 rounded-2xl text-xs font-mono text-[#102542]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-1">
                Account Registered Name
              </label>
              <input
                type="text"
                required
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                placeholder="Full name as registered"
                className="w-full px-4 py-3 bg-[#F8F4E8] border border-[#102542]/12 rounded-2xl text-xs font-medium text-[#102542]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || availableUGX < minAllowed}
            className="w-full py-4 rounded-2xl gradient-navy text-[#F8F4E8] font-extrabold text-sm hover:shadow-glow-navy hover:scale-[1.01] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><FiArrowUpRight className="w-5 h-5 text-[#D4AF37]" /> Submit Friday Queue Request</>
            )}
          </button>
        </form>
      </div>

      {/* ── WITHDRAWAL HISTORY SECTION ────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-[#102542]">Withdrawal History</h3>
            <p className="text-xs text-[#102542]/60 font-medium">Track your pending, approved, and processed payouts</p>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5 bg-white p-1 rounded-2xl border border-[#102542]/8 shadow-soft">
            {['all', 'pending', 'approved', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => setHistoryFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold capitalize transition-all ${
                  historyFilter === status
                    ? 'gradient-navy text-[#D4AF37]'
                    : 'text-[#102542]/60 hover:text-[#102542]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F8F4E8]">
                <tr className="text-[#102542]/50 uppercase tracking-widest font-extrabold text-[9px] font-mono">
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-4 py-4">Amount (UGX)</th>
                  <th className="px-4 py-4">Method / Destination</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#102542]/5">
                {filteredHistory.map((item) => {
                  const cfg = statusConfig[item.status] || statusConfig.pending;
                  const Icon = cfg.icon;
                  return (
                    <tr key={item.id} className="hover:bg-[#F8F4E8]/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-extrabold text-[#102542]/80 text-[11px]">
                        {item.reference_code}
                      </td>
                      <td className="px-4 py-4 font-extrabold text-[#16A34A] text-sm">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-4 py-4 text-[#102542]/70 font-medium font-mono text-[11px]">
                        {item.payment_method}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold border ${cfg.style}`}>
                          <Icon className="w-3 h-3" /> {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[#102542]/40 font-medium">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-[#102542]/40 text-xs font-medium">
                      No withdrawal records matching "{historyFilter}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default WithdrawPage;
