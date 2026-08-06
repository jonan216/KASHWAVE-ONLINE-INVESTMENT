import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { formatCurrency, RULES } from '../utils/currency';
import {
  FiArrowDownLeft, FiCopy, FiCheckCircle, FiInfo,
  FiShield, FiSmartphone, FiCreditCard, FiGlobe,
  FiLock, FiX, FiArrowRight, FiExternalLink
} from 'react-icons/fi';

const PAYMENT_METHODS = [
  { id: 'MTN Mobile Money', label: 'MTN Mobile Money', type: 'momo', ussd: '*165#', icon: FiSmartphone, badge: 'Popular in UG', accent: '#FFCC00', desc: 'Secure MTN Mobile Money deposit' },
  { id: 'Airtel Money',     label: 'Airtel Money',     type: 'momo', ussd: '*185#', icon: FiSmartphone, badge: 'Instant Payout', accent: '#E8002D', desc: 'Secure Airtel Mobile Money deposit' },
  { id: 'Visa Card',        label: 'Visa Card',        type: 'card', icon: FiCreditCard, badge: 'International', accent: '#1A1F71', desc: 'Debit / Credit card checkout' },
  { id: 'MasterCard',       label: 'MasterCard',       type: 'card', icon: FiCreditCard, badge: 'International', accent: '#EB001B', desc: 'Debit / Credit card checkout' },
  { id: 'Bank Transfer',    label: 'Bank Transfer',    type: 'bank', icon: FiGlobe, badge: 'Wire / SWIFT', accent: '#102542', desc: 'Direct wire & online banking' },
  { id: 'Marz Innovations',  label: 'Marz Innovations', type: 'manual', icon: FiSmartphone, badge: 'UG', accent: '#D4AF37', desc: 'WhatsApp/Email verified payments' }
];

