import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { formatCurrency, RULES } from '../utils/currency';
import {
  FiArrowDownLeft, FiCopy, FiCheckCircle, FiInfo,
  FiSmartphone, FiCreditCard, FiGlobe
} from 'react-icons/fi';

const PAYMENT_METHODS = [
  { id: 'MTN Mobile Money', label: 'MTN Mobile Money', type: 'marz_innovations', method: 'mtn', icon: FiSmartphone, badge: 'Popular in UG', accent: '#FFCC00', desc: 'Deposit via Marz Innovations - MTN', inputLabel: 'Phone Number', inputPlaceholder: 'e.g. 0770XXXXXX or 0700XXXXXX', inputType: 'tel' },
  { id: 'Airtel Money',     label: 'Airtel Money',     type: 'marz_innovations', method: 'airtel', icon: FiSmartphone, badge: 'Instant Payout', accent: '#E8002D', desc: 'Deposit via Marz Innovations - Airtel', inputLabel: 'Phone Number', inputPlaceholder: 'e.g. 0770XXXXXX or 0700XXXXXX', inputType: 'tel' },
  { id: 'M-Pesa',          label: 'M-Pesa',           type: 'marz_innovations', method: 'mpesa', icon: FiSmartphone, badge: 'Kenya', accent: '#4CAF50', desc: 'Deposit via Marz Innovations - M-Pesa', inputLabel: 'Phone Number', inputPlaceholder: 'e.g. 07XXXXXXXX', inputType: 'tel' },
  { id: 'Visa Card',        label: 'Visa Card',        type: 'card', icon: FiCreditCard, badge: 'International', accent: '#1A1F71', desc: 'Debit / Credit card checkout', inputLabel: 'Card Number', inputPlaceholder: 'e.g. 4111XXXXXXXXXX', inputType: 'text' },
  { id: 'MasterCard',       label: 'MasterCard',       type: 'card', icon: FiCreditCard, badge: 'International', accent: '#EB001B', desc: 'Debit / Credit card checkout', inputLabel: 'Card Number', inputPlaceholder: 'e.g. 5555XXXXXXXXXX', inputType: 'text' }
];

