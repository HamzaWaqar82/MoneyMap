import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
    } catch (err) {
      if (err.details && Object.keys(err.details).length) setErrors(err.details);
      else toast.error(err.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="brand-content">
          <h1>💰 MoneyMap</h1>
          <p>Take control of your finances. Track expenses, manage budgets, set savings goals, and gain powerful insights — all in one beautiful dashboard.</p>
        </div>
      </div>
      <div className="auth-form-section">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Welcome back</h2>
          <p className="subtitle">Sign in to your account to continue</p>
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" className={`form-control ${errors.email ? 'error' : ''}`}
              placeholder="you@example.com" value={form.email}
              onChange={e => setForm({...form, email: e.target.value})} required />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input id="login-password" type={showPw ? 'text' : 'password'}
                className={`form-control ${errors.password ? 'error' : ''}`}
                placeholder="••••••••" value={form.password}
                onChange={e => setForm({...form, password: e.target.value})} required />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}>
                {showPw ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
            style={{ width: '100%' }}>
            <LogIn size={18} /> {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <p className="auth-link">Don't have an account? <Link to="/register">Create one</Link></p>
        </form>
      </div>
    </div>
  );
}
