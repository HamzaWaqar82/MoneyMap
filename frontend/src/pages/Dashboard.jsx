import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, TrendingDown, PiggyBank, Percent, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState(null);
  const [trend, setTrend] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txTab, setTxTab] = useState('recent'); // 'recent' | 'review'

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const currency = user?.currencyPreference || 'PKR';

  useEffect(() => {
    Promise.all([
      api.get(`/reports/monthly-summary?month=${currentMonth}`).catch(() => ({ data: null })),
      api.get(`/reports/category-breakdown?month=${currentMonth}`).catch(() => ({ data: null })),
      api.get('/reports/income-expense-trend?months=6').catch(() => ({ data: null })),
      api.get('/reports/alerts').catch(() => ({ data: { alerts: [] } })),
      api.get('/transactions?limit=5').catch(() => ({ data: { transactions: [] } })),
      api.get('/goals?status=active').catch(() => ({ data: { goals: [] } })),
      api.get('/expense-tracker/review-queue').catch(() => ({ data: { transactions: [] } })),
      api.get('/categories').catch(() => ({ data: { categories: [] } })),
    ]).then(([s, c, t, a, tx, g, rq, ac]) => {
      setSummary(s.data);
      setCategories(c.data);
      setTrend(t.data);
      setAlerts(a.data?.alerts || []);
      setTransactions(tx.data?.transactions || []);
      setGoals(g.data?.goals || []);
      setReviewQueue(rq.data?.transactions || []);
      setAllCategories(ac.data?.categories || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleCorrectCategory = async (txnId, newCategory) => {
    try {
      await api.put(`/expense-tracker/review/${txnId}`, { categoryName: newCategory });
      toast.success('Category corrected');
      setReviewQueue(prev => prev.filter(t => (t._id || t.id) !== txnId));
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div><p>Loading dashboard...</p></div>;

  const fmt = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

  const trendData = trend?.trend ? {
    labels: trend.trend.map(t => t.month?.substring(0, 3)),
    datasets: [
      { label: 'Income', data: trend.trend.map(t => t.income), borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#10B981' },
      { label: 'Expenses', data: trend.trend.map(t => t.expenses), borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#EF4444' },
    ],
  } : null;
  const lineOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94A3B8', usePointStyle: true, font: { size: 12 } } } }, scales: { x: { ticks: { color: '#64748B' }, grid: { color: 'rgba(148,163,184,0.06)' } }, y: { ticks: { color: '#64748B' }, grid: { color: 'rgba(148,163,184,0.06)' } } } };

  const catLabels = categories?.categories ? Object.keys(categories.categories) : [];
  const totalExpense = summary?.totalExpenses || 0;

  return (
    <div className="fade-in">
      <div className="stats-grid">
        <div className="stat-card income">
          <div className="stat-icon"><TrendingUp size={22} /></div>
          <div className="stat-label">Total Income</div>
          <div className="stat-value">{currency} {fmt(summary?.totalIncome)}</div>
          <div className="stat-sub">{summary?.transactionCount?.income || 0} transactions</div>
        </div>
        <div className="stat-card expense">
          <div className="stat-icon"><TrendingDown size={22} /></div>
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value">{currency} {fmt(totalExpense)}</div>
          <div className="stat-sub">{summary?.transactionCount?.expense || 0} transactions</div>
        </div>
        <div className="stat-card savings">
          <div className="stat-icon"><PiggyBank size={22} /></div>
          <div className="stat-label">Net Savings</div>
          <div className="stat-value" style={{ color: (summary?.netSavings || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{currency} {fmt(summary?.netSavings)}</div>
          <div className="stat-sub">This month</div>
        </div>
        <div className="stat-card rate">
          <div className="stat-icon"><Percent size={22} /></div>
          <div className="stat-label">Savings Rate</div>
          <div className="stat-value">{summary?.savingsRate || '0%'}</div>
          <div className="stat-sub">Of income saved</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header"><h3>Category Breakdown</h3></div>
          <div className="category-breakdown-list" style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
            {catLabels.length > 0 ? catLabels.map((catName, i) => {
              const amount = categories.categories[catName].amount;
              const pct = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
              return (
                <div key={i} className="category-row">
                  <div className="category-row-info">
                    <span className="category-dot" style={{ background: `hsl(${i * 37}, 70%, 55%)` }}></span>
                    <span className="category-row-name">{catName}</span>
                  </div>
                  <div className="category-row-bar">
                    <div className="progress-bar" style={{ flex: 1 }}>
                      <div className="progress-fill green" style={{ width: `${pct}%`, background: `hsl(${i * 37}, 70%, 55%)` }} />
                    </div>
                    <span className="category-row-amount">{currency} {fmt(amount)}</span>
                    <span className="category-row-pct">{pct}%</span>
                  </div>
                </div>
              );
            }) : <div className="empty-state"><p>No expense data this month</p></div>}
          </div>
        </div>
        
        <div className="card">
          <div className="card-header"><h3>Income vs Expenses Trend</h3></div>
          <div style={{ height: 280 }}>
            {trendData ? <Line data={trendData} options={lineOptions} /> : <div className="empty-state"><p>No trend data yet</p></div>}
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(245,158,11,0.3)' }}>
          <div className="card-header"><h3 style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={18} /> Budget Alerts</h3></div>
          {alerts.slice(0, 3).map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 14 }}>{a.message}</span>
              <span className={`badge-status ${a.severity}`}>{a.severity}</span>
            </div>
          ))}
        </div>
      )}

      <div className="charts-grid">
        <div className="card">
          <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none', gap: 16 }}>
              <button className={`tab-btn ${txTab === 'recent' ? 'active' : ''}`} onClick={() => setTxTab('recent')} style={{ fontSize: 16, fontWeight: 600, color: txTab === 'recent' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                Recent Transactions
              </button>
              <button className={`tab-btn ${txTab === 'review' ? 'active' : ''}`} onClick={() => setTxTab('review')} style={{ fontSize: 16, fontWeight: 600, color: txTab === 'review' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                Review Queue {reviewQueue.length > 0 && <span className="badge" style={{ marginLeft: 6, background: 'var(--danger)', color: 'white', padding: '2px 6px', borderRadius: 10, fontSize: 11 }}>{reviewQueue.length}</span>}
              </button>
            </div>
          </div>
          
          <div style={{ padding: 20 }}>
            {txTab === 'recent' && (
              <>
                {transactions.length > 0 ? transactions.map(tx => (
                  <div key={tx._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{tx.category}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(tx.transactionDate).toLocaleDateString()}</div>
                    </div>
                    <span style={{ fontWeight: 600, color: tx.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                      {tx.type === 'income' ? '+' : '-'}{currency} {fmt(tx.amount)}
                    </span>
                  </div>
                )) : <div className="empty-state"><p>No transactions yet</p></div>}
                <Link to="/transactions" className="btn btn-ghost btn-sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>View All <ArrowRight size={14}/></Link>
              </>
            )}

            {txTab === 'review' && (
              <>
                {reviewQueue.length === 0 ? (
                  <div className="empty-state" style={{ padding: 20 }}>
                    <CheckCircle size={32} style={{ color:'var(--success)', marginBottom:12 }}/>
                    <h3 style={{ fontSize: 16 }}>All clear!</h3>
                    <p style={{ fontSize: 13 }}>No transactions need category review</p>
                  </div>
                ) : (
                  reviewQueue.map(t => {
                    const txnId = t._id || t.id;
                    return (
                      <div key={txnId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <AlertTriangle size={14} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                            {t.description || t.category}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{currency} {fmt(t.amount)}</div>
                        </div>
                        <select className="form-control" style={{ padding: '4px 8px', fontSize: 13, minWidth: 130 }}
                          defaultValue="" onChange={e => { if (e.target.value) handleCorrectCategory(txnId, e.target.value); }}>
                          <option value="">Correct To...</option>
                          {allCategories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Active Goals</h3>
            <Link to="/goals" className="btn btn-ghost btn-sm">View All <ArrowRight size={14}/></Link>
          </div>
          <div style={{ padding: 20 }}>
            {goals.length > 0 ? goals.map(g => (
              <div key={g.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{g.title}</span>
                  <span style={{ fontSize: 13, color: 'var(--accent)' }}>{g.progressPercentage}%</span>
                </div>
                <div className="progress-bar">
                  <div className={`progress-fill ${g.progressPercentage >= 80 ? 'green' : g.progressPercentage >= 50 ? 'yellow' : 'green'}`}
                    style={{ width: `${g.progressPercentage}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  <span>{currency} {fmt(g.currentAmount)}</span>
                  <span>{currency} {fmt(g.targetAmount)}</span>
                </div>
              </div>
            )) : <div className="empty-state"><p>No active goals</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
