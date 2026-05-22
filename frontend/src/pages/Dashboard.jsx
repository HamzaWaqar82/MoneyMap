import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, TrendingDown, PiggyBank, Percent, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

const COLORS = ['#10B981','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316','#6366F1','#06B6D4'];

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState(null);
  const [trend, setTrend] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

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
    ]).then(([s, c, t, a, tx, g]) => {
      setSummary(s.data);
      setCategories(c.data);
      setTrend(t.data);
      setAlerts(a.data?.alerts || []);
      setTransactions(tx.data?.transactions || []);
      setGoals(g.data?.goals || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner"></div><p>Loading dashboard...</p></div>;

  const fmt = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

  const catLabels = categories?.categories ? Object.keys(categories.categories) : [];
  const catData = catLabels.map(k => categories.categories[k].amount);
  const doughnutData = {
    labels: catLabels,
    datasets: [{ data: catData, backgroundColor: COLORS.slice(0, catLabels.length), borderWidth: 0, hoverOffset: 8 }],
  };
  const doughnutOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94A3B8', padding: 12, usePointStyle: true, pointStyleWidth: 8, font: { size: 11 } } } }, cutout: '70%' };

  const trendData = trend?.trend ? {
    labels: trend.trend.map(t => t.month?.substring(0, 3)),
    datasets: [
      { label: 'Income', data: trend.trend.map(t => t.income), borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#10B981' },
      { label: 'Expenses', data: trend.trend.map(t => t.expenses), borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#EF4444' },
    ],
  } : null;
  const lineOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94A3B8', usePointStyle: true, font: { size: 12 } } } }, scales: { x: { ticks: { color: '#64748B' }, grid: { color: 'rgba(148,163,184,0.06)' } }, y: { ticks: { color: '#64748B' }, grid: { color: 'rgba(148,163,184,0.06)' } } } };

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
          <div className="stat-value">{currency} {fmt(summary?.totalExpenses)}</div>
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
        <div className="card">
          <div className="card-header"><h3>Spending by Category</h3></div>
          <div style={{ height: 280 }}>
            {catLabels.length > 0 ? <Doughnut data={doughnutData} options={doughnutOptions} /> : <div className="empty-state"><p>No expense data this month</p></div>}
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
          <div className="card-header">
            <h3>Recent Transactions</h3>
            <Link to="/transactions" className="btn btn-ghost btn-sm">View All <ArrowRight size={14}/></Link>
          </div>
          {transactions.length > 0 ? transactions.map(tx => (
            <div key={tx._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{tx.category}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(tx.transactionDate).toLocaleDateString()}</div>
              </div>
              <span style={{ fontWeight: 600, color: tx.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                {tx.type === 'income' ? '+' : '-'}{currency} {fmt(tx.amount)}
              </span>
            </div>
          )) : <div className="empty-state"><p>No transactions yet</p></div>}
        </div>
        <div className="card">
          <div className="card-header">
            <h3>Active Goals</h3>
            <Link to="/goals" className="btn btn-ghost btn-sm">View All <ArrowRight size={14}/></Link>
          </div>
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
  );
}
