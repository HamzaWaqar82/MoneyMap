import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await register(form.fullName, form.email, form.password, form.confirmPassword);
      toast.success('Account created! Welcome to MoneyMap 🎉');
    } catch (err) {
      if (err.details && Object.keys(err.details).length) setErrors(err.details);
      else toast.error(err.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const set = (field, val) => setForm({ ...form, [field]: val });

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="brand-content">
          <h1>💰 MoneyMap</h1>
          <p>Join thousands managing their finances smarter. Create your free account and start building a better financial future today.</p>
        </div>
      </div>
      <div className="auth-form-section">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Create account</h2>
          <p className="subtitle">Start your financial journey</p>
          <div className="form-group">
            <label htmlFor="reg-name">Full Name</label>
            <input id="reg-name" type="text" className={`form-control ${errors.fullName ? 'error' : ''}`}
              placeholder="John Doe" value={form.fullName} onChange={e => set('fullName', e.target.value)} required />
            {errors.fullName && <div className="form-error">{errors.fullName}</div>}
          </div>
          <div className="form-group">
            <label htmlFor="reg-email">Email</label>
            <input id="reg-email" type="email" className={`form-control ${errors.email ? 'error' : ''}`}
              placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>
          <div className="form-group">
            <label htmlFor="reg-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input id="reg-password" type={showPw ? 'text' : 'password'}
                className={`form-control ${errors.password ? 'error' : ''}`}
                placeholder="Min 8 chars, uppercase, lowercase, number" value={form.password}
                onChange={e => set('password', e.target.value)} required />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}>
                {showPw ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>
          <div className="form-group">
            <label htmlFor="reg-confirm">Confirm Password</label>
            <input id="reg-confirm" type="password"
              className={`form-control ${errors.confirmPassword ? 'error' : ''}`}
              placeholder="••••••••" value={form.confirmPassword}
              onChange={e => set('confirmPassword', e.target.value)} required />
            {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
            <UserPlus size={18} /> {loading ? 'Creating...' : 'Create Account'}
          </button>
          <p className="auth-link">Already have an account? <Link to="/login">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
