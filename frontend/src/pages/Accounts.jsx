import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { Plus, Trash2, Building2, Wallet, CreditCard, Banknote, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const PROVIDERS_BY_TYPE = {
  bank: ['HBL','Meezan Bank','UBL','MCB','Allied Bank','Askari Bank','Bank Alfalah','Faysal Bank','Standard Chartered'],
  wallet: ['JazzCash','Easypaisa','SadaPay','NayaPay','Zindigi'],
  card: ['Visa', 'Mastercard', 'UnionPay', 'PayPak'],
  cash: ['Cash']
};
const TYPES = ['bank','wallet','card','cash'];
const TYPE_ICONS = { bank: Building2, wallet: Wallet, card: CreditCard, cash: Banknote };

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'bank', provider: '', currency: 'PKR' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data.accounts || []);
    } catch { toast.error('Failed to load accounts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setForm({ ...form, type: newType, provider: '' }); // Reset provider when type changes
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setErrors({});
    try {
      await api.post('/accounts', form);
      toast.success('Account created!');
      setModal(false);
      setForm({ name: '', type: 'bank', provider: '', currency: 'PKR' });
      fetchAccounts();
    } catch (err) {
      if (err.details) setErrors(err.details);
      else toast.error(err.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/accounts/${deleteId}`);
      toast.success('Account deactivated');
      setDeleteId(null);
      fetchAccounts();
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  const currentProviders = [...(PROVIDERS_BY_TYPE[form.type] || []), 'Other'];

  return (
    <div className="fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <p style={{ color:'var(--text-muted)', fontSize:14 }}>{accounts.length} account{accounts.length !== 1 ? 's' : ''} connected</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={18}/> Add Account</button>
      </div>

      {accounts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏦</div>
          <h3>No accounts yet</h3>
          <p>Add your bank account, wallet or card to start importing statements</p>
        </div>
      ) : (
        <div className="accounts-grid">
          {accounts.map(acc => {
            const Icon = TYPE_ICONS[acc.type] || Building2;
            return (
              <div key={acc.id || acc._id} className="card account-card">
                <div className="account-card-header">
                  <div className="account-icon-wrap">
                    <Icon size={22} />
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }} onClick={() => setDeleteId(acc.id || acc._id)}>
                    <Trash2 size={15}/>
                  </button>
                </div>
                <h3 className="account-name">{acc.name}</h3>
                <div className="account-meta">
                  <span className={`badge-type ${acc.type}`}>{acc.type}</span>
                  <span style={{ color:'var(--text-muted)', fontSize:13 }}>{acc.provider}</span>
                </div>
                {acc.maskedNumber && <p className="account-number">{acc.maskedNumber}</p>}
                <div className="account-footer">
                  <span>{acc.currency || 'PKR'}</span>
                  {acc.lastImportDate && (
                    <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <RefreshCw size={12}/> {new Date(acc.lastImportDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add Account"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Create'}</button>
        </>}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Account Name</label>
            <input className={`form-control ${errors.name?'error':''}`} placeholder="My HBL Salary"
              value={form.name} onChange={e => setForm({...form, name:e.target.value})} required />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>
          <div className="form-group">
            <label>Type</label>
            <select className="form-control" value={form.type} onChange={handleTypeChange}>
              {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Provider / Bank</label>
            <select className={`form-control ${errors.provider?'error':''}`} value={form.provider} onChange={e => setForm({...form, provider:e.target.value})} required>
              <option value="">Select provider</option>
              {currentProviders.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {errors.provider && <div className="form-error">{errors.provider}</div>}
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Deactivate Account"
        footer={<><button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Deactivate</button></>}>
        <div className="confirm-body"><p>Deactivate this account?</p><p className="warning-text">Existing transactions will be preserved.</p></div>
      </Modal>
    </div>
  );
}
