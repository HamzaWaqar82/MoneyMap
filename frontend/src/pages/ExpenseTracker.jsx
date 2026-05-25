import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, TrendingDown, PiggyBank, Percent, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExpenseTracker() {
  const { user } = useAuth();
  const currency = user?.currencyPreference || 'PKR';
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
  const [summary, setSummary] = useState(null);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('summary');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, revRes, catRes] = await Promise.all([
        api.get(`/expense-tracker/summary?month=${month}`).catch(() => ({ data: null })),
        api.get('/expense-tracker/review-queue').catch(() => ({ data: { transactions: [] } })),
        api.get('/categories').catch(() => ({ data: { categories: [] } })),
      ]);
      setSummary(sumRes.data);
      setReviewQueue(revRes.data.transactions || []);
      setCategories(catRes.data.categories || []);
    } catch { /* handled per-request */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [month]);

  const handleCorrect = async (txnId, newCategory) => {
    try {
      await api.put(`/expense-tracker/review/${txnId}`, { categoryName: newCategory });
      toast.success('Category corrected');
      setReviewQueue(prev => prev.filter(t => (t._id || t.id) !== txnId));
    } catch (err) { toast.error(err.message); }
  };

  const fmt = (n) => new Intl.NumberFormat('en-PK').format(n || 0);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  const totalIncome = summary?.totalIncomePaisas ? summary.totalIncomePaisas / 100 : 0;
  const totalExpense = summary?.totalExpensePaisas ? summary.totalExpensePaisas / 100 : 0;
  const savings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;

  return (
    <div className="fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div className="tabs" style={{ marginBottom:0, borderBottom:'none' }}>
          <button className={`tab-btn ${tab==='summary'?'active':''}`} onClick={() => setTab('summary')}>Summary</button>
          <button className={`tab-btn ${tab==='review'?'active':''}`} onClick={() => setTab('review')}>
            Review Queue {reviewQueue.length > 0 && <span className="badge" style={{ marginLeft:6 }}>{reviewQueue.length}</span>}
          </button>
        </div>
        <input type="month" className="form-control" style={{ width:'auto' }} value={month} onChange={e => setMonth(e.target.value)} />
      </div>

      {tab === 'summary' && (
        <>
          <div className="stats-grid">
            <div className="stat-card income">
              <div className="stat-icon"><TrendingUp size={22}/></div>
              <div className="stat-label">Total Income</div>
              <div className="stat-value">{currency} {fmt(totalIncome)}</div>
            </div>
            <div className="stat-card expense">
              <div className="stat-icon"><TrendingDown size={22}/></div>
              <div className="stat-label">Total Expenses</div>
              <div className="stat-value">{currency} {fmt(totalExpense)}</div>
            </div>
            <div className="stat-card savings">
              <div className="stat-icon"><PiggyBank size={22}/></div>
              <div className="stat-label">Net Savings</div>
              <div className="stat-value" style={{ color: savings >= 0 ? 'var(--success)' : 'var(--danger)' }}>{currency} {fmt(Math.abs(savings))}</div>
            </div>
            <div className="stat-card rate">
              <div className="stat-icon"><Percent size={22}/></div>
              <div className="stat-label">Savings Rate</div>
              <div className="stat-value">{savingsRate}%</div>
            </div>
          </div>

          {summary?.categoryBreakdown && summary.categoryBreakdown.length > 0 && (
            <div className="card" style={{ marginTop:20 }}>
              <div className="card-header"><h3>Category Breakdown</h3></div>
              <div className="category-breakdown-list">
                {summary.categoryBreakdown.map((cat, i) => {
                  const amount = (cat.totalPaisas || 0) / 100;
                  const pct = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
                  return (
                    <div key={i} className="category-row">
                      <div className="category-row-info">
                        <span className="category-dot" style={{ background: `hsl(${i * 37}, 70%, 55%)` }}></span>
                        <span className="category-row-name">{cat._id || cat.category}</span>
                      </div>
                      <div className="category-row-bar">
                        <div className="progress-bar" style={{ flex:1 }}>
                          <div className="progress-fill green" style={{ width:`${pct}%`, background:`hsl(${i*37},70%,55%)` }}/>
                        </div>
                        <span className="category-row-amount">{currency} {fmt(amount)}</span>
                        <span className="category-row-pct">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(!summary || (!summary.categoryBreakdown?.length && totalIncome === 0 && totalExpense === 0)) && (
            <div className="empty-state" style={{ marginTop:20 }}>
              <div className="empty-icon">📊</div>
              <h3>No data for {month}</h3>
              <p>Import a bank statement to see your expense summary</p>
            </div>
          )}
        </>
      )}

      {tab === 'review' && (
        <div className="card">
          <div className="card-header"><h3>Transactions Needing Review</h3></div>
          {reviewQueue.length === 0 ? (
            <div className="empty-state" style={{ padding:40 }}>
              <CheckCircle size={40} style={{ color:'var(--success)', marginBottom:12 }}/>
              <h3>All clear!</h3><p>No transactions need category review</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Current Category</th><th>Correct To</th></tr></thead>
                <tbody>
                  {reviewQueue.map(t => {
                    const txnId = t._id || t.id;
                    return (
                      <tr key={txnId}>
                        <td style={{ whiteSpace:'nowrap' }}>{new Date(t.transactionDate).toLocaleDateString()}</td>
                        <td style={{ maxWidth:250, overflow:'hidden', textOverflow:'ellipsis' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <AlertTriangle size={14} style={{ color:'var(--warning)', flexShrink:0 }}/>
                            {t.description}
                          </div>
                        </td>
                        <td style={{ fontWeight:600 }}>{currency} {fmt(t.amount)}</td>
                        <td><span className="badge-type expense">{t.category}</span></td>
                        <td>
                          <select className="form-control" style={{ padding:'4px 8px', fontSize:13, minWidth:140 }}
                            defaultValue="" onChange={e => { if (e.target.value) handleCorrect(txnId, e.target.value); }}>
                            <option value="">Select...</option>
                            {categories.map(c => <option key={c._id} value={c.name}>{c.icon} {c.name}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
