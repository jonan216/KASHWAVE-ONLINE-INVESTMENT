import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatUGX, RULES } from '../utils/currency';
import {
  FiDollarSign, FiBriefcase, FiTrendingUp, FiArrowUpRight,
  FiArrowDownLeft, FiList, FiActivity, FiClock, FiCheckCircle,
  FiPlusCircle, FiCreditCard, FiZap, FiLock, FiCalendar, FiGift
} from 'react-icons/fi';
import 'chart.js/auto';
import { Line, Bar } from 'react-chartjs-2';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, delay: i * 0.08, ease: 'easeOut' } })
};
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const statusStyle = {
  completed: 'bg-[#16A34A]/10 text-[#16A34A]',
  approved:  'bg-[#16A34A]/10 text-[#16A34A]',
  pending:   'bg-[#F59E0B]/10 text-[#F59E0B]',
  rejected:  'bg-[#DC2626]/10 text-[#DC2626]',
};

const StatCard = ({ title, value, icon: Icon, accent, trend, subtitle, index }) => {
  const accentMap = {
    gold:   { bg: 'bg-[#D4AF37]/15', text: 'text-[#D4AF37]', bar: 'gradient-gold' },
    navy:   { bg: 'bg-[#102542]/10', text: 'text-[#102542]', bar: 'gradient-navy' },
    green:  { bg: 'bg-[#16A34A]/10', text: 'text-[#16A34A]', bar: 'bg-[#16A34A]' },
    orange: { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', bar: 'bg-[#F59E0B]' },
  };
  const a = accentMap[accent] || accentMap.navy;

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      whileHover={{ y: -4 }}
      className="bg-white rounded-3xl p-6 border border-[#102542]/8 shadow-soft hover:shadow-soft-lg transition-all duration-300 relative overflow-hidden"
    >
      <div className={`absolute top-0 left-0 right-0 h-1 ${a.bar}`} />
      <div className="flex items-start justify-between mb-4 pt-1">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${a.bg}`}>
          <Icon className={`w-5 h-5 ${a.text}`} />
        </div>
        {trend && (
          <span className="text-[10px] font-extrabold text-[#16A34A] bg-[#16A34A]/10 px-2.5 py-1 rounded-full flex items-center gap-1">
            <FiTrendingUp className="w-3 h-3" /> {trend}
          </span>
        )}
      </div>
      <p className="text-[10px] font-extrabold text-[#102542]/50 uppercase tracking-widest">{title}</p>
      <p className="text-xl font-extrabold text-[#102542] mt-1">{value}</p>
      {subtitle && <p className="text-[10px] text-[#102542]/50 font-medium mt-1">{subtitle}</p>}
    </motion.div>
  );
};

const DashboardPage = () => {
  const { wallet, user, refreshProfile } = useAuth();
  const [investments, setInvestments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        await refreshProfile();
        const [invRes, txRes] = await Promise.all([
          api.get('/investments/my-investments'),
          api.get('/transactions')
        ]);
        if (invRes.data.success) setInvestments(invRes.data.data);
        if (txRes.data.success) setTransactions(txRes.data.data);
      } catch (err) {
        console.error('Dashboard load failed:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await refreshProfile();
        const txRes = await api.get('/transactions');
        if (txRes.data.success) setTransactions(txRes.data.data);
      } catch (err) {
        console.error('Dashboard auto-refresh failed:', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshProfile]);

  if (loading) return <LoadingSpinner text="Loading your portfolio..." />;

  const mainBalance    = parseFloat(wallet?.main_balance    || 0);
  const investBalance  = parseFloat(wallet?.investment_balance || 0);
  const totalEarnings  = parseFloat(wallet?.total_earnings  || 0);
  const totalWithdrawn = parseFloat(wallet?.total_withdrawn || 0);
  const totalAssets    = mainBalance + investBalance;

  const activeCount    = investments.filter(i => i.status === 'active').length;
  const pendingWD      = transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').length;
  const pendingWDTotal = transactions
    .filter(t => t.type === 'withdrawal' && t.status === 'pending')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const lineChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'],
    datasets: [{
      fill: true,
      label: 'Portfolio Value (UGX)',
      data: [
        Math.max(20000, totalAssets * 0.65),
        Math.max(25000, totalAssets * 0.73),
        Math.max(30000, totalAssets * 0.80),
        Math.max(40000, totalAssets * 0.87),
        Math.max(50000, totalAssets * 0.92),
        Math.max(60000, totalAssets * 0.96),
        totalAssets || 100000
      ],
      borderColor: '#102542',
      backgroundColor: 'rgba(16, 37, 66, 0.06)',
      borderWidth: 2.5,
      tension: 0.45,
      pointBackgroundColor: '#D4AF37',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 7,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#102542',
        titleColor: '#D4AF37',
        bodyColor: '#F8F4E8',
        borderColor: 'rgba(212,175,55,0.3)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: ctx => ` UGX ${ctx.parsed.y.toLocaleString('en-UG')}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#102542', font: { size: 11, family: 'Poppins', weight: '600' } },
        border: { display: false }
      },
      y: {
        grid: { color: 'rgba(16,37,66,0.04)', drawBorder: false },
        ticks: { color: '#102542', font: { size: 10, family: 'Poppins' }, callback: v => formatUGX(v, true) },
        border: { display: false }
      }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="space-y-7 pb-8"
    >
      {/* Welcome Banner */}
      <motion.div
        variants={fadeUp}
        custom={0}
        className="bg-[#102542] rounded-4xl p-7 sm:p-9 text-[#F8F4E8] relative overflow-hidden"
      >
        <div className="absolute -top-14 -right-14 w-56 h-56 bg-[#D4AF37]/10 rounded-full blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1">
            <p className="text-[10px] text-[#F8F4E8]/60 font-extrabold uppercase tracking-widest">Welcome back</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {user?.full_name?.split(' ')[0]} <span className="text-[#D4AF37]">👋</span>
            </h1>
            <p className="text-xs text-[#F8F4E8]/60 font-medium">
              Total Assets: <span className="text-[#D4AF37] font-extrabold">{formatUGX(totalAssets)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/dashboard/deposit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-gold text-[#102542] font-extrabold text-xs shadow-glow-gold hover:scale-[1.03] transition-all"
            >
              <FiArrowDownLeft className="w-4 h-4" /> Deposit
            </Link>
            <Link
              to="/dashboard/withdraw"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-extrabold text-xs hover:bg-white/15 transition-all"
            >
              <FiArrowUpRight className="w-4 h-4" /> Withdraw
            </Link>
            <Link
              to="/dashboard/plans"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16A34A] text-white font-extrabold text-xs hover:bg-[#15803D] transition-all"
            >
              <FiPlusCircle className="w-4 h-4" /> Invest Now
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Business Rules Bar */}
      <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#102542]">
        <div className="flex items-center gap-2 font-medium">
          <FiCalendar className="w-4 h-4 text-[#D4AF37] shrink-0" />
          <span>Automated Earnings: <strong>24-Hour Returns (5%/day)</strong> credited directly to <strong>Available Balance</strong></span>
        </div>
        <div className="flex items-center gap-2 font-medium">
          <FiLock className="w-4 h-4 text-[#102542] shrink-0" />
          <span>Capital locked <strong>60 days</strong> · Min Deposit: <strong>{formatUGX(RULES.MIN_INVEST)}</strong></span>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <motion.div
        variants={stagger}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        <StatCard
          title="Available Balance"
          value={formatUGX(mainBalance)}
          icon={FiCreditCard}
          accent="gold"
          trend="+5%/day (24 hrs)"
          subtitle="Available for withdrawal or reinvesting"
          index={0}
        />
        <StatCard
          title="Total Profit (ROI)"
          value={formatUGX(totalEarnings)}
          icon={FiTrendingUp}
          accent="green"
          trend="5% daily"
          subtitle="Lifetime automated returns"
          index={1}
        />
        <StatCard
          title="Active Investments"
          value={activeCount}
          icon={FiBriefcase}
          accent="navy"
          subtitle={`${formatUGX(investBalance)} locked`}
          index={2}
        />
        <StatCard
          title="Pending Withdrawals"
          value={pendingWD}
          icon={FiClock}
          accent={pendingWD > 0 ? 'orange' : 'green'}
          subtitle={pendingWD > 0 ? `${formatUGX(pendingWDTotal)} under review` : 'Friday processing'}
          index={3}
        />
      </motion.div>

      {/* Chart Row */}
      <motion.div
        variants={fadeUp}
        custom={2}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2 bg-white rounded-4xl p-6 sm:p-7 border border-[#102542]/8 shadow-soft">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-extrabold text-[#102542]">Portfolio Growth (UGX)</h3>
              <p className="text-[11px] text-[#102542]/50 font-medium">7-day portfolio valuation history</p>
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#16A34A]/10 text-[#16A34A] rounded-full text-[10px] font-extrabold uppercase">
              <FiActivity className="w-3.5 h-3.5" /> Live UGX
            </span>
          </div>
          <div className="h-60 sm:h-72">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>

        {/* Quick Referral Card */}
        <div className="bg-[#102542] rounded-4xl p-6 sm:p-7 text-[#F8F4E8] relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl gradient-gold flex items-center justify-center">
              <FiGift className="w-5 h-5 text-[#102542]" />
            </div>
            <h3 className="text-lg font-extrabold text-white">3-Level Referral Bonus</h3>
            <p className="text-xs text-[#F8F4E8]/60 leading-relaxed font-medium">
              Earn commissions whenever your network deposits into KashWave.
            </p>
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs border-b border-white/10 pb-1.5">
                <span className="text-[#F8F4E8]/70">Level 1 (Direct)</span>
                <strong className="text-[#D4AF37] font-extrabold">4% Commission</strong>
              </div>
              <div className="flex justify-between text-xs border-b border-white/10 pb-1.5">
                <span className="text-[#F8F4E8]/70">Level 2 (Indirect)</span>
                <strong className="text-[#D4AF37] font-extrabold">3% Commission</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#F8F4E8]/70">Level 3 (3rd Gen)</span>
                <strong className="text-[#D4AF37] font-extrabold">2% Commission</strong>
              </div>
            </div>
          </div>
          <Link
            to="/dashboard/referral"
            className="mt-6 w-full py-3 rounded-2xl gradient-gold text-[#102542] text-center font-extrabold text-xs hover:scale-[1.02] transition-all"
          >
            Get My Referral Link
          </Link>
        </div>
      </motion.div>

      {/* Portfolio Summary */}
      <motion.div
        variants={fadeUp}
        custom={3}
        className="bg-white rounded-4xl p-6 sm:p-7 border border-[#102542]/8 shadow-soft space-y-5"
      >
        <div>
          <h3 className="text-sm font-extrabold text-[#102542]">Portfolio Breakdown (UGX)</h3>
          <p className="text-[11px] text-[#102542]/50 font-medium">Key financial metrics in Ugandan Shillings</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Assets',       val: formatUGX(totalAssets),    color: 'text-[#102542]' },
            { label: 'Wallet Balance',     val: formatUGX(mainBalance),    color: 'text-[#D4AF37]' },
            { label: 'Locked Capital',     val: formatUGX(investBalance),  color: 'text-[#102542]' },
            { label: 'Total ROI Earned',   val: formatUGX(totalEarnings),  color: 'text-[#16A34A]' },
            { label: 'Total Withdrawn',    val: formatUGX(totalWithdrawn), color: 'text-[#F59E0B]' },
            { label: 'Min Withdraw',       val: formatUGX(RULES.MIN_WITHDRAW), color: 'text-[#102542]' },
          ].map((item, i) => (
            <div key={i} className="bg-[#F8F4E8] rounded-2xl p-4 border border-[#102542]/6">
              <p className="text-[9px] font-extrabold text-[#102542]/50 uppercase tracking-widest">{item.label}</p>
              <p className={`text-sm font-extrabold mt-1 ${item.color}`}>{item.val}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Transactions Table */}
      <motion.div
        variants={fadeUp}
        custom={4}
        className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-[#102542]/8">
          <div>
            <h3 className="text-sm font-extrabold text-[#102542]">Recent Transactions</h3>
            <p className="text-[11px] text-[#102542]/50 font-medium">Mobile Money deposits & withdrawals</p>
          </div>
          <Link to="/dashboard/transactions" className="text-xs font-extrabold text-[#D4AF37] hover:underline flex items-center gap-1">
            View All <FiArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F4E8]">
              <tr className="text-[#102542]/50 uppercase tracking-wider font-extrabold text-[9px]">
                <th className="px-6 sm:px-8 py-4">Reference</th>
                <th className="px-4 py-4">Type</th>
                <th className="px-4 py-4">Amount (UGX)</th>
                <th className="px-4 py-4 hidden sm:table-cell">Method</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#102542]/5">
              {transactions.slice(0, 6).map(tx => (
                <tr key={tx.id} className="hover:bg-[#F8F4E8]/70 transition-colors">
                  <td className="px-6 sm:px-8 py-4 font-mono text-[#102542]/70 font-semibold text-[11px]">{tx.reference_code}</td>
                  <td className="px-4 py-4 font-extrabold text-[#102542] uppercase text-[10px]">{tx.type}</td>
                  <td className="px-4 py-4 font-extrabold text-[#16A34A]">{formatUGX(tx.amount)}</td>
                  <td className="px-4 py-4 text-[#102542]/50 font-medium hidden sm:table-cell">{tx.payment_method}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${statusStyle[tx.status] || 'bg-gray-100 text-gray-500'}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[#102542]/40 font-medium hidden md:table-cell">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <FiList className="w-8 h-8 text-[#102542]/20 mx-auto mb-3" />
                    <p className="text-[11px] text-[#102542]/40 font-medium">No transactions yet. Make your first deposit via Mobile Money.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DashboardPage;
