import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Save, Trash2, Shield, Bell, BellOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePushNotifications } from '../hooks/usePushNotifications';

const CURRENCIES = ['PKR','USD','EUR','GBP','AUD'];

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const [form, setForm] = useState({ fullName: user?.fullName || '', currencyPreference: user?.currencyPreference || 'PKR' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletionMode, setDeletionMode] = useState('scheduled');
  const [errors, setErrors] = useState({});
  const { supported, subscribed, loading: pushLoading, enable, disable, checkStatus } = usePushNotifications();

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const handlePushToggle = async () => {
    try {
      if (subscribed) {
        await disable();
        toast.success('Browser notifications disabled');
      } else {
        await enable();
        toast.success('Browser notifications enabled');
      }
    } catch (err) {
      toast.error(err.message || 'Could not update push notifications');
    }
  };

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

  const handleTestPush = async () => {
    try {
      const res = await api.post('/notifications/push/test', {});
      if (res.data?.pushSent) toast.success('Test push sent — check your system notifications');
      else toast.error('Push delivery failed. Try re-enabling notifications in Profile.');
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    try {
      const res = await api.deleteWithBody('/users/account', { password: deletePassword, deletionMode });
      if (res.data?.mode === 'scheduled') {
        toast.success('Account scheduled for deletion in 30 days. Log in before then to restore it.');
      } else {
        toast.success('Account and all data permanently deleted');
      }
      setDeleteModal(false);
      logout();
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
        <div className="card-header"><h3 style={{ display:'flex', alignItems:'center', gap:8 }}><Bell size={18}/> Browser Notifications</h3></div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
          Get real-time alerts when budgets are exceeded or large expenses are recorded. In-app notifications always appear on the Notifications page.
        </p>
        {!supported ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Push notifications are not supported in this browser.</p>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className={`btn ${subscribed ? 'btn-outline' : 'btn-primary'}`} onClick={handlePushToggle} disabled={pushLoading}>
              {subscribed ? <><BellOff size={16}/> Disable Push</> : <><Bell size={16}/> Enable Push Notifications</>}
            </button>
            {subscribed && (
              <button type="button" className="btn btn-outline" onClick={handleTestPush} disabled={pushLoading}>
                Send Test Alert
              </button>
            )}
          </div>
        )}
        {supported && !subscribed && (
          <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 12 }}>
            Budget alerts appear in-app only until you enable push here.
          </p>
        )}
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
        footer={<><button className="btn btn-ghost" onClick={() => setDeleteModal(false)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete} disabled={!deletePassword}>{deletionMode === 'immediate' ? 'Delete Immediately' : 'Schedule Deletion'}</button></>}>
        <div className="confirm-body">
          <div className="form-group" style={{ textAlign: 'left', marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8 }}>Deletion option</label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="radio" name="deletionMode" value="scheduled" checked={deletionMode === 'scheduled'} onChange={() => setDeletionMode('scheduled')} />
              <span><strong>Schedule for 30 days</strong> — Your data is kept. Log in within 30 days to cancel deletion and restore your account.</span>
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', fontSize: 14 }}>
              <input type="radio" name="deletionMode" value="immediate" checked={deletionMode === 'immediate'} onChange={() => setDeletionMode('immediate')} />
              <span><strong>Delete immediately</strong> — Permanently removes your account, transactions, budgets, goals, and all other data now.</span>
            </label>
          </div>
          {deletionMode === 'immediate' && (
            <p className="warning-text" style={{ marginBottom: 16 }}>This cannot be undone!</p>
          )}
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label>Enter your password to confirm</label>
            <input type="password" className="form-control" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} placeholder="Your password" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
