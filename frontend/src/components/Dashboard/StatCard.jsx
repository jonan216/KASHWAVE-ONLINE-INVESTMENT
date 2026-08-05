import React from 'react';
import { FiArrowUpRight } from 'react-icons/fi';

const StatCard = ({ title, value, icon: Icon, color = 'gold', trend, subtitle }) => {
  const styles = {
    gold: {
      bg: 'bg-[#D4AF37]/10',
      text: 'text-[#D4AF37]',
      border: 'border-l-[#D4AF37]',
      trend: 'text-[#16A34A]',
    },
    navy: {
      bg: 'bg-[#102542]/10',
      text: 'text-[#102542]',
      border: 'border-l-[#102542]',
      trend: 'text-[#16A34A]',
    },
    green: {
      bg: 'bg-[#16A34A]/10',
      text: 'text-[#16A34A]',
      border: 'border-l-[#16A34A]',
      trend: 'text-[#16A34A]',
    },
    orange: {
      bg: 'bg-[#F59E0B]/10',
      text: 'text-[#F59E0B]',
      border: 'border-l-[#F59E0B]',
      trend: 'text-[#16A34A]',
    },
  };

  const s = styles[color] || styles.gold;

  return (
    <div className={`bg-white rounded-3xl p-6 border border-[#102542]/8 shadow-soft hover:shadow-soft-lg transition-all duration-300 hover:-translate-y-1 border-l-4 ${s.border}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold text-[#102542]/60 uppercase tracking-widest">{title}</span>
        {Icon && (
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${s.bg}`}>
            <Icon className={`w-5 h-5 ${s.text}`} />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-2xl font-extrabold text-[#102542] tracking-tight">{value}</h3>
        {trend && (
          <p className={`text-xs font-bold flex items-center gap-1 ${s.trend}`}>
            <FiArrowUpRight className="w-3.5 h-3.5" /> {trend}
          </p>
        )}
        {subtitle && <p className="text-[11px] text-[#102542]/50 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
};

export default StatCard;
