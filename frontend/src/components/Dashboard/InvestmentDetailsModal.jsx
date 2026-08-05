import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../services/api';
import { formatCurrency, RULES } from '../../utils/currency';
import {
  FiX, FiCheckCircle, FiArrowRight, FiLock, FiCalendar,
  FiTrendingUp, FiShield
} from 'react-icons/fi';

const InvestmentDetailsModal = ({ plan, isOpen, onClose, onSuccess }) => {
  const { wallet, refreshProfile } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [inputAmount, setInputAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Set selected plan fixed amount when plan changes
  useEffect(() => {
    if (plan) {
      setInputAmount(String(plan.amount));
    }
  }, [plan]);

  if (!isOpen || !plan) return null;

  const numInput = parseFloat(inputAmount || 0);

  // Min validation based on fixed plan amount
  const minAllowed = plan.amount;
  const isValidAmount = numInput >= minAllowed;

  // Expected Calculations (5% daily for 60 weekdays)
  const dailyROI = numInput * 0.05;
  const totalProfit = dailyROI * 60;
  const totalReturn = numInput + totalProfit;

  // Wallet balance check
  const walletUGX = parseFloat(wallet?.main_balance || 0);
  const canAfford = walletUGX >= numInput;

  const handleProceed = async (e) => {
    e.preventDefault();
    if (!isValidAmount) {
      return showError(`Minimum investment for ${plan.title} is ${formatCurrency(minAllowed)}.`);
    }
    if (!canAfford) {
      return showError(`Insufficient balance. You need ${formatCurrency(numInput)}.`);
    }

    setSubmitting(true);
    try {
      const res = await api.post('/investments/invest', {
        plan_id: plan.id,
        amount: numInput
      });

      if (res.data.success) {
        showSuccess(res.data.message || `Successfully active saving tier ${plan.title}!`);
        await refreshProfile();
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Investment activation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#102542]/75 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white rounded-4xl max-w-xl w-full border border-[#102542]/10 shadow-soft-lg overflow-hidden relative my-8"
        >
          {/* Header Bar */}
          <div className={`bg-gradient-to-br ${plan.color || 'from-[#102542] to-[#1E3A5F]'} p-6 sm:p-7 text-white relative`}>
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>

            <span className="text-[9px] font-extrabold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full inline-block mb-2">
              {plan.badge || 'Investment Plan Details'}
            </span>
            <h3 className="text-2xl font-extrabold text-white">{plan.title}</h3>
            <p className="text-xs text-white/80 font-medium mt-1">
              Required Capital: <strong className="text-[#D4AF37]">{formatCurrency(minAllowed)}</strong>
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">

            {/* 1. Base Currency Indicator (Exclusive UGX) */}
            <div className="bg-[#F8F4E8] rounded-2xl p-4 border border-[#102542]/10">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[#102542]/70">Account Balance:</span>
                <strong className="text-[#102542]">{formatCurrency(walletUGX)}</strong>
              </div>
            </div>

            {/* 2. Amount Input */}
            <div>
              <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-1.5 font-mono">
                Saving Lock Amount (UGX)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-16 flex items-center pointer-events-none font-extrabold text-xs text-[#102542]/40 bg-[#102542]/5 rounded-l-2xl px-3 border-r border-[#102542]/10">
                  UGX
                </div>
                <input
                  type="number"
                  required
                  readOnly
                  value={inputAmount}
                  className="w-full pl-28 pr-4 py-3.5 bg-[#F8F4E8]/50 border border-[#102542]/12 rounded-2xl text-lg font-extrabold text-[#102542]/60 focus:outline-none cursor-not-allowed"
                />
              </div>
              <div className="flex justify-between items-center text-[10px] mt-1.5">
                <span className={isValidAmount ? 'text-[#102542]/50 font-medium' : 'text-[#DC2626] font-extrabold'}>
                  Fixed Tier Capital: {formatCurrency(minAllowed)}
                </span>
                <span className="text-[#102542]/50">Flexible amounts not allowed in default saving locks</span>
              </div>
            </div>

            {/* 3. Expected Returns Calculator Table */}
            <div className="bg-[#102542] rounded-3xl p-5 text-[#F8F4E8] space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#D4AF37]">Profit Return Matrix</span>
                <span className="text-[10px] font-extrabold bg-[#16A34A]/25 text-[#16A34A] px-2.5 py-0.5 rounded-full">5% Daily</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center pt-1">
                <div>
                  <p className="text-[9px] text-[#F8F4E8]/60 uppercase font-bold">Daily Profit</p>
                  <p className="text-sm font-extrabold text-[#16A34A] mt-0.5">{formatCurrency(dailyROI)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[#F8F4E8]/60 uppercase font-bold">Signing Bonus</p>
                  <p className="text-sm font-extrabold text-[#6366F1] mt-0.5">{formatCurrency(plan.bonus)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[#F8F4E8]/60 uppercase font-bold">Salary Bonus</p>
                  <p className="text-sm font-extrabold text-[#D4AF37] mt-0.5">{formatCurrency(plan.salary)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center border-t border-white/5 pt-2 font-mono">
                <div>
                  <p className="text-[9px] text-[#F8F4E8]/60 uppercase font-bold">AUM Net Yield</p>
                  <p className="text-sm font-extrabold text-white/90 mt-0.5">{formatCurrency(totalProfit)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[#F8F4E8]/60 uppercase font-bold">Gross Payout</p>
                  <p className="text-sm font-extrabold text-white mt-0.5">{formatCurrency(totalReturn)}</p>
                </div>
              </div>
            </div>

            {/* 4. Plan Benefits Checklist */}
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest">Plan Rules & Features</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-[#102542]/80">
                <div className="flex items-center gap-2 bg-[#F8F4E8] p-2.5 rounded-xl border border-[#102542]/6">
                  <FiCheckCircle className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span>Monday-Friday yields only</span>
                </div>
                <div className="flex items-center gap-2 bg-[#F8F4E8] p-2.5 rounded-xl border border-[#102542]/6">
                  <FiCheckCircle className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span>Welcome Bonus ({formatCurrency(plan.bonus)})</span>
                </div>
                <div className="flex items-center gap-2 bg-[#F8F4E8] p-2.5 rounded-xl border border-[#102542]/6">
                  <FiCheckCircle className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span>Referral Salary ({formatCurrency(plan.salary)})</span>
                </div>
                <div className="flex items-center gap-2 bg-[#F8F4E8] p-2.5 rounded-xl border border-[#102542]/6">
                  <FiCalendar className="w-4 h-4 text-[#102542] shrink-0" />
                  <span>60 Days Lock Duration</span>
                </div>
              </div>
            </div>

            {/* 5. Business Rules Notice */}
            <div className="flex items-start gap-2.5 p-3.5 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-2xl text-[11px] text-[#102542]/80 font-medium">
              <FiLock className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
              <div>
                <strong>Capital Lock Protection:</strong> Capital is locked inside current saving tier, accrued Mon-Fri interest can be claimed via Fridays queue.
              </div>
            </div>

            {/* 6. Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="py-3.5 rounded-2xl bg-[#F8F4E8] border border-[#102542]/12 text-[#102542] font-extrabold text-xs hover:bg-[#ECE3CE] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleProceed}
                disabled={submitting || !isValidAmount || !canAfford}
                className="py-3.5 rounded-2xl gradient-gold text-[#102542] font-extrabold text-xs shadow-glow-gold hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-[#102542]/30 border-t-[#102542] rounded-full animate-spin" />
                ) : (
                  <>Lock Capital <FiArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default InvestmentDetailsModal;
