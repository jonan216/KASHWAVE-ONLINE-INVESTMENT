import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial profile on startup if token exists
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('kashwave_access_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.data.user);
            setWallet(res.data.data.wallet);
          }
        } catch (err) {
          console.error('Session restore failed:', err);
          localStorage.removeItem('kashwave_access_token');
          localStorage.removeItem('kashwave_refresh_token');
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const login = async (email, password, totpCode = null) => {
    const res = await api.post('/auth/login', { email, password, totp_code: totpCode });
    if (res.data.requires2FA) {
      return { requires2FA: true };
    }
    if (res.data.success) {
      const { accessToken, refreshToken, user: userData, wallet: walletData, welcome_bonus, csrfToken } = res.data.data;
      localStorage.setItem('kashwave_access_token', accessToken);
      localStorage.setItem('kashwave_refresh_token', refreshToken);
      if (csrfToken) localStorage.setItem('kashwave_csrf_token', csrfToken);
      setUser(userData);
      setWallet(walletData);
      if (welcome_bonus) {
        setTimeout(() => alert(`Welcome! UGX ${welcome_bonus.amount.toLocaleString()} bonus has been added to your wallet.`), 500);
      }
    }
    return res.data;
  };

  const register = async (fullName, email, password, referredByCode = null) => {
    const payload = { full_name: fullName, email, password };
    if (referredByCode) payload.referred_by_code = referredByCode;
    const res = await api.post('/auth/register', payload);
    if (res.data.success) {
      const { accessToken, refreshToken, user: userData, wallet: walletData, welcome_bonus, csrfToken } = res.data.data;
      localStorage.setItem('kashwave_access_token', accessToken);
      localStorage.setItem('kashwave_refresh_token', refreshToken);
      if (csrfToken) localStorage.setItem('kashwave_csrf_token', csrfToken);
      setUser(userData);
      setWallet(walletData);
      if (welcome_bonus) {
        setTimeout(() => alert(`Welcome! UGX ${welcome_bonus.amount.toLocaleString()} bonus has been added to your wallet.`), 500);
      }
    }
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('kashwave_access_token');
    localStorage.removeItem('kashwave_refresh_token');
    localStorage.removeItem('kashwave_csrf_token');
    setUser(null);
    setWallet(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.data.user);
        setWallet(res.data.data.wallet);
      }
    } catch (err) {
      console.error('Profile refresh failed:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, wallet, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
