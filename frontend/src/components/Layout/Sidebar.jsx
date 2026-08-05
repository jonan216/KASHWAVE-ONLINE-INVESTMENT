import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiPieChart, FiTrendingUp, FiBriefcase, FiArrowDownLeft,
  FiArrowUpRight, FiList, FiShield, FiLogOut, FiUsers,
  FiSettings, FiCheckSquare, FiBell, FiGift, FiLock, FiCreditCard
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ onClose }) => {
  const { user, logout, wallet } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userNavItems = [
    { label: 'Dashboard',        path: '/dashboard',                  icon: FiPieChart },
    { label: 'Wallet',           path: '/dashboard/wallet',           icon: FiCreditCard },
    { label: 'Investment Plans', path: '/dashboard/plans',            icon: FiTrendingUp },
    { label: 'My Investments',   path: '/dashboard/my-investments',   icon: FiBriefcase },
    { label: 'Deposit',          path: '/dashboard/deposit',          icon: FiArrowDownLeft },
    { label: 'Withdraw',         path: '/dashboard/withdraw',         icon: FiArrowUpRight },
    { label: 'Transactions',     path: '/dashboard/transactions',     icon: FiList },
    { label: 'Notifications',    path: '/dashboard/notifications',    icon: FiBell,  badge: 3 },
    { label: 'Referral',         path: '/dashboard/referral',         icon: FiGift },
    { label: 'Profile',          path: '/dashboard/profile',          icon: FiUsers },
    { label: 'Security',         path: '/dashboard/security',         icon: FiLock },
  ];

  const adminNavItems = [
    { label: 'Admin Console',  path: '/admin',               icon: FiPieChart },
    { label: 'Approval Queue', path: '/admin/transactions',  icon: FiCheckSquare },
    { label: 'User Directory', path: '/admin/users',         icon: FiUsers },
    { label: 'Plan Manager',   path: '/admin/plans',         icon: FiSettings },
  ];

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'KW';
  const balance = parseFloat(wallet?.main_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <aside className="w-64 bg-[#102542] text-[#F8F4E8] flex flex-col h-full select-none border-r border-white/5">
      {/* Brand Header */}
      <div className="h-20 flex items-center px-6 border-b border-white/10 shrink-0">
        <NavLink to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center shadow-glow-gold group-hover:scale-105 transition-transform">
            <FiTrendingUp className="w-5 h-5 text-[#102542]" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-white">KASH<span className="text-[#D4AF37]">WAVE</span></span>
            <span className="block text-[9px] tracking-widest text-[#D4AF37]/80 font-bold uppercase">Fintech Portal</span>
          </div>
        </NavLink>
      </div>

      {/* Quick Balance Pill */}
      <div className="mx-4 mt-5 bg-white/8 rounded-2xl px-4 py-3 border border-white/10">
        <p className="text-[9px] text-[#F8F4E8]/50 font-bold uppercase tracking-widest">Available Balance</p>
        <p className="text-lg font-extrabold text-[#D4AF37] mt-0.5">UGX {balance}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-0.5">
        <p className="px-3 text-[9px] font-extrabold text-[#F8F4E8]/40 uppercase tracking-widest mb-3">Main Menu</p>

        {userNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[11px] font-semibold transition-all duration-200 relative ${
                isActive
                  ? 'bg-[#D4AF37] text-[#102542] font-extrabold shadow-glow-gold'
                  : 'text-[#F8F4E8]/70 hover:text-white hover:bg-white/10'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#102542]' : ''}`} />
                <span className="flex-1">{item.label}</span>
                {item.badge && !isActive && (
                  <span className="w-5 h-5 rounded-full bg-[#DC2626] text-white text-[9px] font-extrabold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <div className="pt-5">
            <p className="px-3 text-[9px] font-extrabold text-[#D4AF37]/80 uppercase tracking-widest mb-3">Admin Controls</p>
            {adminNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[11px] font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-amber-400 text-[#102542] font-extrabold'
                      : 'text-[#F8F4E8]/70 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Logout Button */}
      <div className="px-3 pb-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[11px] font-semibold text-rose-300 hover:text-white hover:bg-rose-900/40 transition-all duration-200"
        >
          <FiLogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>

      {/* User Info Footer */}
      <div className="p-4 border-t border-white/10 bg-[#0A182B] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#D4AF37] text-[#102542] flex items-center justify-center font-extrabold shrink-0 text-xs">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{user?.full_name}</p>
            <p className="text-[10px] text-[#F8F4E8]/50 truncate font-medium">{user?.email}</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" title="Online" />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
