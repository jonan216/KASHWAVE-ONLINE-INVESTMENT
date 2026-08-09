import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import InvestmentDetailsModal from '../components/Dashboard/InvestmentDetailsModal';
import { KASHWAVE_PLANS, RULES, formatCurrency } from '../utils/currency';
import {
  FiTrendingUp, FiArrowRight, FiCheckCircle, FiCalendar,
  FiLock, FiStar, FiZap, FiAward
} from 'react-icons/fi';

const PlansPage = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isModalOpen, setIsModalOpen]   = useState(false);

  const { wallet } = useAuth();
  const balanceUGX = parseFloat(wallet?.main_balance || 0);

  const handleOpenDetails = (plan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-9 pb-8"
    >
      {/* Header with Balance Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-4xl p-6 sm:p-7 border border-[#102542]/8 shadow-soft">
        <div>
          <h2 className="text-2xl font-extrabold text-[#102542]">KashWave Saving Plans</h2>
          <p className="text-xs text-[#102542]/60 font-medium mt-1">
            Activate a locked saving tier, accrue <strong>5% daily ROI (Mon-Fri)</strong>, and unlock bonuses and salaries.
          </p>
        </div>

        <div className="bg-[#F8F4E8] rounded-2xl px-5 py-3 border border-[#102542]/10 text-right shrink-0">
          <p className="text-[10px] font-extrabold text-[#102542]/50 uppercase tracking-widest">Available Balance</p>
          <p className="text-xl font-extrabold text-[#102542] mt-0.5">
            {formatCurrency(balanceUGX)}
          </p>
        </div>
      </div>

      {/* Business Rules Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: FiTrendingUp, label: 'Daily Return',   val: '5.00% / Day',      color: 'text-[#16A34A]' },
          { icon: FiCalendar,   label: 'Earning Days',   val: 'Mon – Fri only',   color: 'text-[#102542]' },
          { icon: FiCalendar,   label: 'Withdrawals',    val: 'Fridays only',     color: 'text-[#D4AF37]' },
          { icon: FiLock,       label: 'Capital Lock',   val: '60 Days Fixed',    color: 'text-[#DC2626]' },
        ].map((r, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-[#102542]/8 shadow-soft flex items-start gap-3">
            <r.icon className={`w-4 h-4 shrink-0 mt-0.5 ${r.color}`} />
            <div>
              <p className="text-[9px] text-[#102542]/50 font-extrabold uppercase tracking-widest">{r.label}</p>
              <p className={`text-xs font-extrabold mt-0.5 ${r.color}`}>{r.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── KASHWAVE FIXED SAVING PLANS (Premium Card Deck Grid) ───────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-[#102542] flex items-center gap-2">
              <FiZap className="w-5 h-5 text-[#D4AF37]" /> Active Saving Tiers
            </h3>
            <p className="text-xs text-[#102542]/60 font-medium">Select a plan to view yield structure and lock details</p>
          </div>
          <span className="text-[10px] font-extrabold bg-[#16A34A]/10 text-[#16A34A] px-3 py-1 rounded-full uppercase">
            60-Day Capital Lock
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {KASHWAVE_PLANS.map((plan) => {
            return (
              <motion.div
                key={plan.id}
                whileHover={{ y: -6 }}
                className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft hover:shadow-soft-lg transition-all duration-300 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className={`bg-gradient-to-br ${plan.color} p-6 text-white`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full">
                        {plan.badge}
                      </span>
                      <FiStar className="w-4 h-4 text-white/60" />
                    </div>
                    <h4 className="text-xl font-extrabold">{plan.title}</h4>
                    <p className="text-2xl font-extrabold mt-2 text-white">{formatCurrency(plan.amount)}</p>
                    <p className="text-[10px] text-white/70 font-medium">Required Core Capital</p>
                  </div>

                  <div className="p-6 space-y-3.5">
                    <div className="flex justify-between items-center text-xs border-b border-[#102542]/8 pb-2">
                      <span className="text-[#102542]/60 font-semibold">Daily Return Rate</span>
                      <strong className="text-[#16A34A] font-extrabold">5.0% ({formatCurrency(plan.amountPerDay)}/day)</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs border-b border-[#102542]/8 pb-2">
                      <span className="text-[#102542]/60 font-semibold">Verification Period</span>
                      <strong className="text-[#102542] font-extrabold">{plan.durationDays} Days</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs border-b border-[#102542]/8 pb-2">
                      <span className="text-[#102542]/60 font-semibold">Gross Payout Return</span>
                      <strong className="text-[#D4AF37] font-extrabold">{formatCurrency(plan.grossPayout)}</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs border-b border-[#102542]/8 pb-2">
                      <span className="text-[#102542]/60 font-semibold">Total Profit</span>
                      <strong className="text-[#16A34A] font-extrabold">{formatCurrency(plan.totalProfit)}</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs border-b border-[#102542]/8 pb-2">
                      <span className="text-[#102542]/60 font-semibold">Sign Welcome Bonus</span>
                      <strong className="text-[#6366F1] font-extrabold">{formatCurrency(plan.bonus)}</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs border-b border-[#102542]/8 pb-2">
                      <span className="text-[#102542]/60 font-semibold">Referral Action Salary</span>
                      <strong className="text-[#102542] font-extrabold">{formatCurrency(plan.salary)}</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs pb-1">
                      <span className="text-[#102542]/60 font-semibold">AUM Net Yield</span>
                      <strong className="text-[#D4AF37] font-extrabold">{(plan.ratePerDay * plan.durationDays).toFixed(0)}%</strong>
                    </div>

                    <div className="pt-2">
                      <p className="text-[9px] font-extrabold text-[#102542]/50 uppercase tracking-widest mb-2 font-mono">Plan Conditions:</p>
                      <ul className="space-y-1.5 text-[11px] text-[#102542]/70 font-medium">
                        <li className="flex items-center gap-1.5">
                          <FiCheckCircle className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                          <span>Monday-Friday yield accruals only</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <FiCheckCircle className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                          <span>Capital completely locked for 60 Days</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <FiCheckCircle className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                          <span>Welcome & Referral Salaries auto-credited</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <button
                    onClick={() => handleOpenDetails(plan)}
                    className={`w-full py-3.5 rounded-2xl bg-gradient-to-r ${plan.color} text-white font-extrabold text-xs hover:scale-[1.02] transition-all shadow-md flex items-center justify-center gap-2`}
                  >
                    Invest Now <FiArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Modal for Investment Details */}
      <InvestmentDetailsModal
        plan={selectedPlan}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => setIsModalOpen(false)}
      />
    </motion.div>
  );
};

export default PlansPage;
