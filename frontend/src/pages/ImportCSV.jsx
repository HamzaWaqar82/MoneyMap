import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { Upload, FileText, CheckCircle, AlertTriangle, ChevronRight, ChevronLeft, X } from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = ['Select & Upload', 'Review Transactions', 'Complete'];

export default function ImportCSV() {
  const [step, setStep] = useState(0);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    api.get('/accounts').then(r => setAccounts(r.data.accounts || [])).catch(() => {});
  }, []);

  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === 'dragenter' || e.type === 'dragover'); };
  const handleDrop = (e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]); };
  const handleFileChange = (e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); };

  const handleUpload = async () => {
    if (!selectedAccount || !file) { toast.error('Select an account and CSV file'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('csvFile', file);
      formData.append('accountId', selectedAccount);
      const res = await api.upload('/expense-tracker/import', formData);
      setParseResult(res.data);
      setStep(1);
      toast.success(`Parsed ${res.data.transactions.length} transactions from ${res.data.bank}`);
    } catch (err) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  const handleCategoryChange = (idx, newCat) => {
    setParseResult(prev => {
      const txns = [...prev.transactions];
      txns[idx] = { ...txns[idx], categoryName: newCat, confidence: 1.0 };
      return { ...prev, transactions: txns };
    });
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await api.post('/expense-tracker/import/confirm', {
        accountId: parseResult.accountId,
        transactions: parseResult.transactions.map(t => ({
          date: t.date, description: t.description, amountPaisas: t.amountPaisas,
          type: t.type, categoryName: t.categoryName, rawRef: t.rawRef, confidence: t.confidence,
        })),
      });
      setImportResult(res.data);
      setStep(2);
      toast.success(`${res.data.saved} transactions imported!`);
    } catch (err) { toast.error(err.message); }
    finally { setConfirming(false); }
  };

  const reset = () => {
    setStep(0); setFile(null); setParseResult(null); setImportResult(null); setSelectedAccount('');
  };

  const fmt = (paisas) => `Rs. ${(paisas / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

  return (
    <div className="fade-in">
      {/* Step Indicator */}
      <div className="step-indicator">
        {STEPS.map((s, i) => (
          <div key={s} className={`step-item ${i === step ? 'active' : i < step ? 'done' : ''}`}>
            <div className="step-dot">{i < step ? <CheckCircle size={16}/> : i + 1}</div>
            <span>{s}</span>
          </div>
        ))}
      </div>

      {/* Step 0: Upload */}
      {step === 0 && (
        <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
          <div className="card-header"><h3>Upload Bank Statement</h3></div>
          <div className="form-group">
            <label>Select Account</label>
            <select className="form-control" value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
              <option value="">Choose an account...</option>
              {accounts.map(a => <option key={a.id||a._id} value={a.id||a._id}>{a.name} ({a.provider})</option>)}
            </select>
          </div>
          <div className={`upload-zone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
            onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display:'none' }} />
            {file ? (
              <div className="upload-file-info">
                <FileText size={32} style={{ color:'var(--accent)' }}/>
                <div>
                  <p style={{ fontWeight:600 }}>{file.name}</p>
                  <p style={{ fontSize:13, color:'var(--text-muted)' }}>{(file.size/1024).toFixed(1)} KB</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setFile(null); }}><X size={16}/></button>
              </div>
            ) : (
              <>
                <Upload size={40} style={{ color:'var(--text-muted)', marginBottom:12 }}/>
                <p style={{ fontWeight:500, marginBottom:4 }}>Drag & drop your CSV here</p>
                <p style={{ fontSize:13, color:'var(--text-muted)' }}>or click to browse • HBL, JazzCash supported</p>
              </>
            )}
          </div>
          <button className="btn btn-primary btn-lg" style={{ width:'100%', marginTop:20 }}
            onClick={handleUpload} disabled={uploading || !selectedAccount || !file}>
            {uploading ? 'Parsing...' : 'Upload & Parse'}
          </button>
        </div>
      )}

      {/* Step 1: Review */}
      {step === 1 && parseResult && (
        <div>
          <div className="stats-grid" style={{ marginBottom:20 }}>
            <div className="stat-card income"><div className="stat-label">Bank Detected</div><div className="stat-value" style={{ fontSize:22 }}>{parseResult.bank}</div></div>
            <div className="stat-card rate"><div className="stat-label">Transactions</div><div className="stat-value">{parseResult.transactions.length}</div></div>
            <div className="stat-card expense"><div className="stat-label">Needs Review</div><div className="stat-value">{parseResult.stats.needsReview}</div></div>
            <div className="stat-card savings"><div className="stat-label">Duplicates Skipped</div><div className="stat-value">{parseResult.stats.duplicatesSkipped}</div></div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Review Transactions</h3>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-ghost" onClick={() => { setStep(0); setParseResult(null); }}><ChevronLeft size={16}/> Back</button>
                <button className="btn btn-primary" onClick={handleConfirm} disabled={confirming}>
                  {confirming ? 'Importing...' : <><CheckCircle size={16}/> Confirm Import</>}
                </button>
              </div>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Description</th><th>Type</th><th>Amount</th><th>Category</th><th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.transactions.map((t, i) => (
                    <tr key={i}>
                      <td style={{ whiteSpace:'nowrap' }}>{new Date(t.date).toLocaleDateString()}</td>
                      <td style={{ maxWidth:250, overflow:'hidden', textOverflow:'ellipsis' }}>{t.description}</td>
                      <td><span className={`badge-type ${t.type === 'debit' ? 'expense' : 'income'}`}>{t.type}</span></td>
                      <td style={{ fontWeight:600 }}>{fmt(t.amountPaisas)}</td>
                      <td>
                        <input className="form-control" style={{ padding:'4px 8px', fontSize:13, minWidth:120 }}
                          value={t.categoryName} onChange={e => handleCategoryChange(i, e.target.value)} />
                      </td>
                      <td>
                        <span className={`confidence-badge ${t.confidence >= 0.8 ? 'high' : t.confidence >= 0.5 ? 'med' : 'low'}`}>
                          {t.confidence >= 0.8 ? <CheckCircle size={12}/> : <AlertTriangle size={12}/>}
                          {Math.round(t.confidence * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Complete */}
      {step === 2 && importResult && (
        <div className="card" style={{ maxWidth:500, margin:'0 auto', textAlign:'center', padding:40 }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(16,185,129,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <CheckCircle size={32} style={{ color:'var(--success)' }}/>
          </div>
          <h2 style={{ marginBottom:8 }}>Import Complete!</h2>
          <p style={{ color:'var(--text-muted)', marginBottom:24 }}>{importResult.saved} transactions saved successfully</p>
          <div className="stats-grid" style={{ textAlign:'left', marginBottom:24 }}>
            <div className="stat-card income"><div className="stat-label">Saved</div><div className="stat-value">{importResult.saved}</div></div>
            <div className="stat-card expense"><div className="stat-label">Failed</div><div className="stat-value">{importResult.failed}</div></div>
          </div>
          {importResult.budgetsAffected > 0 && (
            <p style={{ fontSize:14, color:'var(--warning)', marginBottom:12 }}>⚠️ {importResult.budgetsAffected} budget(s) updated</p>
          )}
          {importResult.notificationsSent > 0 && (
            <p style={{ fontSize:14, color:'var(--danger)', marginBottom:12 }}>🔔 {importResult.notificationsSent} budget alert(s) sent</p>
          )}
          <button className="btn btn-primary btn-lg" onClick={reset}>Import Another</button>
        </div>
      )}
    </div>
  );
}
