import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const EXPENSE_CATS = ['Food','Transport','Shopping','Utilities','Entertainment','Healthcare','Education','Rent','Insurance','Other Expense'];

export default function Budgets() {
  const { user } = useAuth();
  const currency = user?.currencyPreference || 'PKR';
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [form, setForm] = useState({ category: '', monthlyLimit: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/budgets?month=${month}`);
      setBudgets(res.data.budgets || []);
    } catch { toast.error('Failed to load budgets'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBudgets(); }, [month]);

  const openCreate = () => { setForm({ category: '', monthlyLimit: '' }); setErrors({}); setModal({ open: true, mode: 'create', data: null }); };
  const openEdit = (b) => { setForm({ category: b.category, monthlyLimit: b.monthlyLimit }); setErrors({}); setModal({ open: true, mode: 'edit', data: b }); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setErrors({});
    try {
      if (modal.mode === 'create') {
        await api.post('/budgets', { category: form.category, monthlyLimit: parseFloat(form.monthlyLimit), month });
        toast.success('Budget created!');
      } else {
        await api.put(`/budgets/${modal.data.id}`, { monthlyLimit: parseFloat(form.monthlyLimit) });
        toast.success('Budget updated!');
      }
      setModal({ open: false, mode: 'create', data: null }); fetchBudgets();
    } catch (err) {
      if (err.details) setErrors(err.details);
      else toast.error(err.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/budgets/${deleteId}`); toast.success('Budget deleted'); setDeleteId(null); fetchBudgets(); }
    catch (err) { toast.error(err.message); }
  };

  const fmt = (n) => new Intl.NumberFormat('en-US').format(n || 0);
  const getColor = (status) => status === 'exceeded' ? 'red' : status === 'warning' ? 'yellow' : 'green';
  const pct = (b) => b.monthlyLimit > 0 ? Math.min(100, Math.round((b.spentAmount / b.monthlyLimit) * 100)) : 0;

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <label style={{ fontSize:14, color:'var(--text-muted)' }}>Month:</label>
          <input type="month" className="form-control" style={{ width:'auto' }} value={month} onChange={e => setMonth(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={18}/> Add Budget</button>
      </div>

      {budgets.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📊</div><h3>No budgets for {month}</h3><p>Create a budget to start tracking your spending</p></div>
      ) : (
        <div className="budget-grid">
          {budgets.map(b => (
            <div key={b.id} className="card budget-card">
              <div className="budget-header">
                <div>
                  <h3 style={{ fontSize:16, fontWeight:600 }}>{b.category}</h3>
                  <span className={`badge-status ${b.status}`}>{b.status.replace('-',' ')}</span>
                </div>
                <div style={{ display:'flex', gap:4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(b)}><Edit3 size={15}/></button>
                  <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }} onClick={() => setDeleteId(b.id)}><Trash2 size={15}/></button>
                </div>
              </div>
              <div className="budget-amounts">
                <span className="spent">{currency} {fmt(b.spentAmount)} spent</span>
                <span className="limit">of {currency} {fmt(b.monthlyLimit)}</span>
              </div>
              <div className="progress-bar">
                <div className={`progress-fill ${getColor(b.status)}`} style={{ width: `${pct(b)}%` }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:12, color:'var(--text-muted)' }}>
                <span>{pct(b)}% used</span>
                <span>{currency} {fmt(b.remainingAmount)} remaining</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal.open} onClose={() => setModal({open:false, mode:'create', data:null})}
        title={modal.mode === 'create' ? 'Create Budget' : 'Edit Budget'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal({open:false, mode:'create', data:null})}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </>}>
        <form onSubmit={handleSubmit}>
          {modal.mode === 'create' && (
            <div className="form-group">
              <label>Category</label>
              <select className={`form-control ${errors.category?'error':''}`} value={form.category} onChange={e => setForm({...form, category:e.target.value})} required>
                <option value="">Select category</option>
                {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <div className="form-error">{errors.category}</div>}
            </div>
          )}
          <div className="form-group">
            <label>Monthly Limit ({currency})</label>
            <input type="number" step="0.01" min="0.01" className={`form-control ${errors.monthlyLimit?'error':''}`}
              placeholder="5000" value={form.monthlyLimit} onChange={e => setForm({...form, monthlyLimit:e.target.value})} required />
            {errors.monthlyLimit && <div className="form-error">{errors.monthlyLimit}</div>}
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Budget"
        footer={<><button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></>}>
        <div className="confirm-body"><p>Are you sure?</p><p className="warning-text">This action cannot be undone.</p></div>
      </Modal>
    </div>
  );
}
