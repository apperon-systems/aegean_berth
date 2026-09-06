import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try { setUser(await api('/auth/me')); } catch { setUser(null); }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const login = async (email, password) => {
    const u = await api('/auth/login', { method: 'POST', body: { email, password } });
    setUser(u); return u;
  };
  const register = async (body) => {
    const u = await api('/auth/register', { method: 'POST', body });
    setUser(u); return u;
  };
  const logout = async () => { await api('/auth/logout', { method: 'POST' }); setUser(null); };

  return <AuthContext.Provider value={{ user, loading, refresh, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