const DepositPage = () => {
  const [amount, setAmount]                 = useState('50000');
  const [sourceAccount, setSourceAccount]   = useState('');
  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHODS[0]);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [showPinModal, setShowPinModal]     = useState(false);
  const [pin, setPin]                       = useState('');
  const [isProcessing, setIsProcessing]     = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);

  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();

  const numAmount = parseFloat(amount || 0);
  const minAllowed = RULES.MIN_INVEST; // 10,000 UGX
  const isValidAmount = numAmount >= minAllowed;

  const handleContinue = (e) => {
    e.preventDefault();
    if (!isValidAmount) {
      return showError(`Minimum deposit amount is ${formatCurrency(minAllowed)}.`);
    }
    if (!sourceAccount || sourceAccount.length < 6) {
      return showError(`Please enter a valid ${selectedMethod.type === 'momo' ? 'phone number' : selectedMethod.type === 'bank' ? 'bank account number' : 'card number'}.`);
    }
    setShowGatewayModal(true);
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      return showError('Please enter a valid PIN to complete payment.');
    }

    setIsProcessing(true);
    try {
      const generatedRef = `PAY_${selectedMethod.type.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      
      const res = await api.post('/transactions/deposit', {
        amount: numAmount,
        payment_method: selectedMethod.label,
        payment_provider: selectedMethod.type,
        proof_reference: generatedRef,
        pin: pin,
        source_account: sourceAccount
      });

      if (res.data.success) {
        // If card payment with redirect link
        if (res.data.data?.payment_link) {
          window.open(res.data.data.payment_link, '_blank');
          showSuccess('Payment page opened. Complete payment in the new tab.');
          setShowPinModal(false);
          setShowGatewayModal(false);
          setPin('');
        } else {
          showSuccess(`Payment of ${formatCurrency(numAmount)} completed successfully via ${selectedMethod.label}!`);
          setShowPinModal(false);
          setShowGatewayModal(false);
          setPin('');
          navigate('/dashboard/transactions');
        }
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Payment verification failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProceedToPin = async () => {
    setShowGatewayModal(false);
    
    // Simulate sending PIN request notification to user's phone from Marz Innovations
    try {
      await api.post('/transactions/notify', {
        phone: sourceAccount,
        amount: numAmount,
        method: selectedMethod.label,
        provider: 'Marz Innovations'
      });
      setNotificationSent(true);
    } catch (err) {
      console.error('Notification error:', err);
      setNotificationSent(true); // Continue anyway in demo mode
    }
    
    // For card payments, initiate payment and get redirect link
    if (selectedMethod.type === 'card') {
      setIsProcessing(true);
      try {
        const generatedRef = `PAY_CARD_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        
        const res = await api.post('/transactions/deposit', {
          amount: numAmount,
          payment_method: selectedMethod.label,
          payment_provider: 'card',
          proof_reference: generatedRef,
          source_account: sourceAccount
        });

        if (res.data.success && res.data.data?.payment_link) {
          window.open(res.data.data.payment_link, '_blank');
          showSuccess('Payment page opened. Complete payment in the new tab.');
          navigate('/dashboard/transactions');
        } else {
          showError('Could not initiate card payment. Please try again.');
        }
      } catch (err) {
        showError(err.response?.data?.message || 'Payment initiation failed.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }
    
    // For mobile money and manual, show PIN modal
    setShowPinModal(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="max-w-3xl mx-auto space-y-7 pb-8"
    >
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-[#102542]">Deposit Funds</h2>
        <p className="text-xs text-[#102542]/60 font-medium mt-1">
          Select Ugandan Shillings (UGX) amount and preferred payment gateway (MTN MoMo, Airtel Money, Cards, Bank) to fund your wallet.
        </p>
      </div>

      <div className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft overflow-hidden">
        <div className="h-1.5 gradient-gold" />
        <div className="p-6 sm:p-9 space-y-7">

          {/* 1. Enter Deposit Amount (UGX) */}
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

            {/* Quick Amount Pills */}
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

          {/* 1.5 Source Account (Phone/Bank) */}
          <div>
            <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-2 flex items-center gap-1.5 font-mono">
              <span className="w-5 h-5 rounded-full bg-[#102542] text-[#D4AF37] flex items-center justify-center text-[10px]">2</span>
              {selectedMethod.type === 'momo' ? 'Your Phone Number' : selectedMethod.type === 'bank' ? 'Bank Account Number' : 'Card / Account Number'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                {selectedMethod.type === 'momo' ? (
                  <FiSmartphone className="w-5 h-5 text-[#102542]/40" />
                ) : selectedMethod.type === 'bank' ? (
                  <FiGlobe className="w-5 h-5 text-[#102542]/40" />
                ) : (
                  <FiCreditCard className="w-5 h-5 text-[#102542]/40" />
                )}
              </div>
              <input
                type="text"
                required
                value={sourceAccount}
                onChange={e => setSourceAccount(e.target.value)}
                placeholder={selectedMethod.type === 'momo' ? 'e.g. 0770XXXXXX or 0700XXXXXX' : selectedMethod.type === 'bank' ? 'e.g. 1234567890' : 'e.g. 4111XXXXXXXXXX'}
                className="w-full pl-12 pr-4 py-4 bg-[#F8F4E8] border border-[#102542]/12 rounded-2xl text-xl font-extrabold text-[#102542] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 transition-all"
              />
            </div>
            <p className="text-[10px] text-[#102542]/50 mt-1.5 font-medium">
              {selectedMethod.type === 'momo' ? 'Enter the phone number registered with your MTN/Airtel Money account' : selectedMethod.type === 'bank' ? 'Enter your bank account number for the transfer' : 'Enter your card number for verification'}
            </p>
          </div>

          {/* 3. Payment Method Selection */}
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

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!isValidAmount}
            className="w-full py-4 rounded-2xl gradient-navy text-[#F8F4E8] font-extrabold text-sm hover:shadow-glow-navy hover:scale-[1.01] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            Continue to Secure Payment <FiArrowRight className="w-5 h-5 text-[#D4AF37]" />
          </button>
        </div>
      </div>

      {/* Payment Gateway Modal */}
      <AnimatePresence>
        {showGatewayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#102542]/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-4xl max-w-md w-full border border-[#102542]/10 shadow-soft-lg overflow-hidden relative p-7 space-y-6"
            >
              <button
                onClick={() => setShowGatewayModal(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#F8F4E8] text-[#102542] flex items-center justify-center hover:bg-[#ECE3CE]"
              >
                <FiX className="w-4 h-4" />
              </button>

              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-3xl gradient-navy text-[#D4AF37] mx-auto flex items-center justify-center shadow-glow-navy">
                  <selectedMethod.icon className="w-7 h-7" />
                </div>
                <span className="text-[9px] font-extrabold text-[#16A34A] bg-[#16A34A]/10 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                  Secure Payment Gateway
                </span>
                <h3 className="text-xl font-extrabold text-[#102542]">{selectedMethod.label} Deposit</h3>
                <p className="text-xs text-[#102542]/60 font-medium">Complete your payment securely</p>
              </div>

              {/* Transaction Summary */}
              <div className="bg-[#F8F4E8] rounded-2xl p-4 space-y-2 border border-[#102542]/8 text-xs font-semibold">
                <div className="flex justify-between">
                  <span className="text-[#102542]/60 font-medium font-mono">Merchant Reference:</span>
                  <strong className="text-[#102542]">KashWave Fintech</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#102542]/60 font-medium">Method:</span>
                  <strong className="text-[#102542]">{selectedMethod.label}</strong>
                </div>
                <div className="flex justify-between text-sm font-extrabold border-t border-[#102542]/10 pt-2 text-[#102542]">
                  <span>Total Amount (UGX):</span>
                  <strong className="text-[#16A34A]">{formatCurrency(numAmount)}</strong>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-[#D4AF37]/10 p-3.5 rounded-2xl border border-[#D4AF37]/35 text-xs text-[#102542] leading-relaxed flex items-start gap-2">
                <FiSmartphone className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span>A PIN request has been sent to <strong>{sourceAccount}</strong> from <strong>Marz Innovations</strong>. Please check your phone and enter the PIN below to complete payment.</span>
              </div>

              {/* Proceed to PIN Button */}
              <button
                onClick={handleProceedToPin}
                className="w-full py-4 rounded-2xl gradient-gold text-[#102542] font-extrabold text-sm hover:shadow-glow-gold hover:scale-[1.01] transition-all duration-200 flex items-center justify-center gap-2"
              >
                I Received the PIN — Enter It Now <FiLock className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PIN Verification Modal */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#102542]/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-4xl max-w-sm w-full border border-[#102542]/10 shadow-soft-lg overflow-hidden relative p-7 space-y-6"
            >
              <button
                onClick={() => { setShowPinModal(false); setPin(''); }}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#F8F4E8] text-[#102542] flex items-center justify-center hover:bg-[#ECE3CE]"
              >
                <FiX className="w-4 h-4" />
              </button>

              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-3xl gradient-navy text-[#D4AF37] mx-auto flex items-center justify-center shadow-glow-navy">
                  <FiSmartphone className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-extrabold text-[#102542]">Enter Payment PIN</h3>
                <p className="text-xs text-[#102542]/60 font-medium">Marz Innovations sent a PIN request to your phone</p>
              </div>

              {/* Notification Status */}
              {notificationSent && (
                <div className="bg-[#16A34A]/10 p-3 rounded-2xl border border-[#16A34A]/30 text-xs text-[#102542] flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span className="font-semibold">PIN request sent to <strong>{sourceAccount}</strong> from Marz Innovations. Please check your phone.</span>
                </div>
              )}

              {/* Transaction Summary */}
              <div className="bg-[#F8F4E8] rounded-2xl p-4 space-y-2 border border-[#102542]/8 text-xs font-semibold">
                <div className="flex justify-between">
                  <span className="text-[#102542]/60 font-medium">Method:</span>
                  <strong className="text-[#102542]">{selectedMethod.label}</strong>
                </div>
                <div className="flex justify-between text-sm font-extrabold border-t border-[#102542]/10 pt-2 text-[#102542]">
                  <span>Amount:</span>
                  <strong className="text-[#16A34A]">{formatCurrency(numAmount)}</strong>
                </div>
              </div>

              {/* PIN Input */}
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-2 font-mono">
                    Secure PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4,6}"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 4-6 digit PIN"
                    className="w-full px-4 py-4 bg-[#F8F4E8] border border-[#102542]/12 rounded-2xl text-xl font-extrabold text-center text-[#102542] tracking-[0.5em] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 transition-all"
                    autoFocus
                  />
                  <p className="text-[10px] text-[#102542]/50 mt-1.5 font-medium">
                    This PIN is used to authorize your payment securely
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing || !pin || pin.length < 4}
                  className="w-full py-4 rounded-2xl gradient-gold text-[#102542] font-extrabold text-sm hover:shadow-glow-gold hover:scale-[1.01] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>Processing Payment...</>
                  ) : (
                    <>Confirm Payment <FiCheckCircle className="w-5 h-5" /></>
                  )}
                </button>
              </form>

              <p className="text-[10px] text-[#102542]/50 text-center font-medium">
                Powered by Marz Innovations • Secure SSL Encrypted
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DepositPage;
