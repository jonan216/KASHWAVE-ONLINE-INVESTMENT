import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiBell, FiCheck, FiCheckCircle, FiTrendingUp, FiArrowDownLeft,
  FiArrowUpRight, FiShield, FiInfo, FiX
} from 'react-icons/fi';

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'deposit',
    icon: FiArrowDownLeft,
    color: 'bg-[#16A34A]/15 text-[#16A34A]',
    title: 'Deposit Confirmed',
    body: 'Your deposit of $500.00 via USDT (TRC20) has been confirmed and credited to your wallet.',
    time: '2 minutes ago',
    read: false,
  },
  {
    id: 2,
    type: 'investment',
    icon: FiTrendingUp,
    color: 'bg-[#D4AF37]/15 text-[#D4AF37]',
    title: 'Daily ROI Credited',
    body: 'Your Gold Plan daily return of $175.00 has been credited to your available balance.',
    time: '1 hour ago',
    read: false,
  },
  {
    id: 3,
    type: 'withdrawal',
    icon: FiArrowUpRight,
    color: 'bg-[#F59E0B]/15 text-[#F59E0B]',
    title: 'Withdrawal Processing',
    body: 'Your withdrawal request of $250.00 is under review. Expected completion: 12–24 hours.',
    time: '3 hours ago',
    read: false,
  },
  {
    id: 4,
    type: 'security',
    icon: FiShield,
    color: 'bg-[#102542]/10 text-[#102542]',
    title: 'New Login Detected',
    body: 'A new login was detected from Chrome on Windows. If this was not you, secure your account immediately.',
    time: 'Yesterday',
    read: true,
  },
  {
    id: 5,
    type: 'info',
    icon: FiInfo,
    color: 'bg-[#6366F1]/10 text-[#6366F1]',
    title: 'New Investment Plans Available',
    body: 'We have upgraded our Diamond Tier — now offering 4.80% daily ROI for contracts above $15,000.',
    time: '2 days ago',
    read: true,
  },
];

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications(n => n.map(item => ({ ...item, read: true })));
  };

  const dismiss = (id) => {
    setNotifications(n => n.filter(item => item.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="max-w-2xl mx-auto space-y-6 pb-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#102542]">Notifications</h2>
          <p className="text-xs text-[#102542]/60 font-medium mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] text-xs font-extrabold hover:bg-[#D4AF37]/25 transition-all"
          >
            <FiCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-4xl p-14 text-center border border-[#102542]/8 shadow-soft space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-[#F8F4E8] flex items-center justify-center mx-auto">
              <FiBell className="w-7 h-7 text-[#102542]/30" />
            </div>
            <h3 className="text-sm font-extrabold text-[#102542]">No Notifications</h3>
            <p className="text-xs text-[#102542]/50 font-medium">You're all caught up. Activity updates will appear here.</p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((notif) => (
              <motion.div
                key={notif.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10, height: 0 }}
                transition={{ duration: 0.25 }}
                className={`bg-white rounded-2xl border p-5 flex items-start gap-4 transition-all hover:shadow-soft ${
                  notif.read ? 'border-[#102542]/8' : 'border-[#D4AF37]/30 shadow-soft'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${notif.color}`}>
                  <notif.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-xs font-extrabold text-[#102542] ${!notif.read ? '' : 'opacity-80'}`}>
                        {notif.title}
                        {!notif.read && (
                          <span className="ml-2 inline-block w-2 h-2 rounded-full bg-[#D4AF37] align-middle" />
                        )}
                      </p>
                      <p className="text-[10px] text-[#102542]/50 font-medium mt-0.5">{notif.time}</p>
                    </div>
                    <button
                      onClick={() => dismiss(notif.id)}
                      className="shrink-0 text-[#102542]/30 hover:text-[#DC2626] transition-colors p-0.5"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-[#102542]/70 font-medium leading-relaxed mt-1.5">{notif.body}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};

export default NotificationsPage;
