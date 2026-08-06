import React from 'react';
import { Link } from 'react-router-dom';
import { FiTrendingUp, FiLock, FiGlobe, FiShield, FiMail, FiPhone } from 'react-icons/fi';

const Footer = () => {
  return (
    <footer className="bg-[#102542] text-[#F8F4E8] pt-16 pb-12 text-sm border-t border-[#D4AF37]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shadow-glow-gold">
                <FiTrendingUp className="w-6 h-6 text-[#102542]" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">KASH<span className="text-[#D4AF37]">WAVE</span></span>
            </Link>
            <p className="text-[#F8F4E8]/70 text-xs leading-relaxed font-normal">
              Kashwave Online Investment Platform delivers automated daily yield strategies, institutional asset management, and bank-grade security.
            </p>
            <div className="flex items-center gap-3 pt-2 text-[#D4AF37]">
              <span className="p-2 bg-[#0A182B] border border-[#102542] rounded-lg"><FiShield className="w-4 h-4" /></span>
              <span className="p-2 bg-[#0A182B] border border-[#102542] rounded-lg"><FiLock className="w-4 h-4" /></span>
              <span className="p-2 bg-[#0A182B] border border-[#102542] rounded-lg"><FiGlobe className="w-4 h-4" /></span>
            </div>
          </div>

          {/* Investment Tiers */}
          <div>
            <h4 className="text-[#D4AF37] font-bold text-base mb-4">Investment Tiers</h4>
            <ul className="space-y-2.5 text-xs text-[#F8F4E8]/80 font-medium">
              <li><a href="#plans" className="hover:text-[#D4AF37] transition-colors">Starter Yield (1.50%/day)</a></li>
              <li><a href="#plans" className="hover:text-[#D4AF37] transition-colors">Growth Accelerator (2.20%/day)</a></li>
              <li><a href="#plans" className="hover:text-[#D4AF37] transition-colors">Crypto Arbitrage Pro (3.50%/day)</a></li>
              <li><a href="#plans" className="hover:text-[#D4AF37] transition-colors">Institutional Wealth (5%/day)</a></li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-[#D4AF37] font-bold text-base mb-4">Navigation</h4>
            <ul className="space-y-2.5 text-xs text-[#F8F4E8]/80 font-medium">
              <li><Link to="/register" className="hover:text-[#D4AF37] transition-colors">Open Account</Link></li>
              <li><Link to="/login" className="hover:text-[#D4AF37] transition-colors">Client Portal Login</Link></li>
              <li><a href="#calculator" className="hover:text-[#D4AF37] transition-colors">Profit Calculator</a></li>
              <li><a href="#security" className="hover:text-[#D4AF37] transition-colors">Security & Audits</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[#D4AF37] font-bold text-base mb-4">Contact & Support</h4>
            <ul className="space-y-3 text-xs text-[#F8F4E8]/80">
              <li className="flex items-center gap-2">
                <FiMail className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>kashwavesupport99@gmail.com</span>
              </li>
              <li className="flex items-center gap-2">
                <FiPhone className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>+256 730 909078</span>
              </li>
              <li className="text-[11px] text-[#F8F4E8]/50 pt-2">
                Priority 24/7 dedicated support desk for all active investors.
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#F8F4E8]/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#F8F4E8]/60 font-medium">
          <p>© 2026 KASHWAVE ONLINE INVESTMENT PLATFORM. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-[#D4AF37] cursor-pointer">Privacy Policy</span>
            <span className="hover:text-[#D4AF37] cursor-pointer">Terms of Service</span>
            <span className="hover:text-[#D4AF37] cursor-pointer">Risk Disclosure</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
