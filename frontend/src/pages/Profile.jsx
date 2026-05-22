import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Save, Trash2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const CURRENCIES = ['PKR','USD','EUR','GBP','AUD'];

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const [form, setForm] = useState({ fullName: user?.fullName || '', currencyPreference: user?.currencyPreference || 'PKR' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [errors, setErrors] = useState({});

  const handleProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await api.put('/users/profile', { fullName: form.fullName, currencyPreference: form.currencyPreference });
      updateUser(res.data);
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handlePassword = async (e) => {
    e.preventDefault(); setPwSaving(true); setErrors({});
    try {
      await api.put('/users/profile', pwForm);
      toast.success('Password changed!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      if (err.details) setErrors(err.details);
      else toast.error(err.message);
    } finally { setPwSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.put('/users/account', { password: deletePassword });
      toast.success('Account deleted'); logout();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="fade-in profile-section">
      <div className="card">
        <div className="card-header"><h3>Profile Information</h3></div>
        <form onSubmit={handleProfile}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" className="form-control" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
          </div>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" className="form-control" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Currency</label>
            <select className="form-control" value={form.currencyPreference} onChange={e => setForm({...form, currencyPreference: e.target.value})}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}><Save size={16}/> {saving ? 'Saving...' : 'Save Changes'}</button>
        </form>
      </div>

      <div className="card">
        <div className="card-header"><h3 style={{ display:'flex', alignItems:'center', gap:8 }}><Shield size={18}/> Change Password</h3></div>
        <form onSubmit={handlePassword}>
          <div className="form-group">
            <label>Current Password</label>
            <input type="password" className={`form-control ${errors.currentPassword?'error':''}`} value={pwForm.currentPassword} onChange={e => setPwForm({...pwForm, currentPassword: e.target.value})} required />
            {errors.currentPassword && <div className="form-error">{errors.currentPassword}</div>}
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input type="password" className={`form-control ${errors.newPassword?'error':''}`} placeholder="Min 8 chars, uppercase, lowercase, number" value={pwForm.newPassword} onChange={e => setPwForm({...pwForm, newPassword: e.target.value})} required />
            {errors.newPassword && <div className="form-error">{errors.newPassword}</div>}
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input type="password" className={`form-control ${errors.confirmPassword?'error':''}`} value={pwForm.confirmPassword} onChange={e => setPwForm({...pwForm, confirmPassword: e.target.value})} required />
            {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={pwSaving}>{pwSaving ? 'Changing...' : 'Change Password'}</button>
        </form>
      </div>

      <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
        <div className="card-header"><h3 style={{ color: 'var(--danger)' }}>Danger Zone</h3></div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>Once you delete your account, there is no going back. Please be certain.</p>
        <button className="btn btn-danger" onClick={() => setDeleteModal(true)}><Trash2 size={16}/> Delete Account</button>
      </div>

      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Account"
        footer={<><button className="btn btn-ghost" onClick={() => setDeleteModal(false)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete} disabled={!deletePassword}>Delete Forever</button></>}>
        <div className="confirm-body">
          <p>This will permanently delete your account and all data.</p>
          <p className="warning-text" style={{ marginBottom: 16 }}>This cannot be undone!</p>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label>Enter your password to confirm</label>
            <input type="password" className="form-control" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} placeholder="Your password" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
