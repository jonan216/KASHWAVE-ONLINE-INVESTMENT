import React from 'react';
import { FiClock, FiTrendingUp, FiCheckCircle, FiArrowRight } from 'react-icons/fi';

const riskConfig = {
  low:    { bg: 'bg-[#16A34A]/10',  text: 'text-[#16A34A]',  label: 'Low Risk' },
  medium: { bg: 'bg-[#102542]/10',  text: 'text-[#102542]',  label: 'Moderate' },
  high:   { bg: 'bg-[#F59E0B]/10',  text: 'text-[#F59E0B]',  label: 'High Yield' },
  expert: { bg: 'bg-[#D4AF37]/15',  text: 'text-[#D4AF37]',  label: 'Expert Tier' },
};

const InvestmentCard = ({ plan, onSelectPlan }) => {
  const risk = riskConfig[plan.risk_level] || riskConfig.medium;

  return (
    <div className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft hover:shadow-soft-lg transition-all duration-300 hover:-translate-y-1.5 flex flex-col overflow-hidden group">
      {/* Card Top Accent Bar */}
      <div className="h-1.5 w-full gradient-gold" />

      <div className="p-6 flex flex-col flex-1">
        {/* Badges Row */}
        <div className="flex items-center justify-between gap-2 mb-5">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${risk.bg} ${risk.text}`}>
            {risk.label}
          </span>
          <span className="text-xs text-[#102542]/60 font-semibold flex items-center gap-1">
            <FiClock className="w-3.5 h-3.5 text-[#F59E0B]" /> {plan.duration_days} Days
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-extrabold text-[#102542] mb-1.5 group-hover:text-[#D4AF37] transition-colors duration-200">
          {plan.title}
        </h3>
        <p className="text-[11px] text-[#102542]/60 leading-relaxed mb-5 font-medium">
          {plan.description}
        </p>

        {/* Big ROI Badge */}
        <div className="bg-[#F8F4E8] border border-[#D4AF37]/25 rounded-2xl p-4 mb-5 text-center">
          <span className="text-[10px] text-[#102542]/60 font-bold uppercase tracking-widest block mb-1">Daily ROI</span>
          <p className="text-3xl font-black text-[#D4AF37]">
            {plan.daily_return_percent}%
            <span className="text-sm font-semibold text-[#102542]/50 ml-1">/ day</span>
          </p>
        </div>

        {/* Feature List */}
        <ul className="space-y-2 text-xs text-[#102542]/80 mb-6 font-medium flex-1">
          <li className="flex items-center gap-2">
            <FiCheckCircle className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
            Min Deposit: <strong className="text-[#102542] ml-0.5">${plan.min_investment}</strong>
          </li>
          <li className="flex items-center gap-2">
            <FiCheckCircle className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
            Max Deposit: <strong className="text-[#102542] ml-0.5">${plan.max_investment}</strong>
          </li>
          <li className="flex items-center gap-2">
            <FiCheckCircle className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
            Daily Profit Credited
          </li>
          <li className="flex items-center gap-2">
            <FiCheckCircle className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
            Principal Returned at Maturity
          </li>
        </ul>

        {/* CTA Button */}
        <button
          onClick={() => onSelectPlan(plan)}
          className="w-full py-3 rounded-2xl gradient-navy text-[#F8F4E8] text-xs font-bold hover:shadow-glow-navy hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
        >
          <FiTrendingUp className="w-4 h-4 text-[#D4AF37]" />
          Invest Now
          <FiArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InvestmentCard;
