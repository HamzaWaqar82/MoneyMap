import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import CSVImportTab from '../components/CSVImportTab';
import { Plus, Edit3, Trash2, ChevronLeft, ChevronRight, UploadCloud, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

const INCOME_CATS = ['Salary','Freelance','Investment','Bonus','Gift','Other Income'];
const EXPENSE_CATS = ['Food','Transport','Shopping','Utilities','Entertainment','Healthcare','Education','Rent','Insurance','Other Expense'];

export default function Transactions() {
  const { user } = useAuth();
  const currency = user?.currencyPreference || 'PKR';
  const [activeTab, setActiveTab] = useState('manual');
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ type: '', category: '', startDate: '', endDate: '' });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [form, setForm] = useState({ type: 'expense', amount: '', category: '', description: '', transactionDate: new Date().toISOString().split('T')[0], paymentMethod: 'cash', accountId: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    try {
      let q = `?page=${page}&limit=10`;
      if (filters.type) q += `&type=${filters.type}`;
      if (filters.category) q += `&category=${filters.category}`;
      if (filters.startDate) q += `&startDate=${filters.startDate}`;
      if (filters.endDate) q += `&endDate=${filters.endDate}`;
      const res = await api.get(`/transactions${q}`);
      setTransactions(res.data.transactions);
      setPagination(res.data.pagination);
    } catch (err) { toast.error('Failed to load transactions'); }
    finally { setLoading(false); }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data.accounts || []);
    } catch { /* silently fail */ }
  };

  useEffect(() => { 
    if (activeTab === 'manual') {
      fetchTransactions();
      fetchAccounts();
    }
  }, [activeTab]);

  const applyFilters = () => fetchTransactions(1);

  const openCreate = () => {
    setForm({ type: 'expense', amount: '', category: '', description: '', transactionDate: new Date().toISOString().split('T')[0], paymentMethod: 'cash', accountId: '' });
    setErrors({});
    setModal({ open: true, mode: 'create', data: null });
  };

  const openEdit = (tx) => {
    setForm({ type: tx.type, amount: tx.amount, category: tx.category, description: tx.description || '', transactionDate: tx.transactionDate?.split('T')[0] || '', paymentMethod: tx.paymentMethod || 'cash', accountId: tx.accountId || '' });
    setErrors({});
    setModal({ open: true, mode: 'edit', data: tx });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setErrors({});
    try {
      const body = { ...form, amount: parseFloat(form.amount) };
      if (!body.accountId) delete body.accountId;

      if (modal.mode === 'create') {
        await api.post('/transactions', body);
        toast.success('Transaction created!');
      } else {
        await api.put(`/transactions/${modal.data._id}`, body);
        toast.success('Transaction updated!');
      }
      setModal({ open: false, mode: 'create', data: null });
      fetchTransactions(pagination.page);
    } catch (err) {
      if (err.details) {
        setErrors(err.details);
        toast.error('Please check the form for errors');
      }
      else toast.error(err.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/transactions/${deleteId}`);
      toast.success('Transaction deleted');
      setDeleteId(null);
      fetchTransactions(pagination.page);
    } catch (err) { toast.error(err.message); }
  };

  const cats = form.type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  const allCats = [...INCOME_CATS, ...EXPENSE_CATS];
  const fmt = (n) => new Intl.NumberFormat('en-US').format(n);

  // Dynamic Account Filtering based on paymentMethod
  const filteredAccounts = accounts.filter(acc => {
    if (form.paymentMethod === 'bank_transfer') return acc.type === 'bank';
    if (form.paymentMethod === 'card') return acc.type === 'card';
    if (form.paymentMethod === 'wallet') return acc.type === 'wallet';
    if (form.paymentMethod === 'cash') return acc.type === 'cash';
    return true;
  });

  return (
    <div className="fade-in">
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => setActiveTab('manual')}>
          <Edit size={16}/> Manual Entry
        </button>
        <button className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`} onClick={() => setActiveTab('import')}>
          <UploadCloud size={16}/> Import CSV
        </button>
      </div>

      {activeTab === 'import' ? (
        <CSVImportTab />
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div></div>
            <button className="btn btn-primary" onClick={openCreate}><Plus size={18}/> Add Transaction</button>
          </div>

          <div className="filters-bar">
            <select className="form-control" value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select className="form-control" value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}>
              <option value="">All Categories</option>
              {allCats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="date" className="form-control" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
            <input type="date" className="form-control" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
            <button className="btn btn-outline btn-sm" onClick={applyFilters}>Apply</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ type:'', category:'', startDate:'', endDate:'' }); fetchTransactions(1); }}>Clear</button>
          </div>

          {loading ? <div className="loading-page"><div className="spinner"></div></div> : (
            <>
              <div className="table-container">
                <table>
                  <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Payment</th><th>Amount</th><th>Actions</th></tr></thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr><td colSpan="7" style={{textAlign:'center', padding:40, color:'var(--text-muted)'}}>No transactions found</td></tr>
                    ) : transactions.map(tx => (
                      <tr key={tx._id}>
                        <td>{new Date(tx.transactionDate).toLocaleDateString()}</td>
                        <td><span className={`badge-type ${tx.type}`}>{tx.type}</span></td>
                        <td>{tx.category}</td>
                        <td style={{color:'var(--text-muted)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{tx.description || '—'}</td>
                        <td style={{textTransform:'capitalize'}}>{tx.paymentMethod?.replace('_',' ')}</td>
                        <td style={{fontWeight:600, color: tx.type==='income'?'var(--success)':'var(--danger)'}}>
                          {tx.type==='income'?'+':'-'}{currency} {fmt(tx.amount)}
                        </td>
                        <td>
                          <div style={{display:'flex', gap:4}}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(tx)}><Edit3 size={15}/></button>
                            <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={() => setDeleteId(tx._id)}><Trash2 size={15}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="pagination">
                  <button disabled={pagination.page <= 1} onClick={() => fetchTransactions(pagination.page - 1)}><ChevronLeft size={16}/></button>
                  <span style={{fontSize:13, color:'var(--text-muted)'}}>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
                  <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchTransactions(pagination.page + 1)}><ChevronRight size={16}/></button>
                </div>
              )}
            </>
          )}

          <Modal isOpen={modal.open} onClose={() => setModal({open:false, mode:'create', data:null})}
            title={modal.mode === 'create' ? 'Add Transaction' : 'Edit Transaction'}
            footer={<>
              <button className="btn btn-ghost" onClick={() => setModal({open:false, mode:'create', data:null})}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </>}>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Type</label>
                <select className="form-control" value={form.type} onChange={e => setForm({...form, type: e.target.value, category: ''})}>
                  <option value="income">Income</option><option value="expense">Expense</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount ({currency})</label>
                <input type="number" step="0.01" min="0.01" className={`form-control ${errors.amount?'error':''}`} placeholder="0.00"
                  value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
                {errors.amount && <div className="form-error">{errors.amount}</div>}
              </div>
              <div className="form-group">
                <label>Category</label>
                <select className={`form-control ${errors.category?'error':''}`} value={form.category} onChange={e => setForm({...form, category: e.target.value})} required>
                  <option value="">Select category</option>
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <div className="form-error">{errors.category}</div>}
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <input type="text" className="form-control" placeholder="What was this for?" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" className="form-control" value={form.transactionDate} onChange={e => setForm({...form, transactionDate: e.target.value})} required />
              </div>
              
              <div className="form-group">
                <label>Payment Method</label>
                <select className="form-control" value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value, accountId: ''})}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="wallet">Mobile Wallet</option>
                </select>
              </div>
              
              {form.paymentMethod !== 'cash' && (
                <div className="form-group">
                  <label>Linked Account</label>
                  <select className="form-control" value={form.accountId} onChange={e => setForm({...form, accountId: e.target.value})}>
                    <option value="">None / Unlinked</option>
                    {filteredAccounts.map(a => (
                      <option key={a._id || a.id} value={a._id || a.id}>{a.name} ({a.provider})</option>
                    ))}
                  </select>
                  {filteredAccounts.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      No {form.paymentMethod.replace('_', ' ')} accounts found. <a href="/accounts" style={{ color: 'var(--accent)' }}>Create one</a>
                    </div>
                  )}
                </div>
              )}
            </form>
          </Modal>

          <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Transaction"
            footer={<>
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </>}>
            <div className="confirm-body">
              <p>Are you sure you want to delete this transaction?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
