import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { FiMenu, FiX, FiDollarSign, FiCheckCircle, FiPlusCircle, FiArrowUpRight, FiBell } from 'react-icons/fi';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, wallet } = useAuth();

  return (
    <div className="flex h-screen bg-[#F8F4E8] text-[#102542] overflow-hidden font-poppins">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-[#102542]/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Premium White Header */}
        <header className="h-20 bg-white border-b border-[#102542]/10 shadow-soft flex items-center justify-between px-4 sm:px-8 shrink-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl bg-[#F8F4E8] text-[#102542] hover:bg-[#ECE3CE] border border-[#102542]/10 transition-colors"
            >
              {sidebarOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
            </button>
            <div>
              <h2 className="text-base font-bold text-[#102542]">
                Welcome back, <span className="text-[#D4AF37]">{user?.full_name?.split(' ')[0]}</span> 👋
              </h2>
              <p className="text-[11px] text-[#102542]/60 font-medium hidden sm:block">
                Account Status:{' '}
                <span className="text-[#16A34A] font-bold inline-flex items-center gap-1">
                  <FiCheckCircle className="w-3.5 h-3.5" /> Active & Verified
                </span>
              </p>
            </div>
          </div>

          {/* Right Header Section */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Balance Widget */}
            <div className="bg-[#F8F4E8] border border-[#102542]/10 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-soft">
              <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center">
                <FiDollarSign className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] text-[#102542]/60 uppercase font-bold tracking-widest">Available Balance</p>
                <p className="text-sm font-extrabold text-[#102542]">
                  UGX {parseFloat(wallet?.main_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/dashboard/deposit"
                className="px-4 py-2 rounded-xl gradient-gold text-[#102542] text-xs font-extrabold shadow-glow-gold hover:scale-[1.02] transition-all flex items-center gap-1.5"
              >
                <FiPlusCircle className="w-3.5 h-3.5" /> Deposit
              </Link>
              <Link
                to="/dashboard/withdraw"
                className="px-4 py-2 rounded-xl bg-white border border-[#102542]/15 text-[#102542] text-xs font-bold hover:bg-[#F8F4E8] transition-all flex items-center gap-1.5"
              >
                <FiArrowUpRight className="w-3.5 h-3.5" /> Withdraw
              </Link>
            </div>

            {/* Notifications Bell */}
            <button className="w-9 h-9 rounded-xl bg-[#F8F4E8] border border-[#102542]/10 flex items-center justify-center text-[#102542]/60 hover:text-[#102542] hover:bg-[#ECE3CE] transition-colors relative">
              <FiBell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D4AF37]"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