const DepositPage = () => {
  const [amount, setAmount]                 = useState('50000');
  const [sourceAccount, setSourceAccount]   = useState('');
  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHODS[0]);
  const [isProcessing, setIsProcessing]     = useState(false);

  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();

  const numAmount = parseFloat(amount || 0);
  const minAllowed = RULES.MIN_INVEST;
  const isValidAmount = numAmount >= minAllowed;

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!isValidAmount) {
      return showError(`Minimum deposit amount is ${formatCurrency(minAllowed)}.`);
    }
    if (!sourceAccount || sourceAccount.length < 6) {
      return showError(`Please enter a valid ${selectedMethod.inputLabel}.`);
    }

    setIsProcessing(true);
    try {
      const generatedRef = `PAY_${selectedMethod.method.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      const res = await api.post('/transactions/deposit', {
        amount: numAmount,
        payment_method: selectedMethod.label,
        payment_provider: selectedMethod.type,
        method: selectedMethod.method,
        proof_reference: generatedRef,
        source_account: sourceAccount
      });

      if (res.data.success) {
        showSuccess(`Payment request sent to ${sourceAccount}. Please confirm on your phone.`);
        await pollPaymentStatus(res.data.data.transaction?.id, res.data.data.transaction?.reference_code);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Deposit failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const pollPaymentStatus = async (txId, referenceCode) => {
    const maxAttempts = 120;
    const intervalMs = 3000;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const txRes = await api.get('/transactions');
        if (txRes.data.success) {
          const tx = txRes.data.data.find(t => t.id === txId || t.reference_code === referenceCode);
          if (tx && tx.status !== 'pending') {
            if (tx.status === 'completed' || tx.status === 'approved') {
              showSuccess(`Payment of ${formatCurrency(tx.amount)} confirmed! Your wallet has been updated.`);
            } else {
              showError(`Payment ${tx.status}. Please try again or contact support.`);
            }
            navigate('/dashboard/transactions');
            return;
          }
        }
      } catch (err) {
        console.error('[Deposit] Polling error:', err);
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }
    showError('Payment confirmation timeout. Please check your transactions later.');
    navigate('/dashboard/transactions');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="max-w-3xl mx-auto space-y-7 pb-8"
    >
      <div>
        <h2 className="text-2xl font-extrabold text-[#102542]">Deposit Funds</h2>
        <p className="text-xs text-[#102542]/60 font-medium mt-1">
          Select a payment gateway, enter your phone/bank/card details, and deposit to your KashWave wallet.
        </p>
      </div>

      <div className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft overflow-hidden">
        <div className="h-1.5 gradient-gold" />
        <div className="p-6 sm:p-9 space-y-7">
          <form onSubmit={handleDeposit} className="space-y-7">
            {/* 1. Enter Deposit Amount */}
            <div>
              <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-2 flex items-center gap-1.5 font-mono">
                <span className="w-5 h-5 rounded-full bg-[#102542] text-[#D4AF37] flex items-center justify-center text-[10px]">1</span>
                Enter Deposit Amount (UGX)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none font-extrabold text-sm text-[#102542]/50">
                  UGX
                </div>
                <input
                  type="number"
                  required
                  min={minAllowed}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full pl-16 pr-4 py-4 bg-[#F8F4E8] border border-[#102542]/12 rounded-2xl text-xl font-extrabold text-[#102542] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 transition-all"
                />
              </div>
              <div className="flex justify-between items-center text-[10px] mt-2">
                <span className={isValidAmount ? 'text-[#102542]/50 font-medium' : 'text-[#DC2626] font-extrabold'}>
                  Minimum required deposit: {formatCurrency(minAllowed)}
                </span>
                <span className="text-[#102542]/50">Zero deposit fees</span>
              </div>

              <div className="flex gap-2 flex-wrap mt-3">
                {[10000, 20000, 50000, 100000, 300000, 500000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(String(val))}
                    className={`px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold transition-all border ${
                      amount === String(val)
                        ? 'gradient-navy text-[#D4AF37] border-transparent'
                        : 'border-[#102542]/12 text-[#102542]/60 hover:border-[#D4AF37]'
                    }`}
                  >
                    {formatCurrency(val)}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Select Payment Gateway */}
            <div>
              <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-3 flex items-center gap-1.5 font-mono">
                <span className="w-5 h-5 rounded-full bg-[#102542] text-[#D4AF37] flex items-center justify-center text-[10px]">2</span>
                Select Payment Gateway
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  const isSelected = selectedMethod.id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethod(m)}
                      className={`p-4 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden ${
                        isSelected
                          ? 'bg-[#102542] border-[#102542] shadow-glow-navy scale-[1.02]'
                          : 'bg-[#F8F4E8] border-[#102542]/10 hover:border-[#102542]/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/10 text-[#D4AF37]' : 'bg-[#102542]/10 text-[#102542]'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full ${isSelected ? 'bg-[#D4AF37] text-[#102542]' : 'bg-[#102542]/8 text-[#102542]/60'}`}>
                          {m.badge}
                        </span>
                      </div>
                      <p className={`text-xs font-extrabold ${isSelected ? 'text-white' : 'text-[#102542]'}`}>{m.label}</p>
                      <p className={`text-[10px] font-medium mt-0.5 ${isSelected ? 'text-white/60' : 'text-[#102542]/50'}`}>{m.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Source Account */}
            <div>
              <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-2 flex items-center gap-1.5 font-mono">
                <span className="w-5 h-5 rounded-full bg-[#102542] text-[#D4AF37] flex items-center justify-center text-[10px]">3</span>
                {selectedMethod.inputLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  {selectedMethod.type === 'mobile' ? (
                    <FiSmartphone className="w-5 h-5 text-[#102542]/40" />
                  ) : selectedMethod.type === 'bank' ? (
                    <FiGlobe className="w-5 h-5 text-[#102542]/40" />
                  ) : (
                    <FiCreditCard className="w-5 h-5 text-[#102542]/40" />
                  )}
                </div>
                <input
                  type={selectedMethod.inputType}
                  required
                  value={sourceAccount}
                  onChange={e => setSourceAccount(e.target.value)}
                  placeholder={selectedMethod.inputPlaceholder}
                  className="w-full pl-12 pr-4 py-4 bg-[#F8F4E8] border border-[#102542]/12 rounded-2xl text-xl font-extrabold text-[#102542] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 transition-all"
                />
              </div>
              <p className="text-[10px] text-[#102542]/50 mt-1.5 font-medium">
                {selectedMethod.type === 'mobile' ? 'Enter the phone number registered with your mobile money account' : selectedMethod.type === 'bank' ? 'Enter your bank account number for the transfer' : 'Enter your card number for verification'}
              </p>
            </div>

            {/* Deposit Now Button */}
            <button
              type="submit"
              disabled={isProcessing || !isValidAmount}
              className="w-full py-4 rounded-2xl gradient-navy text-[#F8F4E8] font-extrabold text-sm hover:shadow-glow-navy hover:scale-[1.01] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Waiting for confirmation...
                </span>
              ) : (
                <>Deposit Now <FiArrowDownLeft className="w-5 h-5 text-[#D4AF37]" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

export default DepositPage;
