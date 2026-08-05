import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { formatCurrency, formatUGX, RULES } from '../utils/currency';
import {
  FiShield, FiUsers, FiDollarSign, FiCheckSquare, FiAlertCircle,
  FiCheck, FiX, FiSettings, FiPlus, FiLock, FiPieChart,
  FiFileText, FiArrowUpRight, FiArrowDownLeft, FiRefreshCw,
  FiUserCheck, FiUserX, FiTrendingUp, FiSearch, FiSliders, FiDownload
} from 'react-icons/fi';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [activeTab, setActiveTab]       = useState('dashboard'); // dashboard | users | investments | deposits | withdrawals | plans | reports | settings
  const [stats, setStats]               = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers]               = useState([]);
  const [plans, setPlans]               = useState([]);
  const [loading, setLoading]           = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm]     = useState('');

  // Plan creation modal
  const [planModal, setPlanModal]       = useState(false);
  const [planForm, setPlanForm]         = useState({
    title: '', description: '', daily_return_percent: '5.00',
    duration_days: '60', min_investment: '100', max_investment: '5000'
  });

  const fetchAdminData = async () => {
    try {
      const [statsRes, txRes, usersRes, plansRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/transactions'),
        api.get('/admin/users'),
        api.get('/investments/plans')
      ]);
      if (statsRes.data.success) setStats(statsRes.data.data);
      if (txRes.data.success) setTransactions(txRes.data.data);
      if (usersRes.data.success) setUsers(usersRes.data.data);
      if (plansRes.data.success) setPlans(plansRes.data.data);
    } catch (err) {
      console.error('Admin data load failed:', err);
      showError('Failed to synchronize admin metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleApproveTx = async (id, type) => {
    try {
      const res = await api.put(`/admin/transactions/${id}/approve`, {
        admin_notes: `Approved via Admin Portal (${type})`
      });
      if (res.data.success) {
        showSuccess(res.data.message || `${type} approved successfully.`);
        await fetchAdminData();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Approval action failed.');
    }
  };

  const handleRejectTx = async (id, type) => {
    try {
      const res = await api.put(`/admin/transactions/${id}/reject`, {
        admin_notes: `Rejected via Admin Portal (${type})`
      });
      if (res.data.success) {
        showSuccess(res.data.message || `${type} rejected.`);
        await fetchAdminData();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Rejection action failed.');
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await api.put(`/admin/users/${userId}/status`, { status: newStatus });
      if (res.data.success) {
        showSuccess(res.data.message || `User status changed to ${newStatus}.`);
        await fetchAdminData();
      }
    } catch (err) {
      showError('User status update failed.');
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/plans', planForm);
      if (res.data.success) {
        showSuccess(res.data.message || 'New investment plan published!');
        setPlanModal(false);
        await fetchAdminData();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Plan creation failed.');
    }
  };

  if (loading) return <LoadingSpinner text="Loading KashWave Executive Admin Console..." />;

  // Filtered Lists
  const pendingDeposits    = transactions.filter(t => t.type === 'deposit' && t.status === 'pending');
  const pendingWithdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending');
  const allDeposits        = transactions.filter(t => t.type === 'deposit');
  const allWithdrawals     = transactions.filter(t => t.type === 'withdrawal');

  const filteredUsers = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-8">
      {/* ── ADMIN HEADER & ROLE BADGE ────────────────────────────────────────── */}
      <div className="bg-[#102542] rounded-4xl p-7 sm:p-9 text-[#F8F4E8] relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-soft-lg">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-2xl" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#D4AF37] text-[#102542] text-[10px] font-extrabold rounded-full uppercase tracking-widest flex items-center gap-1">
              <FiShield className="w-3 h-3" /> Role: {user?.role?.toUpperCase() || 'SUPER ADMIN'}
            </span>
            <span className="text-[10px] text-[#F8F4E8]/60 font-medium">Role-Based Access Control Enabled</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            KashWave Admin Control Center 🛡️
          </h1>
          <p className="text-xs text-[#F8F4E8]/60 font-medium">
            Manage user accounts, process pending deposits & withdrawals, publish tier packages, and view platform financial analytics.
          </p>
        </div>

        <button
          onClick={() => setPlanModal(true)}
          className="relative z-10 px-5 py-3 rounded-2xl gradient-gold text-[#102542] font-extrabold text-xs shadow-glow-gold flex items-center gap-2 hover:scale-105 transition-all shrink-0"
        >
          <FiPlus className="w-4 h-4" /> Create Investment Plan
        </button>
      </div>

      {/* ── ADMIN NAVIGATION TABS (8 REQUESTED SECTIONS) ────────────────────────── */}
      <div className="bg-white rounded-3xl border border-[#102542]/8 shadow-soft p-2 overflow-x-auto flex items-center gap-1">
        {[
          { id: 'dashboard',   label: 'Dashboard',   icon: FiPieChart,     badge: null },
          { id: 'users',       label: 'Users',       icon: FiUsers,        badge: users.length },
          { id: 'investments', label: 'Investments', icon: FiTrendingUp,   badge: null },
          { id: 'deposits',    label: 'Deposits',    icon: FiArrowDownLeft,badge: pendingDeposits.length },
          { id: 'withdrawals', label: 'Withdrawals', icon: FiArrowUpRight, badge: pendingWithdrawals.length },
          { id: 'plans',       label: 'Plans',       icon: FiSliders,      badge: plans.length },
          { id: 'reports',     label: 'Reports',     icon: FiFileText,     badge: null },
          { id: 'settings',    label: 'Settings',    icon: FiSettings,     badge: null },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 ${
                isActive
                  ? 'bg-[#102542] text-[#D4AF37] shadow-glow-navy scale-[1.02]'
                  : 'text-[#102542]/70 hover:text-[#102542] hover:bg-[#F8F4E8]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                  isActive ? 'bg-[#D4AF37] text-[#102542]' : 'bg-[#102542]/10 text-[#102542]'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 1. DASHBOARD ANALYTICS TAB ────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stat Widgets Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-3xl p-6 border border-[#102542]/8 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-[#102542]/10 text-[#102542] flex items-center justify-center">
                  <FiUsers className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold text-[#16A34A] bg-[#16A34A]/10 px-2 py-0.5 rounded-full">Active</span>
              </div>
              <p className="text-[10px] font-extrabold text-[#102542]/50 uppercase tracking-widest">Total Registered Investors</p>
              <p className="text-2xl font-extrabold text-[#102542] mt-1">{stats?.totalUsers || users.length}</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#102542]/8 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center">
                  <FiDollarSign className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold text-[#16A34A] bg-[#16A34A]/10 px-2 py-0.5 rounded-full">Processed</span>
              </div>
              <p className="text-[10px] font-extrabold text-[#102542]/50 uppercase tracking-widest">Total Deposit Volume</p>
              <p className="text-2xl font-extrabold text-[#16A34A] mt-1">
                {formatCurrency(stats?.totalVolume || 0, 'USD')}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#102542]/8 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center">
                  <FiCheckSquare className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full">Action Req.</span>
              </div>
              <p className="text-[10px] font-extrabold text-[#102542]/50 uppercase tracking-widest">Pending Deposits</p>
              <p className="text-2xl font-extrabold text-[#F59E0B] mt-1">{pendingDeposits.length}</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#102542]/8 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center">
                  <FiAlertCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold text-[#DC2626] bg-[#DC2626]/10 px-2 py-0.5 rounded-full">Friday Gate</span>
              </div>
              <p className="text-[10px] font-extrabold text-[#102542]/50 uppercase tracking-widest">Pending Withdrawals</p>
              <p className="text-2xl font-extrabold text-[#DC2626] mt-1">{pendingWithdrawals.length}</p>
            </div>
          </div>

          {/* Analytics Summary */}
          <div className="bg-white rounded-4xl p-7 border border-[#102542]/8 shadow-soft space-y-4">
            <h3 className="text-sm font-extrabold text-[#102542]">Platform Financial Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
              <div className="bg-[#F8F4E8] p-4 rounded-2xl border border-[#102542]/8">
                <p className="text-[9px] text-[#102542]/50 font-extrabold uppercase">Total Investments</p>
                <p className="text-base font-extrabold text-[#102542] mt-1">{plans.length} Tier Packages</p>
              </div>
              <div className="bg-[#F8F4E8] p-4 rounded-2xl border border-[#102542]/8">
                <p className="text-[9px] text-[#102542]/50 font-extrabold uppercase">System Currency</p>
                <p className="text-base font-extrabold text-[#D4AF37] mt-1">Dual UGX / USD</p>
              </div>
              <div className="bg-[#F8F4E8] p-4 rounded-2xl border border-[#102542]/8">
                <p className="text-[9px] text-[#102542]/50 font-extrabold uppercase">Earning Cycle</p>
                <p className="text-base font-extrabold text-[#16A34A] mt-1">5% / Day (Mon–Fri)</p>
              </div>
              <div className="bg-[#F8F4E8] p-4 rounded-2xl border border-[#102542]/8">
                <p className="text-[9px] text-[#102542]/50 font-extrabold uppercase">Withdrawal Window</p>
                <p className="text-base font-extrabold text-[#DC2626] mt-1">Fridays Only</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. USERS MANAGEMENT TAB ────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft overflow-hidden space-y-4">
          <div className="p-6 border-b border-[#102542]/8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-[#102542]">User Management Directory</h3>
              <p className="text-xs text-[#102542]/60 font-medium mt-0.5">Manage registered investor profiles, suspend accounts, and view balances.</p>
            </div>
            <div className="relative w-full sm:w-64">
              <FiSearch className="w-4 h-4 text-[#102542]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search investor by name or email..."
                className="w-full pl-10 pr-4 py-2 bg-[#F8F4E8] border border-[#102542]/10 rounded-xl text-xs font-medium text-[#102542]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F4E8]">
                <tr className="text-[#102542]/50 uppercase tracking-widest font-extrabold text-[9px]">
                  <th className="py-4 px-6">Investor Name</th>
                  <th className="py-4 px-4">Email Address</th>
                  <th className="py-4 px-4">Role</th>
                  <th className="py-4 px-4">Wallet Balance</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#102542]/5">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-[#F8F4E8]/60 transition-colors">
                    <td className="py-4 px-6 font-extrabold text-[#102542]">{u.full_name}</td>
                    <td className="py-4 px-4 text-[#102542]/70 font-mono text-[11px]">{u.email}</td>
                    <td className="py-4 px-4 uppercase font-extrabold text-[#D4AF37] text-[10px]">{u.role}</td>
                    <td className="py-4 px-4 font-extrabold text-[#16A34A]">{formatUGX(u.main_balance || 0)}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase ${
                        u.status === 'active' ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-[#DC2626]/10 text-[#DC2626]'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all flex items-center gap-1 ml-auto ${
                            u.status === 'active'
                              ? 'bg-[#DC2626]/10 text-[#DC2626] hover:bg-[#DC2626] hover:text-white'
                              : 'bg-[#16A34A]/10 text-[#16A34A] hover:bg-[#16A34A] hover:text-white'
                          }`}
                        >
                          {u.status === 'active' ? <><FiUserX /> Suspend User</> : <><FiUserCheck /> Activate User</>}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 3. INVESTMENTS LEDGER TAB ────────────────────────────────────────── */}
      {activeTab === 'investments' && (
        <div className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft p-6 sm:p-8 space-y-4">
          <h3 className="text-base font-extrabold text-[#102542]">Active Investments Ledger</h3>
          <p className="text-xs text-[#102542]/60 font-medium">All active 60-day investment contracts currently yielding 5% daily ROI</p>
          <div className="p-8 text-center text-xs text-[#102542]/50 bg-[#F8F4E8] rounded-2xl border border-[#102542]/8">
            <FiTrendingUp className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
            <p className="font-extrabold text-[#102542]">Automated Daily Payout Engine Running</p>
            <p className="mt-1">Returns are calculated Monday through Friday at 00:00 EAT with 60-day capital lock enforcement.</p>
          </div>
        </div>
      )}

      {/* ── 4. DEPOSITS APPROVAL QUEUE TAB ───────────────────────────────────── */}
      {activeTab === 'deposits' && (
        <div className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft overflow-hidden space-y-4">
          <div className="p-6 border-b border-[#102542]/8">
            <h3 className="text-base font-extrabold text-[#102542]">Deposit Approval Queue</h3>
            <p className="text-xs text-[#102542]/60 font-medium mt-0.5">Verify Mobile Money, Card, and Bank deposit references before crediting investor wallets.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F4E8]">
                <tr className="text-[#102542]/50 uppercase tracking-widest font-extrabold text-[9px]">
                  <th className="py-4 px-6">Investor</th>
                  <th className="py-4 px-4">Reference</th>
                  <th className="py-4 px-4">Amount</th>
                  <th className="py-4 px-4">Gateway</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Approve / Reject</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#102542]/5">
                {allDeposits.map(d => (
                  <tr key={d.id} className="hover:bg-[#F8F4E8]/60 transition-colors">
                    <td className="py-4 px-6 font-extrabold text-[#102542]">{d.full_name || 'Investor'}</td>
                    <td className="py-4 px-4 font-mono font-bold text-[#102542]/70">{d.reference_code}</td>
                    <td className="py-4 px-4 font-extrabold text-[#16A34A]">{formatUGX(d.amount)}</td>
                    <td className="py-4 px-4 text-[#102542]/70 font-semibold">{d.payment_method}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase ${
                        d.status === 'completed' ? 'bg-[#16A34A]/10 text-[#16A34A]' :
                        d.status === 'pending' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' : 'bg-[#DC2626]/10 text-[#DC2626]'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {d.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApproveTx(d.id, 'Deposit')}
                            className="px-3 py-1 rounded-xl bg-[#16A34A] text-white font-extrabold text-[10px] hover:bg-[#15803D]"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectTx(d.id, 'Deposit')}
                            className="px-3 py-1 rounded-xl bg-[#DC2626] text-white font-extrabold text-[10px] hover:bg-[#B91C1C]"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. WITHDRAWALS APPROVAL QUEUE TAB ──────────────────────────────────── */}
      {activeTab === 'withdrawals' && (
        <div className="bg-white rounded-4xl border border-[#102542]/8 shadow-soft overflow-hidden space-y-4">
          <div className="p-6 border-b border-[#102542]/8">
            <h3 className="text-base font-extrabold text-[#102542]">Withdrawal Approval Queue (Friday Gate)</h3>
            <p className="text-xs text-[#102542]/60 font-medium mt-0.5">Approve Mobile Money and Bank payout requests queued by investors.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F4E8]">
                <tr className="text-[#102542]/50 uppercase tracking-widest font-extrabold text-[9px]">
                  <th className="py-4 px-6">Investor</th>
                  <th className="py-4 px-4">Reference</th>
                  <th className="py-4 px-4">Amount</th>
                  <th className="py-4 px-4">Destination</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#102542]/5">
                {allWithdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-[#F8F4E8]/60 transition-colors">
                    <td className="py-4 px-6 font-extrabold text-[#102542]">{w.full_name || 'Investor'}</td>
                    <td className="py-4 px-4 font-mono font-bold text-[#102542]/70">{w.reference_code}</td>
                    <td className="py-4 px-4 font-extrabold text-[#DC2626]">{formatUGX(w.amount)}</td>
                    <td className="py-4 px-4 text-[#102542]/70 font-semibold">{w.payment_method}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase ${
                        w.status === 'completed' || w.status === 'approved' ? 'bg-[#16A34A]/10 text-[#16A34A]' :
                        w.status === 'pending' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' : 'bg-[#DC2626]/10 text-[#DC2626]'
                      }`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {w.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApproveTx(w.id, 'Withdrawal')}
                            className="px-3 py-1 rounded-xl bg-[#16A34A] text-white font-extrabold text-[10px] hover:bg-[#15803D]"
                          >
                            Approve Payout
                          </button>
                          <button
                            onClick={() => handleRejectTx(w.id, 'Withdrawal')}
                            className="px-3 py-1 rounded-xl bg-[#DC2626] text-white font-extrabold text-[10px] hover:bg-[#B91C1C]"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 6. PLANS MANAGER TAB ──────────────────────────────────────────────── */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#102542]">Active Investment Plans</h3>
              <p className="text-xs text-[#102542]/60 font-medium">Create or update investment tiers accessible to investors</p>
            </div>
            <button
              onClick={() => setPlanModal(true)}
              className="px-4 py-2 rounded-xl gradient-gold text-[#102542] font-extrabold text-xs shadow-glow-gold flex items-center gap-1.5"
            >
              <FiPlus /> New Plan
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {plans.map(p => (
              <div key={p.id} className="bg-white rounded-3xl p-6 border border-[#102542]/8 shadow-soft space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-[#102542] text-sm">{p.title}</h4>
                  <span className="text-xs font-extrabold text-[#16A34A] bg-[#16A34A]/10 px-2.5 py-0.5 rounded-full">{p.daily_return_percent}% / day</span>
                </div>
                <p className="text-xs text-[#102542]/60 font-medium">{p.description}</p>
                <div className="text-xs text-[#102542]/80 space-y-1 pt-2 border-t border-[#102542]/8 font-semibold">
                  <p>Duration: <strong>{p.duration_days} Days</strong></p>
                  <p>Min Capital: <strong>${p.min_investment}</strong></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 7. REPORTS GENERATOR TAB ───────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-4xl p-7 border border-[#102542]/8 shadow-soft space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#102542]">Financial Audit Reports</h3>
              <p className="text-xs text-[#102542]/60 font-medium">Export system financial metrics, investor ledger, and tax summaries.</p>
            </div>
            <button className="px-4 py-2 rounded-xl gradient-navy text-[#D4AF37] font-extrabold text-xs flex items-center gap-2">
              <FiDownload /> Download CSV Audit
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#F8F4E8] p-5 rounded-2xl border border-[#102542]/8 space-y-2">
              <FiFileText className="w-6 h-6 text-[#102542]" />
              <h4 className="text-xs font-extrabold text-[#102542]">Daily ROI Ledger</h4>
              <p className="text-[11px] text-[#102542]/60 font-medium">Complete record of automated 5% Mon–Fri profit distributions.</p>
            </div>
            <div className="bg-[#F8F4E8] p-5 rounded-2xl border border-[#102542]/8 space-y-2">
              <FiFileText className="w-6 h-6 text-[#D4AF37]" />
              <h4 className="text-xs font-extrabold text-[#102542]">Referral Salary Report</h4>
              <p className="text-[11px] text-[#102542]/60 font-medium">Detailed log of Level 1 (4%), Level 2 (3%), and Level 3 (2%) payouts.</p>
            </div>
            <div className="bg-[#F8F4E8] p-5 rounded-2xl border border-[#102542]/8 space-y-2">
              <FiFileText className="w-6 h-6 text-[#16A34A]" />
              <h4 className="text-xs font-extrabold text-[#102542]">Friday Withdrawal Audit</h4>
              <p className="text-[11px] text-[#102542]/60 font-medium">Reconciliation statement for all Mobile Money and Bank payouts.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. SETTINGS & RBAC TAB ────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-4xl p-7 border border-[#102542]/8 shadow-soft space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-[#102542]">Role-Based Access Control (RBAC) & Platform Parameters</h3>
            <p className="text-xs text-[#102542]/60 font-medium mt-0.5">Configure system parameters and security controls.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
            <div className="p-4 bg-[#F8F4E8] rounded-2xl border border-[#102542]/8 space-y-1">
              <p className="text-[10px] text-[#102542]/50 uppercase font-extrabold">Min Deposit Constraint</p>
              <p className="text-sm font-extrabold text-[#102542]">{formatUGX(RULES.MIN_INVEST)} ($20 USD)</p>
            </div>
            <div className="p-4 bg-[#F8F4E8] rounded-2xl border border-[#102542]/8 space-y-1">
              <p className="text-[10px] text-[#102542]/50 uppercase font-extrabold">Min Withdrawal Constraint</p>
              <p className="text-sm font-extrabold text-[#102542]">{formatUGX(RULES.MIN_WITHDRAW)} ($10 USD)</p>
            </div>
          </div>
        </div>
      )}

      {/* Plan Creation Modal */}
      <AnimatePresence>
        {planModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#102542]/75 backdrop-blur-sm">
            <div className="bg-white rounded-4xl p-7 sm:p-9 max-w-md w-full border border-[#102542]/10 shadow-soft-lg relative space-y-5">
              <button
                onClick={() => setPlanModal(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#F8F4E8] text-[#102542] flex items-center justify-center"
              >
                <FiX className="w-4 h-4" />
              </button>

              <h3 className="text-lg font-extrabold text-[#102542]">Publish Investment Tier</h3>

              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase mb-1">Plan Title</label>
                  <input
                    type="text"
                    required
                    value={planForm.title}
                    onChange={e => setPlanForm({ ...planForm, title: e.target.value })}
                    placeholder="e.g. Diamond VIP Plan"
                    className="w-full px-4 py-3 bg-[#F8F4E8] border border-[#102542]/12 rounded-2xl text-xs font-semibold text-[#102542]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase mb-1">Description</label>
                  <textarea
                    required
                    rows="2"
                    value={planForm.description}
                    onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
                    placeholder="Plan benefits summary..."
                    className="w-full px-4 py-3 bg-[#F8F4E8] border border-[#102542]/12 rounded-2xl text-xs font-semibold text-[#102542]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase mb-1">Daily ROI (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={planForm.daily_return_percent}
                      onChange={e => setPlanForm({ ...planForm, daily_return_percent: e.target.value })}
                      className="w-full px-4 py-3 bg-[#F8F4E8] border border-[#102542]/12 rounded-2xl text-xs font-semibold text-[#102542]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase mb-1">Duration (Days)</label>
                    <input
                      type="number"
                      required
                      value={planForm.duration_days}
                      onChange={e => setPlanForm({ ...planForm, duration_days: e.target.value })}
                      className="w-full px-4 py-3 bg-[#F8F4E8] border border-[#102542]/12 rounded-2xl text-xs font-semibold text-[#102542]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl gradient-gold text-[#102542] font-extrabold text-xs shadow-glow-gold hover:scale-[1.02] transition-all"
                >
                  Publish Plan Tier
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboardPage;
