import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiTrendingUp, FiMenu, FiX, FiShield, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-[#F8F4E8]/90 backdrop-blur-md border-b border-[#102542]/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl gradient-navy flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform">
              <FiTrendingUp className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-[#102542]">KASH<span className="text-[#D4AF37]">WAVE</span></span>
              <span className="block text-[9px] tracking-widest text-[#102542]/60 font-bold uppercase">Online Investment</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-7 text-sm font-semibold text-[#102542]/80">
            <a href="#home" className="hover:text-[#D4AF37] transition-colors">Home</a>
            <a href="#about" className="hover:text-[#D4AF37] transition-colors">About</a>
            <a href="#plans" className="hover:text-[#D4AF37] transition-colors">Investment Plans</a>
            <a href="#why-us" className="hover:text-[#D4AF37] transition-colors">Why Choose Us</a>
            <a href="#faq" className="hover:text-[#D4AF37] transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-[#D4AF37] transition-colors">Contact</a>
          </div>

          {/* Right Action Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            {user ? (
              <Link
                to={user.role === 'admin' ? '/admin' : '/dashboard'}
                className="px-5 py-2.5 rounded-xl gradient-navy text-[#F8F4E8] font-bold text-sm shadow-soft hover:shadow-glow-navy hover:scale-[1.02] transition-all flex items-center gap-2"
              >
                Go to Dashboard <FiArrowRight className="text-[#D4AF37]" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-bold text-[#102542] hover:text-[#D4AF37] transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 rounded-xl gradient-gold text-[#102542] font-bold text-sm shadow-glow-gold hover:scale-[1.02] transition-all flex items-center gap-2"
                >
                  Register <FiArrowRight />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-[#102542] hover:text-[#D4AF37] rounded-xl bg-white border border-[#102542]/10 shadow-sm"
            >
              {mobileOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-b border-[#102542]/10 px-4 pt-4 pb-6 space-y-3 shadow-soft-lg animate-fade-in">
          <a
            href="#home"
            onClick={() => setMobileOpen(false)}
            className="block text-[#102542] hover:text-[#D4AF37] text-sm font-semibold py-1"
          >
            Home
          </a>
          <a
            href="#about"
            onClick={() => setMobileOpen(false)}
            className="block text-[#102542] hover:text-[#D4AF37] text-sm font-semibold py-1"
          >
            About
          </a>
          <a
            href="#plans"
            onClick={() => setMobileOpen(false)}
            className="block text-[#102542] hover:text-[#D4AF37] text-sm font-semibold py-1"
          >
            Investment Plans
          </a>
          <a
            href="#why-us"
            onClick={() => setMobileOpen(false)}
            className="block text-[#102542] hover:text-[#D4AF37] text-sm font-semibold py-1"
          >
            Why Choose Us
          </a>
          <a
            href="#faq"
            onClick={() => setMobileOpen(false)}
            className="block text-[#102542] hover:text-[#D4AF37] text-sm font-semibold py-1"
          >
            FAQ
          </a>
          <a
            href="#contact"
            onClick={() => setMobileOpen(false)}
            className="block text-[#102542] hover:text-[#D4AF37] text-sm font-semibold py-1"
          >
            Contact
          </a>

          <div className="pt-3 border-t border-[#102542]/10 flex flex-col gap-2.5">
            {user ? (
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center py-2.5 rounded-xl gradient-navy text-white font-bold text-sm shadow-soft"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center py-2.5 text-[#102542] border border-[#102542]/20 rounded-xl font-bold text-sm"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center py-2.5 gradient-gold text-[#102542] rounded-xl font-bold text-sm shadow-glow-gold"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
