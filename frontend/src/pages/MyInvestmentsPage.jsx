import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import { formatUGX } from '../utils/currency';
import { FiBriefcase, FiTrendingUp, FiClock, FiArrowRight, FiCalendar, FiZap, FiCheckCircle } from 'react-icons/fi';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.1, ease: 'easeOut' } }) };

const riskColors = {
  low:    'bg-[#16A34A]/10 text-[#16A34A]',
  medium: 'bg-[#102542]/10 text-[#102542]',
  high:   'bg-[#F59E0B]/10 text-[#F59E0B]',
  expert: 'bg-[#D4AF37]/15 text-[#D4AF37]',
};

// Component for rendering exact 24-hour countdown
const ProfitCountdown = ({ nextPayoutAt }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const target = new Date(nextPayoutAt).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setIsReady(true);
        setTimeLeft('Profit Ready / Crediting...');
        return;
      }

      setIsReady(false);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextPayoutAt]);

  if (isReady) {
    return (
      <span className="flex items-center gap-1.5 text-[#16A34A] font-extrabold text-xs animate-pulse">
        <FiCheckCircle className="w-3.5 h-3.5" /> {timeLeft}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-[#D4AF37] font-extrabold text-xs">
      <FiClock className="w-3.5 h-3.5" /> {timeLeft}
    </span>
  );
};

const MyInvestmentsPage = () => {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/investments/my-investments');
        if (res.data.success) setInvestments(res.data.data);
      } catch { } finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <LoadingSpinner text="Loading your investment portfolio..." />;

  return (
    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-8 pb-8">
      {/* Page Header */}
      <motion.div variants={fadeUp} custom={0} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#102542]">My Active Portfolio</h2>
          <p className="text-xs text-[#102542]/60 font-medium mt-1">
            Exact start times, 24-hour profit payout schedules, and live contract progress.
          </p>
        </div>
        <Link
          to="/dashboard/plans"
          className="self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl gradient-navy text-[#F8F4E8] text-xs font-extrabold hover:shadow-glow-navy transition-all"
        >
          <FiTrendingUp className="w-4 h-4 text-[#D4AF37]" />
          New Investment
        </Link>
      </motion.div>

      {investments.length === 0 ? (
        <div className="bg-white rounded-4xl p-12 sm:p-16 text-center border border-[#102542]/8 shadow-soft space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-[#F8F4E8] border border-[#102542]/10 flex items-center justify-center mx-auto">
            <FiBriefcase className="w-8 h-8 text-[#102542]/40" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-[#102542]">No Active Investments Yet</h3>
            <p className="text-xs text-[#102542]/60 font-medium max-w-xs mx-auto mt-1 leading-relaxed">
              You haven't deployed any capital yet. Choose an investment plan to begin earning automated 24-hour daily returns.
            </p>
          </div>
          <Link
            to="/dashboard/plans"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl gradient-gold text-[#102542] text-xs font-extrabold shadow-glow-gold hover:scale-[1.02] transition-all"
          >
            <FiTrendingUp className="w-4 h-4" /> Browse Investment Plans <FiArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <motion.div variants={fadeUp} custom={1} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {investments.map((inv, idx) => {
            const startDate = new Date(inv.start_date || inv.created_at);
            const endDate = new Date(inv.end_date);
            const nextPayout = new Date(inv.next_payout_at || (startDate.getTime() + 24 * 60 * 60 * 1000));
            const now = new Date();

            const totalDuration = endDate - startDate;
            const elapsed = Math.max(0, now - startDate);
            const progress = Math.min(100, Math.round((elapsed / totalDuration) * 100));
            const daysLeft = Math.max(0, Math.ceil((endDate - now) / 86400000));
            const riskStyle = riskColors[inv.risk_level] || riskColors.medium;

            const formattedStartTime = `${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
            const formattedNextPayoutTime = `${nextPayout.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at ${nextPayout.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

            return (
              <motion.div
                key={inv.id}
                custom={idx}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft hover:shadow-soft-lg transition-all duration-300 overflow-hidden"
              >
                {/* Top Bar */}
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(to right, #D4AF37 ${progress}%, #ECE3CE ${progress}%)` }} />

                <div className="p-6 space-y-5">
                  {/* Header Row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl gradient-navy flex items-center justify-center shrink-0">
                        <FiTrendingUp className="w-5 h-5 text-[#D4AF37]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-[#102542]">{inv.plan_title}</h4>
                        <p className="text-[11px] text-[#D4AF37] font-bold">{inv.daily_return_percent}% Daily ROI (Every 24 Hours)</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full ${riskStyle}`}>
                      {inv.status}
                    </span>
                  </div>

                  {/* Capital & Returns Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#F8F4E8] rounded-2xl p-3.5 border border-[#102542]/6">
                      <p className="text-[9px] text-[#102542]/60 uppercase font-bold tracking-widest">Invested Capital</p>
                      <p className="text-base font-extrabold text-[#102542] mt-0.5">{formatUGX(inv.invested_amount)}</p>
                    </div>
                    <div className="bg-[#F8F4E8] rounded-2xl p-3.5 border border-[#102542]/6">
                      <p className="text-[9px] text-[#102542]/60 uppercase font-bold tracking-widest">Expected Return</p>
                      <p className="text-base font-extrabold text-[#16A34A] mt-0.5">{formatUGX(inv.expected_return)}</p>
                    </div>
                  </div>

                  {/* Exact Timestamps Box */}
                  <div className="bg-[#102542]/5 border border-[#102542]/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-[#102542]/10">
                      <span className="text-[#102542]/70 font-medium flex items-center gap-1.5">
                        <FiCalendar className="w-3.5 h-3.5 text-[#102542]" />
                        <strong>Started At:</strong>
                      </span>
                      <span className="font-extrabold text-[#102542]">{formattedStartTime}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs pb-2 border-b border-[#102542]/10">
                      <span className="text-[#102542]/70 font-medium flex items-center gap-1.5">
                        <FiZap className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <strong>24-Hour Profit Payout:</strong>
                      </span>
                      <span className="font-extrabold text-[#16A34A]">{formattedNextPayoutTime}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-[#102542]/70 font-medium">Profit Countdown:</span>
                      <ProfitCountdown nextPayoutAt={nextPayout} />
                    </div>
                  </div>

                  {/* Progress Bar Section */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#102542]/60 font-semibold">Overall Contract Progress</span>
                      <span className="font-extrabold text-[#102542]">{progress}%</span>
                    </div>
                    <div className="h-2.5 bg-[#F8F4E8] rounded-full overflow-hidden border border-[#102542]/6">
                      <div
                        className="h-full gradient-gold rounded-full transition-all duration-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#102542]/50 font-semibold">
                      <span>Maturity Lock: {inv.duration_days || 60} Days</span>
                      <span className="text-[#D4AF37] font-bold">
                        {daysLeft > 0 ? `${daysLeft} days remaining` : 'Matured'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
};

export default MyInvestmentsPage;
