import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import api from '../services/api';
import { formatUGX } from '../utils/currency';
import {
  FiList, FiFilter, FiCheckCircle, FiClock, FiXCircle,
  FiArrowDownLeft, FiArrowUpRight, FiTrendingUp, FiSearch
} from 'react-icons/fi';

const statusConfig = {
  completed: { label: 'Completed', icon: FiCheckCircle, style: 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20' },
  approved:  { label: 'Approved',  icon: FiCheckCircle, style: 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20' },
  pending:   { label: 'Pending',   icon: FiClock,       style: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20' },
  rejected:  { label: 'Rejected',  icon: FiXCircle,     style: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20' },
};

const typeIcon = {
  deposit:     FiArrowDownLeft,
  withdrawal:  FiArrowUpRight,
  investment:  FiTrendingUp,
  roi_credit:  FiTrendingUp,
  referral:    FiTrendingUp,
};

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filterType, setFilterType]     = useState('all');
  const [search, setSearch]             = useState('');

  useEffect(() => {
    const fetchTx = async () => {
      try {
        const res = await api.get('/transactions');
        if (res.data.success) setTransactions(res.data.data);
      } catch (err) {
        console.error('Transactions fetch error:', err);
      } finally { setLoading(false); }
    };
    fetchTx();
  }, []);

  if (loading) return <LoadingSpinner text="Loading transaction ledger..." />;

  const filtered = transactions.filter(t => {
    const matchType = filterType === 'all' || t.type === filterType;
    const matchSearch = (t.reference_code || '').toLowerCase().includes(search.toLowerCase()) ||
                        (t.payment_method || '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-6 pb-8"
    >
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-[#102542]">Audit Ledger (UGX)</h2>
        <p className="text-xs text-[#102542]/60 font-medium mt-1">
          Complete transparent log of all Mobile Money deposits, plan investments, daily ROI payouts & withdrawals in Ugandan Shillings.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-3xl p-4 border border-[#102542]/8 shadow-soft flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Type Tabs */}
        <div className="flex gap-1.5 flex-wrap w-full sm:w-auto">
          {['all', 'deposit', 'withdrawal', 'investment'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold capitalize transition-all ${
                filterType === t
                  ? 'gradient-navy text-[#D4AF37] shadow-glow-navy'
                  : 'bg-[#F8F4E8] text-[#102542]/60 hover:text-[#102542]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <FiSearch className="w-4 h-4 text-[#102542]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ref or method..."
            className="w-full pl-10 pr-4 py-2 bg-[#F8F4E8] border border-[#102542]/10 rounded-xl text-xs font-medium text-[#102542] placeholder-[#102542]/30 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F4E8]">
              <tr className="text-[#102542]/50 uppercase tracking-widest font-extrabold text-[9px]">
                <th className="px-6 py-4">Transaction</th>
                <th className="px-4 py-4">Reference</th>
                <th className="px-4 py-4">Amount (UGX)</th>
                <th className="px-4 py-4">Method / Details</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#102542]/5">
              {filtered.map(tx => {
                const Icon = typeIcon[tx.type] || FiList;
                const status = statusConfig[tx.status] || { label: tx.status, icon: FiClock, style: 'bg-gray-100 text-gray-600' };
                const StatusIcon = status.icon;

                return (
                  <tr key={tx.id} className="hover:bg-[#F8F4E8]/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#102542]/8 text-[#102542] flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-extrabold text-[#102542] capitalize text-xs">{tx.type}</p>
                          <p className="text-[10px] text-[#102542]/50 font-medium">UGX Ledger</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono font-bold text-[#102542]/70 text-[11px]">{tx.reference_code}</td>
                    <td className="px-4 py-4 font-extrabold text-[#16A34A] text-sm">{formatUGX(tx.amount)}</td>
                    <td className="px-4 py-4 text-[#102542]/60 font-medium">{tx.payment_method}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold border ${status.style}`}>
                        <StatusIcon className="w-3 h-3" /> {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#102542]/40 font-medium">
                      {new Date(tx.created_at).toLocaleString('en-UG', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <FiList className="w-8 h-8 text-[#102542]/20 mx-auto mb-3" />
                    <p className="text-xs text-[#102542]/50 font-medium">No transactions found matching your filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default TransactionsPage;
