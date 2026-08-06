import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Layout/Navbar';
import Footer from '../components/Layout/Footer';
import ProfitCalculator from '../components/Dashboard/ProfitCalculator';
import api from '../services/api';
import {
  FiTrendingUp, FiShield, FiLock, FiDollarSign,
  FiUsers, FiAward, FiArrowRight, FiCheckCircle,
  FiChevronDown, FiZap, FiClock, FiStar, FiMail,
  FiPhone, FiSend, FiCheck, FiHeadphones, FiActivity
} from 'react-icons/fi';

// Framer Motion Animation Variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } }
};

// Animated counter hook
const useCountUp = (target, duration = 2000, start = false) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
};

const AnimatedStatCard = ({ prefix = '', value, suffix = '', label, sublabel, start }) => {
  const num = useCountUp(value, 2000, start);
  return (
    <motion.div
      variants={fadeIn}
      className="bg-white rounded-3xl p-6 border border-[#102542]/8 shadow-soft text-center hover:shadow-soft-lg transition-all"
    >
      <p className="text-3xl sm:text-4xl font-extrabold text-[#102542]">
        {prefix}{num.toLocaleString()}{suffix}
      </p>
      <p className="text-xs font-bold text-[#102542] mt-1">{label}</p>
      <p className="text-[10px] text-[#102542]/50 font-medium mt-0.5">{sublabel}</p>
    </motion.div>
  );
};

