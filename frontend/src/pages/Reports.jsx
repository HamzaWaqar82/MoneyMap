import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler);
const COLORS = ['#10B981','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316','#6366F1','#06B6D4'];

export default function Reports() {
  const { user } = useAuth();
  const currency = user?.currencyPreference || 'PKR';
  const now = new Date();
  const [tab, setTab] = useState('summary');
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trendMonths, setTrendMonths] = useState(6);
  const fmt = (n) => new Intl.NumberFormat('en-US').format(n||0);
  const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94A3B8', usePointStyle: true, font: { size: 12 } } } }, scales: { x: { ticks: { color: '#64748B' }, grid: { color: 'rgba(148,163,184,0.06)' } }, y: { ticks: { color: '#64748B' }, grid: { color: 'rgba(148,163,184,0.06)' } } } };
  const doughnutOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94A3B8', padding: 10, usePointStyle: true, font: { size: 11 } } } }, cutout: '65%' };

  useEffect(() => {
    setLoading(true); setData(null);
    let p;
    if (tab === 'summary') p = api.get(`/reports/monthly-summary?month=${month}`);
    else if (tab === 'category') p = api.get(`/reports/category-breakdown?month=${month}`);
    else if (tab === 'budget') p = api.get(`/reports/budget-vs-actual?month=${month}`);
    else if (tab === 'trend') p = api.get(`/reports/income-expense-trend?months=${trendMonths}`);
    else p = Promise.resolve({ data: null });
    p.then(r => setData(r.data)).catch(() => setData(null)).finally(() => setLoading(false));
  }, [tab, month, trendMonths]);

  const tabs = [
    { id: 'summary', label: 'Monthly Summary' },
    { id: 'category', label: 'Category Breakdown' },
    { id: 'budget', label: 'Budget vs Actual' },
    { id: 'trend', label: 'Trend' },
  ];

  return (
    <div className="fade-in">
      <div className="tabs">
        {tabs.map(t => <button key={t.id} className={`tab-btn ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {tab !== 'trend' && (
        <div style={{ marginBottom: 20 }}>
          <input type="month" className="form-control" style={{ width: 'auto', display: 'inline-block' }} value={month} onChange={e => setMonth(e.target.value)} />
        </div>
      )}
      {tab === 'trend' && (
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: 14, color: 'var(--text-muted)' }}>Months:</label>
          <select className="form-control" style={{ width: 'auto' }} value={trendMonths} onChange={e => setTrendMonths(parseInt(e.target.value))}>
            {[3,6,9,12].map(n => <option key={n} value={n}>{n} months</option>)}
          </select>
        </div>
      )}

      {loading ? <div className="loading-page"><div className="spinner"></div></div> : !data ? (
        <div className="empty-state"><div className="empty-icon">📊</div><h3>No data available</h3><p>Add some transactions to see reports</p></div>
      ) : (
        <>
          {tab === 'summary' && (
            <div>
              <div className="stats-grid">
                <div className="stat-card income"><div className="stat-label">Total Income</div><div className="stat-value">{currency} {fmt(data.totalIncome)}</div><div className="stat-sub">{data.transactionCount?.income||0} transactions</div></div>
                <div className="stat-card expense"><div className="stat-label">Total Expenses</div><div className="stat-value">{currency} {fmt(data.totalExpenses)}</div><div className="stat-sub">{data.transactionCount?.expense||0} transactions</div></div>
                <div className="stat-card savings"><div className="stat-label">Net Savings</div><div className="stat-value" style={{color:(data.netSavings||0)>=0?'var(--success)':'var(--danger)'}}>{currency} {fmt(data.netSavings)}</div></div>
                <div className="stat-card rate"><div className="stat-label">Savings Rate</div><div className="stat-value">{data.savingsRate}</div></div>
              </div>
            </div>
          )}

          {tab === 'category' && data.categories && (() => {
            const labels = Object.keys(data.categories);
            const vals = labels.map(k => data.categories[k].amount);
            return (
              <div className="charts-grid">
                <div className="card"><div className="card-header"><h3>Expense Breakdown</h3></div><div style={{height:320}}>{labels.length > 0 ? <Doughnut data={{labels, datasets:[{data:vals, backgroundColor:COLORS.slice(0,labels.length), borderWidth:0}]}} options={doughnutOpts}/> : <p style={{color:'var(--text-muted)'}}>No expenses</p>}</div></div>
                <div className="card"><div className="card-header"><h3>Details</h3><span style={{fontSize:13, color:'var(--text-muted)'}}>Total: {currency} {fmt(data.totalExpenses)}</span></div>
                  {labels.map((k,i) => <div key={k} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)'}}><div style={{display:'flex', alignItems:'center', gap:10}}><div style={{width:10,height:10,borderRadius:'50%',background:COLORS[i%COLORS.length]}}/><span style={{fontSize:14}}>{k}</span></div><div style={{textAlign:'right'}}><div style={{fontWeight:600}}>{currency} {fmt(data.categories[k].amount)}</div><div style={{fontSize:12, color:'var(--text-muted)'}}>{data.categories[k].percentage}%</div></div></div>)}
                </div>
              </div>
            );
          })()}

          {tab === 'budget' && data.comparisons && (() => {
            const labels = Object.keys(data.comparisons);
            return labels.length === 0 ? <div className="empty-state"><h3>No budgets for this month</h3></div> : (
              <div>
                <div className="card" style={{marginBottom:24}}><div className="card-header"><h3>Budget vs Actual</h3></div><div style={{height:300}}>
                  <Bar data={{labels, datasets:[{label:'Budget',data:labels.map(k=>data.comparisons[k].budget),backgroundColor:'rgba(59,130,246,0.6)',borderRadius:6},{label:'Spent',data:labels.map(k=>data.comparisons[k].spent),backgroundColor:'rgba(239,68,68,0.6)',borderRadius:6}]}} options={{...chartOpts, plugins:{...chartOpts.plugins,legend:{labels:{color:'#94A3B8',usePointStyle:true}}}}} />
                </div></div>
                <div className="budget-grid">
                  {labels.map(k => { const c = data.comparisons[k]; return (
                    <div key={k} className="card budget-card">
                      <div className="budget-header"><h3 style={{fontSize:15, fontWeight:600}}>{k}</h3><span className={`badge-status ${c.status}`}>{c.status.replace('-',' ')}</span></div>
                      <div className="budget-amounts"><span className="spent">{currency} {fmt(c.spent)} spent</span><span className="limit">of {currency} {fmt(c.budget)}</span></div>
                      <div className="progress-bar"><div className={`progress-fill ${c.status==='exceeded'?'red':c.status==='warning'?'yellow':'green'}`} style={{width:`${Math.min(100,c.usagePercentage)}%`}}/></div>
                      <div style={{fontSize:12,color:'var(--text-muted)',marginTop:6}}>{c.usagePercentage}% used · {c.transactionCount} transactions</div>
                    </div>
                  );})}
                </div>
              </div>
            );
          })()}

          {tab === 'trend' && data.trend && (() => {
            const labels = data.trend.map(t => t.month?.substring(0,3)+' '+t.year);
            return (
              <div className="card"><div className="card-header"><h3>Income vs Expense Trend</h3></div><div style={{height:350}}>
                <Line data={{labels, datasets:[
                  {label:'Income',data:data.trend.map(t=>t.income),borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.1)',tension:0.4,fill:true,pointRadius:5,pointBackgroundColor:'#10B981'},
                  {label:'Expenses',data:data.trend.map(t=>t.expenses),borderColor:'#EF4444',backgroundColor:'rgba(239,68,68,0.1)',tension:0.4,fill:true,pointRadius:5,pointBackgroundColor:'#EF4444'},
                  {label:'Net Savings',data:data.trend.map(t=>t.netSavings),borderColor:'#8B5CF6',borderDash:[5,5],tension:0.4,pointRadius:4,pointBackgroundColor:'#8B5CF6'},
                ]}} options={chartOpts} />
              </div></div>
            );
          })()}
        </>
      )}
    </div>
  );
}
