/**
 * KashWave Currency & Investment Utilities
 * Primary Local Currency: UGX (Ugandan Shilling)
 * Support: Mobile Money USSD code instructions
 */

/**
 * Format currency amount based on UGX (exclusively)
 */
export const formatCurrency = (amount, currency = 'UGX', compact = false) => {
  const num = parseFloat(amount || 0);
  if (compact && num >= 1_000_000) return `UGX ${(num / 1_000_000).toFixed(1)}M`;
  if (compact && num >= 1_000) return `UGX ${(num / 1_000).toFixed(0)}K`;
  return `UGX ${Math.round(num).toLocaleString('en-UG')}`;
};

export const formatUGX = (amount, compact = false) => formatCurrency(amount, 'UGX', compact);

// Kept for signature compatibility but outputs identity since we are exclusively UGX
export const convertCurrency = (amount) => {
  return parseFloat(amount || 0);
};

export const UGX_PER_USD = 3700; // Left as legacy scale constant if needed

/**
 * 5 KASHWAVE SAVING PLANS (UGX Fixed Table from prompt image)
 */
export const KASHWAVE_PLANS = [
  {
    id: 1,
    title: '10K Saving Plan',
    amount: 10000,
    ratePerDay: 5,
    amountPerDay: 500,
    durationDays: 60,
    totalReturn: 60000,
    bonus: 3000,
    salary: 10000,
    color: 'from-[#6366F1] to-[#8B5CF6]',
    badge: 'Starter Plan',
  },
  {
    id: 2,
    title: '20K Saving Plan',
    amount: 20000,
    ratePerDay: 5,
    amountPerDay: 1000,
    durationDays: 60,
    totalReturn: 120000,
    bonus: 3000,
    salary: 10000,
    color: 'from-[#B45309] to-[#D97706]',
    badge: 'Bronze Plan',
  },
  {
    id: 3,
    title: '50K Saving Plan',
    amount: 50000,
    ratePerDay: 5,
    amountPerDay: 2500,
    durationDays: 60,
    totalReturn: 300000,
    bonus: 3000,
    salary: 15000,
    color: 'from-[#6B7280] to-[#9CA3AF]',
    badge: 'Silver Plan',
  },
  {
    id: 4,
    title: '100K Saving Plan',
    amount: 100000,
    ratePerDay: 5,
    amountPerDay: 5000,
    durationDays: 60,
    totalReturn: 600000,
    bonus: 3000,
    salary: 50000,
    color: 'from-[#D4AF37] to-[#F59E0B]',
    badge: 'Gold Plan',
  },
  {
    id: 5,
    title: '300K Saving Plan',
    amount: 300000,
    ratePerDay: 5,
    amountPerDay: 15000,
    durationDays: 60,
    totalReturn: 1800000,
    bonus: 3000,
    salary: 60000,
    color: 'from-[#102542] to-[#1E3A5F]',
    badge: 'Diamond Plan',
  },
];

// Left empty as we consolidated only KASHWAVE_PLANS
export const CORE_USD_PLANS = [];

/**
 * Mobile Money & Payment Gateways (UGX / USSD priority)
 */
export const UG_GATEWAYS = [
  { id: 'MTN Mobile Money', label: 'MTN Mobile Money', sub: 'Dial *165#', ussd: '*165#', number: '0311 100 100' },
  { id: 'Airtel Money',     label: 'Airtel Money',     sub: 'Dial *185#', ussd: '*185#', number: '0800 186 186' },
  { id: 'Bank Transfer',    label: 'Bank Transfer',    sub: 'Manual Reference verify', ussd: null, number: 'KashWave Corp' },
];

export const RULES = {
  MIN_INVEST:    10000, // UGX (Matches photo starting tier)
  MIN_WITHDRAW:  10000, // UGX
  PROFIT_RATE:   5,
  DURATION_DAYS: 60,
  WELCOME_BONUS: 2000, // UGX
  REFERRAL_BONUS: 200, // UGX
  REFERRAL_L1:   4,
  REFERRAL_L2:   3,
  REFERRAL_L3:   2,
  EARNING_DAYS:  'Monday – Friday',
  WITHDRAW_DAY:  'Fridays only',
  CAPITAL_LOCK:  true,
  WITHDRAW_FEE_PERCENT: 1.0, // 1% dynamic withdrawal fee
};