const LandingPage = () => {
  const [plans, setPlans] = useState([]);
  const [openFaq, setOpenFaq] = useState(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef(null);

  // Contact form state
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await api.get('/investments/plans');
        if (res.data.success && res.data.data.length > 0) {
          setPlans(res.data.data);
        } else {
          setPlans(fallbackPlans);
        }
      } catch (err) {
        setPlans(fallbackPlans);
      }
    };
    fetchPlans();
  }, []);

  const fallbackPlans = [
    {
      id: 1,
      title: 'Starter',
      daily_return_percent: 1.50,
      duration_days: 14,
       min_investment: 100,
      max_investment: 3100,
      risk_level: 'low',
      benefits: ['Daily Payouts', '24/7 Monitoring', 'Low Risk Index', 'Capital Returned']
    },
    {
      id: 2,
      title: 'Silver',
      daily_return_percent: 2.20,
      duration_days: 30,
       min_investment: 1000,
      max_investment: 4000,
      risk_level: 'medium',
      benefits: ['Daily Payouts', 'Dedicated Manager', 'Medium Risk Index', 'Capital Returned']
    },
    {
      id: 3,
      title: 'Gold',
      daily_return_percent: 3.50,
      duration_days: 45,
       min_investment: 5000,
      max_investment: 8000,
      risk_level: 'expert',
      benefits: ['High Yield Arbitrage', 'Priority 24/7 Desk', 'Premium Risk Hedging', 'Capital Returned']
    },
    {
      id: 4,
      title: 'Diamond',
      daily_return_percent: 5,
      duration_days: 60,
       min_investment: 15000,
      max_investment: 18000,
      risk_level: 'expert',
      benefits: ['Institutional Liquidity Access', 'Custom SLA', 'VIP Advisory', 'Full Capital Protection']
    }
  ];

  const displayPlans = plans.length > 0 ? plans : fallbackPlans;

  // Intersection observer for stats count-up
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setContactSubmitted(true);
      setContactForm({ name: '', email: '', subject: '', message: '' });
    }, 1000);
  };

  const faqs = [
    {
      q: 'How does KashWave generate consistent daily returns?',
      a: 'KashWave leverages algorithmic high-frequency arbitrage across global crypto liquidity pools, market-making, and institutional clean-energy assets to generate steady, automated daily ROI credited directly to investor balances.'
    },
    {
      q: 'What are the deposit and withdrawal minimums?',
      a: 'The minimum deposit starts at just $10, and withdrawals can be requested anytime your available balance reaches $20 or higher. Supported gateways include USDT (TRC20), Bitcoin, and Ethereum.'
    },
    {
      q: 'Is my invested capital secure?',
      a: 'Yes. 95% of platform asset reserves are stored in cold-storage multi-signature vaults. We enforce mandatory 2FA TOTP authentication, AES-256 encryption, and maintain a $50M Platform Reserve Guarantee.'
    },
    {
      q: 'When are daily ROI earnings credited?',
      a: 'Daily returns are calculated automatically every 24 hours from the exact timestamp your investment contract is deployed and credited straight into your main wallet balance.'
    },
    {
      q: 'How fast are withdrawal requests processed?',
      a: 'Once verified by our automated risk engine, withdrawal payouts are typically completed within 12–24 hours directly to your designated external wallet address.'
    }
  ];

  const testimonials = [
    {
      name: 'Marcus Vance',
      role: 'Private Equity Investor',
      avatar: 'MV',
      content: 'KashWave has transformed my passive income portfolio. The automated daily credits and transparent audit logs give me total peace of mind.',
      rating: 5
    },
    {
      name: 'Elena Rostova',
      role: 'Fintech Specialist',
      avatar: 'ER',
      content: 'The Gold tier arbitrage strategy consistently hits its daily ROI projections. Withdrawals are smooth, fast, and completely hassle-free.',
      rating: 5
    },
    {
      name: 'David Chen',
      role: 'Software Architect',
      avatar: 'DC',
      content: 'Institutional-grade security with a incredibly polished user experience. KashWave stands head and shoulders above other investment platforms.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8F4E8] text-[#102542] font-poppins selection:bg-[#D4AF37]/30">
      <Navbar />

      {/* ═══ 1. HERO SECTION ═══ */}
      <section id="home" className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 overflow-hidden bg-white">
        {/* Decorative background glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[550px] h-[550px] bg-[#D4AF37]/8 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-[450px] h-[450px] bg-[#102542]/5 rounded-full blur-2xl" />
        </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col items-center">
            {/* Left Content */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="space-y-7 text-center max-w-2xl"
            >
              <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-xs font-extrabold text-[#D4AF37] uppercase tracking-wider">
                <FiZap className="w-4 h-4" />
                Institutional Yield Strategy
              </motion.div>

              <motion.h1 variants={fadeIn} className="text-4xl sm:text-5xl xl:text-6xl font-extrabold text-[#102542] leading-[1.1] tracking-tight">
                Invest Smarter.<br />
                <span className="text-gradient-gold">Grow with Confidence.</span>
              </motion.h1>

              <motion.p variants={fadeIn} className="text-base text-[#102542]/70 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
                Empowering global investors with automated daily returns, institutional cold-storage security, and transparent yield management. Earn up to <strong className="text-[#102542] font-black">5% daily ROI</strong>.
              </motion.p>

              <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl gradient-gold text-[#102542] font-extrabold text-sm shadow-glow-gold hover:scale-[1.03] transition-all"
                >
                  Start Investing <FiArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#plans"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-[#F8F4E8] border border-[#102542]/15 text-[#102542] font-extrabold text-sm hover:bg-[#ECE3CE] transition-all"
                >
                  Explore Plans
                </a>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div variants={fadeIn} className="flex flex-wrap items-center justify-center gap-4 pt-3 text-xs text-[#102542]/70 font-semibold">
                <span className="flex items-center gap-1.5"><FiCheckCircle className="w-4 h-4 text-[#16A34A]" /> Zero Deposit Fees</span>
                <span className="flex items-center gap-1.5"><FiCheckCircle className="w-4 h-4 text-[#16A34A]" /> Daily Yield Payouts</span>
                <span className="flex items-center gap-1.5"><FiCheckCircle className="w-4 h-4 text-[#16A34A]" /> 2FA Protected</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ 2. STATISTICS SECTION ═══ */}
      <section ref={statsRef} className="py-16 bg-[#F8F4E8] border-t border-b border-[#102542]/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatedStatCard
              value={42800}
              suffix="+"
              label="Registered Investors"
              sublabel="Active account holders worldwide"
              start={statsVisible}
            />
            <AnimatedStatCard
              prefix="$"
              value={148}
              suffix="M+"
              label="Total Investments"
              sublabel="Assets currently under management"
              start={statsVisible}
            />
            <AnimatedStatCard
              prefix="$"
              value={64}
              suffix="M+"
              label="Completed Withdrawals"
              sublabel="Total earnings paid to investors"
              start={statsVisible}
            />
            <AnimatedStatCard
              value={12450}
              suffix="+"
              label="Active Plans"
              sublabel="Deployed contracts earning daily ROI"
              start={statsVisible}
            />
          </div>
        </div>
      </section>

      {/* ═══ 3. ABOUT SECTION ═══ */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            {/* Left Content */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="space-y-6"
            >
              <motion.span variants={fadeIn} className="text-xs font-extrabold uppercase tracking-widest text-[#D4AF37]">
                About KashWave
              </motion.span>

              <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-extrabold text-[#102542] leading-tight">
                Built on Integrity, Transparency, & Financial Empowerment
              </motion.h2>

              <motion.p variants={fadeIn} className="text-sm text-[#102542]/70 leading-relaxed font-medium">
                KashWave was founded with a singular mission: democratizing access to high-yield institutional investment strategies. By blending algorithmic market-making, crypto arbitrage, and clean-energy infrastructure funding, we provide consistent daily returns with uncompromised asset protection.
              </motion.p>

              <motion.div variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-[#F8F4E8] rounded-2xl p-4 border border-[#102542]/8">
                  <FiShield className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-xs font-extrabold text-[#102542]">Financial Integrity</h4>
                  <p className="text-[11px] text-[#102542]/60 mt-1 font-medium leading-relaxed">
                    Full audit logs, transparent reserve ratios, and real-time ledger accounting.
                  </p>
                </div>
                <div className="bg-[#F8F4E8] rounded-2xl p-4 border border-[#102542]/8">
                  <FiActivity className="w-6 h-6 text-[#16A34A] mb-2" />
                  <h4 className="text-xs font-extrabold text-[#102542]">Automated Yield</h4>
                  <p className="text-[11px] text-[#102542]/60 mt-1 font-medium leading-relaxed">
                    Continuous 24/7 return distribution credited directly to your balance.
                  </p>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Card / Visual */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={scaleIn}
              className="bg-[#102542] rounded-4xl p-8 sm:p-10 text-[#F8F4E8] relative overflow-hidden shadow-soft-lg space-y-6"
            >
              <div className="absolute top-0 right-0 w-60 h-60 bg-[#D4AF37]/10 rounded-full blur-2xl" />
              <div className="relative z-10 space-y-5">
                <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center shadow-glow-gold">
                  <FiAward className="w-7 h-7 text-[#102542]" />
                </div>
                <h3 className="text-2xl font-extrabold text-white">Empowering 42,000+ Global Capital Allocators</h3>
                <p className="text-xs text-[#F8F4E8]/70 leading-relaxed font-medium">
                  Whether you are starting with $100 or deploying $50,000+, KashWave delivers enterprise-grade yield optimization tailored to your growth trajectory.
                </p>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-bold text-[#D4AF37]">
                  <span>Quarterly Security Audit: PASSED</span>
                  <span>100% Reserve Backed</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ 4. INVESTMENT PLANS PREVIEW ═══ */}
      <section id="plans" className="py-20 bg-[#F8F4E8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center max-w-xl mx-auto mb-14 space-y-3"
          >
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#D4AF37]">Curated Growth Tiers</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#102542]">Investment Plans Preview</h2>
            <p className="text-xs text-[#102542]/60 font-medium leading-relaxed">
              Transparent tier structures offering daily ROI payouts, flexible lock-in periods, and complete capital return upon maturity.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {displayPlans.map((plan) => {
              const benefitsList = plan.benefits || ['Daily Payouts', '24/7 Monitoring', 'Capital Returned'];
              return (
                <motion.div
                  key={plan.id}
                  variants={fadeIn}
                  whileHover={{ y: -6 }}
                  className="bg-white rounded-4xl p-7 border border-[#102542]/8 shadow-soft flex flex-col justify-between hover:shadow-soft-lg transition-all duration-300 relative overflow-hidden"
                >
                  {plan.title === 'Gold' && (
                    <div className="absolute top-4 right-4 px-3 py-1 rounded-full gradient-gold text-[#102542] text-[9px] font-black uppercase tracking-wider shadow-glow-gold">
                      Most Popular
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <span className="text-[10px] text-[#D4AF37] font-extrabold uppercase tracking-widest">{plan.risk_level || 'Standard'} Risk</span>
                      <h3 className="text-xl font-extrabold text-[#102542] mt-0.5">{plan.title}</h3>
                    </div>

                    <div className="bg-[#F8F4E8] rounded-2xl p-4 border border-[#102542]/6 text-center">
                      <p className="text-3xl font-black text-[#102542]">{plan.daily_return_percent}%</p>
                      <p className="text-[10px] text-[#102542]/60 uppercase font-bold tracking-widest mt-0.5">Daily Expected Return</p>
                    </div>

                    <div className="space-y-2 text-xs font-semibold text-[#102542]/80">
                      <div className="flex justify-between border-b border-[#102542]/6 pb-2">
                        <span className="text-[#102542]/60">Minimum Investment:</span>
                        <strong className="text-[#102542]">UGX {plan.min_investment.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between border-b border-[#102542]/6 pb-2">
                        <span className="text-[#102542]/60">Maximum Investment:</span>
                        <strong className="text-[#102542]">UGX {plan.max_investment?.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between border-b border-[#102542]/6 pb-2">
                        <span className="text-[#102542]/60">Contract Duration:</span>
                        <strong className="text-[#D4AF37]">{plan.duration_days} Days</strong>
                      </div>
                    </div>

                    {/* Benefits List */}
                    <div className="space-y-2 pt-2">
                      <p className="text-[10px] text-[#102542]/60 uppercase font-extrabold tracking-widest">Included Benefits:</p>
                      <ul className="space-y-1.5 text-xs text-[#102542]/70 font-medium">
                        {benefitsList.map((b, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <FiCheckCircle className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <Link
                    to="/register"
                    className="mt-6 w-full py-3.5 rounded-2xl gradient-navy text-[#F8F4E8] text-center font-extrabold text-xs hover:shadow-glow-navy transition-all block"
                  >
                    Start {plan.title} Plan
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ═══ PROFIT CALCULATOR SECTION ═══ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ProfitCalculator plans={displayPlans} />
        </div>
      </section>

      {/* ═══ 5. WHY CHOOSE KASHWAVE SECTION ═══ */}
      <section id="why-us" className="py-20 bg-[#F8F4E8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center max-w-xl mx-auto mb-14 space-y-3"
          >
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#D4AF37]">Platform Excellence</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#102542]">Why Choose KashWave</h2>
            <p className="text-xs text-[#102542]/60 font-medium leading-relaxed">
              Designed from the ground up to offer unmatched security, lightning speed, and continuous client support.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: FiLock,
                title: 'Secure Investments',
                desc: '95% cold-storage reserves, mandatory TOTP 2FA, and AES-256 encrypted ledger security.'
              },
              {
                icon: FiZap,
                title: 'Fast Withdrawals',
                desc: 'Automated payout engine processes withdrawal requests directly to your wallet in < 24 hours.'
              },
              {
                icon: FiHeadphones,
                title: '24/7 Support',
                desc: 'Dedicated investor support desk available round-the-clock to assist with your portfolio.'
              },
              {
                icon: FiAward,
                title: 'Licensed Platform Placeholder',
                desc: 'Regulatory compliance standards & audited smart contract asset management protocol.'
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                whileHover={{ y: -4 }}
                className="bg-white rounded-4xl p-7 border border-[#102542]/8 shadow-soft hover:shadow-soft-lg transition-all"
              >
                <div className="w-12 h-12 rounded-2xl gradient-navy flex items-center justify-center mb-5 shadow-glow-navy">
                  <item.icon className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <h4 className="text-base font-extrabold text-[#102542] mb-2">{item.title}</h4>
                <p className="text-xs text-[#102542]/60 leading-relaxed font-medium">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 6. TESTIMONIALS SECTION ═══ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#D4AF37]">Investor Feedback</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#102542]">Trusted by Investors Global</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                className="bg-[#F8F4E8] rounded-4xl p-7 border border-[#102542]/8 space-y-4 relative"
              >
                <div className="flex items-center gap-1 text-[#D4AF37]">
                  {[...Array(t.rating)].map((_, r) => (
                    <FiStar key={r} className="w-4 h-4 fill-[#D4AF37]" />
                  ))}
                </div>
                <p className="text-xs text-[#102542]/70 leading-relaxed italic font-medium">"{t.content}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-[#102542]/8">
                  <div className="w-10 h-10 rounded-full gradient-navy text-[#D4AF37] flex items-center justify-center font-extrabold text-xs">
                    {t.avatar}
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-[#102542]">{t.name}</h5>
                    <p className="text-[10px] text-[#102542]/50 font-medium">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 7. FAQ SECTION ═══ */}
      <section id="faq" className="py-20 bg-[#F8F4E8]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#D4AF37]">Clear Answers</span>
            <h2 className="text-3xl font-extrabold text-[#102542]">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                  openFaq === idx ? 'border-[#D4AF37]/50 shadow-soft bg-white' : 'border-[#102542]/10 bg-white'
                }`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-4.5 flex items-center justify-between text-left font-extrabold text-sm text-[#102542]"
                >
                  <span>{faq.q}</span>
                  <FiChevronDown className={`w-4 h-4 shrink-0 ml-4 transition-transform duration-200 ${openFaq === idx ? 'rotate-180 text-[#D4AF37]' : 'text-[#102542]/40'}`} />
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="px-6 pb-5 text-xs text-[#102542]/70 leading-relaxed border-t border-[#102542]/6 pt-3 font-medium"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 8. CONTACT FORM SECTION ═══ */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#D4AF37]">Get in Touch</span>
            <h2 className="text-3xl font-extrabold text-[#102542]">Contact Our Support Team</h2>
            <p className="text-xs text-[#102542]/60 font-medium">Have questions regarding yield strategies or institutional accounts? Send us a message.</p>
          </div>

          <div className="bg-[#F8F4E8] rounded-4xl p-8 sm:p-10 border border-[#102542]/8 shadow-soft">
            {contactSubmitted ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#16A34A]/15 text-[#16A34A] flex items-center justify-center mx-auto">
                  <FiCheck className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-extrabold text-[#102542]">Message Received!</h3>
                <p className="text-xs text-[#102542]/60 font-medium max-w-md mx-auto">
                  Thank you for reaching out to KashWave. Our dedicated investor desk will respond to your inquiry within 24 hours.
                </p>
                <button
                  onClick={() => setContactSubmitted(false)}
                  className="px-6 py-2.5 rounded-xl gradient-navy text-[#F8F4E8] font-extrabold text-xs"
                >
                  Send Another Message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 bg-white border border-[#102542]/12 rounded-2xl text-xs font-semibold text-[#102542] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-1.5">Email Address</label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 bg-white border border-[#102542]/12 rounded-2xl text-xs font-semibold text-[#102542] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-1.5">Subject</label>
                  <input
                    type="text"
                    required
                    value={contactForm.subject}
                    onChange={e => setContactForm({ ...contactForm, subject: e.target.value })}
                    placeholder="General Inquiry / Plan Inquiry"
                    className="w-full px-4 py-3 bg-white border border-[#102542]/12 rounded-2xl text-xs font-semibold text-[#102542] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#102542]/70 uppercase tracking-widest mb-1.5">Message</label>
                  <textarea
                    required
                    rows="4"
                    value={contactForm.message}
                    onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="How can we assist your investment goals..."
                    className="w-full px-4 py-3 bg-white border border-[#102542]/12 rounded-2xl text-xs font-semibold text-[#102542] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-4 rounded-2xl gradient-navy text-[#F8F4E8] font-extrabold text-xs shadow-glow-navy hover:scale-[1.01] transition-transform flex items-center justify-center gap-2"
                >
                  {sending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSend className="w-4 h-4 text-[#D4AF37]" />}
                  {sending ? 'Sending Message...' : 'Submit Inquiry'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ═══ 9. BOTTOM CTA BANNER ═══ */}
      <section className="py-20 bg-[#102542] relative overflow-hidden text-[#F8F4E8]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#D4AF37]/8 rounded-full blur-2xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight">
            Ready to Start Building<br />
            <span className="text-gradient-gold">Automated Wealth?</span>
          </h2>
          <p className="text-xs text-[#F8F4E8]/70 max-w-xl mx-auto leading-relaxed font-medium">
            Join over 42,000+ investors who trust KashWave to grow their digital wealth with daily automated yields and institutional security.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl gradient-gold text-[#102542] font-extrabold text-xs shadow-glow-gold hover:scale-[1.03] transition-all"
            >
              Open Free Account <FiArrowRight />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-extrabold text-xs hover:bg-white/15 transition-all"
            >
              Client Login
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ 10. PROFESSIONAL FOOTER ═══ */}
      <Footer />
    </div>
  );
};

export default LandingPage;
