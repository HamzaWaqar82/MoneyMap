import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Plus, Edit3, Trash2, Clock, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Goals() {
  const { user } = useAuth();
  const currency = user?.currencyPreference || 'PKR';
  const [goals, setGoals] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [contribModal, setContribModal] = useState({ open: false, goal: null });
  const [form, setForm] = useState({ title: '', targetAmount: '', currentAmount: '0', deadline: '', reminderFrequency: 'none' });
  const [contribAmount, setContribAmount] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      let q = filter ? `?status=${filter}` : '';
      const res = await api.get(`/goals${q}`);
      setGoals(res.data.goals || []);
    } catch { toast.error('Failed to load goals'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGoals(); }, [filter]);

  const openCreate = () => { setForm({ title:'', targetAmount:'', currentAmount:'0', deadline:'', reminderFrequency:'none' }); setErrors({}); setModal({ open:true, mode:'create', data:null }); };
  const openEdit = (g) => { setForm({ title:g.title, targetAmount:g.targetAmount, deadline:g.deadline?.split('T')[0]||'', status:g.status, reminderFrequency:g.reminderFrequency||'none' }); setErrors({}); setModal({ open:true, mode:'edit', data:g }); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setErrors({});
    try {
      if (modal.mode === 'create') {
        await api.post('/goals', { title:form.title, targetAmount:parseFloat(form.targetAmount), currentAmount:parseFloat(form.currentAmount||0), deadline:form.deadline, reminderFrequency:form.reminderFrequency });
        toast.success('Goal created!');
      } else {
        const body = { title:form.title, targetAmount:parseFloat(form.targetAmount), deadline:form.deadline, reminderFrequency:form.reminderFrequency };
        if (form.status) body.status = form.status;
        await api.put(`/goals/${modal.data.id}`, body);
        toast.success('Goal updated!');
      }
      setModal({ open:false, mode:'create', data:null }); fetchGoals();
    } catch (err) {
      if (err.details) setErrors(err.details);
      else toast.error(err.message);
    } finally { setSaving(false); }
  };

  const handleContribute = async () => {
    setSaving(true);
    try {
      await api.put(`/goals/${contribModal.goal.id}/contribute`, { amount: parseFloat(contribAmount) });
      toast.success('Contribution added!');
      setContribModal({ open:false, goal:null }); setContribAmount(''); fetchGoals();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/goals/${deleteId}`); toast.success('Goal deleted'); setDeleteId(null); fetchGoals(); }
    catch (err) { toast.error(err.message); }
  };

  const fmt = (n) => new Intl.NumberFormat('en-US').format(n||0);
  const getColor = (p) => p >= 80 ? 'green' : p >= 50 ? 'yellow' : 'green';

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', gap:8 }}>
          {['','active','completed','abandoned'].map(s => (
            <button key={s} className={`tab-btn ${filter===s?'active':''}`} style={{ border:'1px solid var(--border)', borderRadius:20, padding:'6px 16px', marginBottom:0, borderBottom:'1px solid var(--border)' }}
              onClick={() => setFilter(s)}>{s || 'All'}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={18}/> New Goal</button>
      </div>

      {goals.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🎯</div><h3>No goals found</h3><p>Create a savings goal to get started</p></div>
      ) : (
        <div className="goals-grid">
          {goals.map(g => (
            <div key={g.id} className="card goal-card">
              <div className="goal-header">
                <div>
                  <h3 style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>{g.title}</h3>
                  <span className={`badge-status ${g.status}`}>{g.status}</span>
                </div>
                <div style={{ display:'flex', gap:4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(g)}><Edit3 size={15}/></button>
                  <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={() => setDeleteId(g.id)}><Trash2 size={15}/></button>
                </div>
              </div>
              <div style={{ fontSize:28, fontWeight:700, color:'var(--accent)', marginBottom:4 }}>{g.progressPercentage}%</div>
              <div className="progress-bar" style={{ height:10, marginBottom:8 }}>
                <div className={`progress-fill ${getColor(g.progressPercentage)}`} style={{ width:`${g.progressPercentage}%` }} />
              </div>
              <div className="goal-amounts">
                <span>{currency} {fmt(g.currentAmount)}</span>
                <span>of {currency} {fmt(g.targetAmount)}</span>
              </div>
              <div className="goal-deadline"><Clock size={14}/> {g.daysRemaining > 0 ? `${g.daysRemaining} days left` : 'Deadline passed'}</div>
              {g.status === 'active' && (
                <div className="goal-actions">
                  <button className="btn btn-primary btn-sm" style={{ flex:1 }} onClick={() => { setContribModal({ open:true, goal:g }); setContribAmount(''); }}>
                    <DollarSign size={14}/> Contribute
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal.open} onClose={() => setModal({open:false, mode:'create', data:null})}
        title={modal.mode === 'create' ? 'Create Goal' : 'Edit Goal'}
        footer={<><button className="btn btn-ghost" onClick={() => setModal({open:false,mode:'create',data:null})}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving?'Saving...':'Save'}</button></>}>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Title</label><input type="text" className={`form-control ${errors.title?'error':''}`} placeholder="e.g. New Laptop" value={form.title} onChange={e => setForm({...form,title:e.target.value})} required />{errors.title && <div className="form-error">{errors.title}</div>}</div>
          <div className="form-group"><label>Target Amount ({currency})</label><input type="number" step="0.01" min="0.01" className="form-control" value={form.targetAmount} onChange={e => setForm({...form,targetAmount:e.target.value})} required /></div>
          {modal.mode === 'create' && <div className="form-group"><label>Starting Amount ({currency})</label><input type="number" step="0.01" min="0" className="form-control" value={form.currentAmount} onChange={e => setForm({...form,currentAmount:e.target.value})} /></div>}
          <div className="form-group"><label>Deadline</label><input type="date" className="form-control" value={form.deadline} onChange={e => setForm({...form,deadline:e.target.value})} required /></div>
          <div className="form-group">
            <label>Reminder Frequency</label>
            <select className="form-control" value={form.reminderFrequency} onChange={e => setForm({...form,reminderFrequency:e.target.value})}>
              <option value="none">No reminders</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          {modal.mode === 'edit' && <div className="form-group"><label>Status</label><select className="form-control" value={form.status||''} onChange={e => setForm({...form,status:e.target.value})}><option value="active">Active</option><option value="completed">Completed</option><option value="abandoned">Abandoned</option></select></div>}
        </form>
      </Modal>

      <Modal isOpen={contribModal.open} onClose={() => setContribModal({open:false,goal:null})} title="Add Contribution"
        footer={<><button className="btn btn-ghost" onClick={() => setContribModal({open:false,goal:null})}>Cancel</button><button className="btn btn-primary" onClick={handleContribute} disabled={saving||!contribAmount}>{saving?'Adding...':'Add'}</button></>}>
        {contribModal.goal && <div>
          <p style={{color:'var(--text-muted)', marginBottom:16}}>Contributing to <strong>{contribModal.goal.title}</strong></p>
          <p style={{fontSize:13, color:'var(--text-muted)', marginBottom:16}}>Max: {currency} {fmt(contribModal.goal.targetAmount - contribModal.goal.currentAmount)}</p>
          <div className="form-group"><label>Amount ({currency})</label><input type="number" step="0.01" min="0.01" className="form-control" placeholder="0.00" value={contribAmount} onChange={e => setContribAmount(e.target.value)} autoFocus /></div>
        </div>}
      </Modal>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Goal"
        footer={<><button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete}>Delete</button></>}>
        <div className="confirm-body"><p>Are you sure?</p><p className="warning-text">This action cannot be undone.</p></div>
      </Modal>
    </div>
  );
}
