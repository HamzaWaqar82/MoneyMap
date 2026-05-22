import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('moneymap_token');
    const savedUser = localStorage.getItem('moneymap_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      api.get('/users/profile')
        .then(res => { setUser(res.data); localStorage.setItem('moneymap_user', JSON.stringify(res.data)); })
        .catch(() => { localStorage.removeItem('moneymap_token'); localStorage.removeItem('moneymap_user'); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('moneymap_token', res.data.token);
    localStorage.setItem('moneymap_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res;
  };

  const register = async (fullName, email, password, confirmPassword) => {
    const res = await api.post('/auth/register', { fullName, email, password, confirmPassword });
    localStorage.setItem('moneymap_token', res.data.token);
    localStorage.setItem('moneymap_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('moneymap_token');
    localStorage.removeItem('moneymap_user');
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('moneymap_user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
