import React, { useState } from 'react';
import { FiPieChart, FiTrendingUp, FiDollarSign, FiClock, FiArrowRight } from 'react-icons/fi';

const ProfitCalculator = ({ plans = [] }) => {
  const defaultPlan = plans[0] || {
    id: 1,
    title: 'Starter Yield',
    daily_return_percent: 1.50,
    duration_days: 14,
    min_investment: 100,
    max_investment: 999
  };

  const [selectedPlanId, setSelectedPlanId] = useState(defaultPlan.id);
  const [amount, setAmount] = useState('');

  const selectedPlan = plans.find(p => p.id === parseInt(selectedPlanId)) || defaultPlan;
  const numAmount = parseFloat(amount) || 0;
  const dailyReturn = (numAmount * parseFloat(selectedPlan.daily_return_percent)) / 100;
  const totalProfit = dailyReturn * parseInt(selectedPlan.duration_days);
  const totalPayout = numAmount + totalProfit;
  const roiPercent = ((totalProfit / numAmount) * 100).toFixed(0);

  return (
    <div id="calculator" className="bg-white rounded-4xl p-6 sm:p-10 border border-[#102542]/8 shadow-soft-lg">
      {/* Section Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
          <FiPieChart className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-[#102542]">Interactive ROI Calculator</h3>
          <p className="text-xs text-[#102542]/60 font-medium mt-0.5">Estimate daily earnings and total maturity payout instantly.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* LEFT — Controls */}
        <div className="space-y-8">
          {/* Plan Selector Buttons */}
          <div>
            <label className="block text-xs font-bold text-[#102542]/70 uppercase tracking-widest mb-3">
              Select Investment Tier
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(plans.length ? plans : [defaultPlan]).map(plan => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlanId(plan.id);
                    setAmount(plan.min_investment);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 ${
                    selectedPlan.id === plan.id
                      ? 'bg-[#102542] border-[#102542] text-white shadow-glow-navy scale-[1.02]'
                      : 'bg-[#F8F4E8] border-[#102542]/10 text-[#102542] hover:border-[#102542]/30'
                  }`}
                >
                  <p className="text-xs font-bold truncate">{plan.title}</p>
                  <p className={`text-[11px] font-bold mt-0.5 ${selectedPlan.id === plan.id ? 'text-[#D4AF37]' : 'text-[#D4AF37]'}`}>
                    {plan.daily_return_percent}% Daily
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Amount Slider */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-bold text-[#102542]/70 uppercase tracking-widest">
                Investment Amount
              </label>
               <span className="text-lg font-extrabold text-[#D4AF37]">
                 UGX {numAmount ? numAmount.toLocaleString('en-UG') : '0'}
               </span>
             </div>
             <input
               type="range"
               min={selectedPlan.min_investment}
               max={selectedPlan.max_investment}
               step="50"
               value={amount || selectedPlan.min_investment}
               onChange={e => setAmount(Number(e.target.value))}
               className="w-full h-2 rounded-full appearance-none cursor-pointer"
               style={{
                 background: `linear-gradient(to right, #D4AF37 ${(((amount ? Number(amount) : selectedPlan.min_investment) - selectedPlan.min_investment) / (selectedPlan.max_investment - selectedPlan.min_investment)) * 100}%, #ECE3CE ${(((amount ? Number(amount) : selectedPlan.min_investment) - selectedPlan.min_investment) / (selectedPlan.max_investment - selectedPlan.min_investment)) * 100}%)`
               }}
             />
             <div className="flex justify-between text-[10px] text-[#102542]/50 font-semibold mt-2">
               <span>Min: UGX {selectedPlan.min_investment}</span>
               <span>Max: UGX {selectedPlan.max_investment}</span>
             </div>
          </div>
        </div>

        {/* RIGHT — Results Panel */}
        <div className="bg-[#102542] rounded-3xl p-6 sm:p-8 text-[#F8F4E8] relative overflow-hidden">
          {/* Decorative watermark */}
          <div className="absolute -bottom-6 -right-6 opacity-5">
            <FiTrendingUp className="w-40 h-40 text-[#D4AF37]" />
          </div>

          {/* Top Stats Row */}
          <div className="grid grid-cols-2 gap-4 pb-5 border-b border-white/10 mb-5">
            <div>
              <p className="text-[10px] text-[#F8F4E8]/60 uppercase tracking-widest font-bold">Daily Return</p>
              <p className="text-xl font-extrabold text-white mt-0.5">
                UGX {dailyReturn.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#F8F4E8]/60 uppercase tracking-widest font-bold">Duration</p>
              <p className="text-xl font-extrabold text-white mt-0.5 flex items-center gap-1">
                <FiClock className="w-4 h-4 text-[#F59E0B]" />
                {selectedPlan.duration_days}d
              </p>
            </div>
          </div>

          {/* Total Profit */}
          <div className="mb-4">
            <p className="text-[10px] text-[#F8F4E8]/60 uppercase tracking-widest font-bold mb-1">Net Profit</p>
            <p className="text-2xl font-extrabold text-[#16A34A]">
              +UGX {totalProfit.toLocaleString('en-UG', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 pt-4">
            <div className="flex justify-between items-center text-xs text-[#F8F4E8]/60 mb-1.5 font-medium">
              <span>Total Maturity Payout</span>
              <span className="text-[#D4AF37] font-extrabold">ROI: +{roiPercent}%</span>
            </div>
            <p className="text-3xl font-black text-white tracking-tight">
              UGX {totalPayout.toLocaleString('en-UG', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitCalculator;
