import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import { Bell, CheckCheck, Trash2, AlertTriangle, Target, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

const typeIcons = { budget_alert: AlertTriangle, goal_reminder: Target, transaction_confirmation: CreditCard };
const typeClasses = { budget_alert: 'budget', goal_reminder: 'goal', transaction_confirmation: 'transaction' };

export default function Notifications() {
  const { refreshUnread } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const fetch_ = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/notifications?page=${page}&limit=20`);
      setNotifications(res.data.notifications || []);
      setPagination(res.data.pagination || { page: 1, totalPages: 1 });
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, []);

  const markRead = async (id) => {
    try { await api.put(`/notifications/${id}/read`); await fetch_(pagination.page); refreshUnread(); } catch {}
  };
  const markAllRead = async () => {
    try { await api.put('/notifications/read-all'); toast.success('All marked as read'); await fetch_(pagination.page); refreshUnread(); } catch {}
  };
  const deleteNotif = async (id) => {
    try { await api.delete(`/notifications/${id}`); toast.success('Deleted'); await fetch_(pagination.page); refreshUnread(); } catch {}
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-outline btn-sm" onClick={markAllRead}><CheckCheck size={16}/> Mark All Read</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {notifications.length === 0 ? (
          <div className="empty-state" style={{ padding: 60 }}><Bell size={48} style={{ opacity: 0.2 }} /><h3>No notifications</h3><p>You're all caught up!</p></div>
        ) : notifications.map(n => {
          const Icon = typeIcons[n.type] || Bell;
          return (
            <div key={n._id} className={`notification-item ${!n.isRead ? 'unread' : ''}`}>
              <div className={`notification-icon ${typeClasses[n.type]}`}><Icon size={18}/></div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, marginBottom: 4 }}>{n.message}</p>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {!n.isRead && <button className="btn btn-ghost btn-sm" onClick={() => markRead(n._id)} title="Mark read"><CheckCheck size={14}/></button>}
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteNotif(n._id)} title="Delete"><Trash2 size={14}/></button>
              </div>
            </div>
          );
        })}
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button disabled={pagination.page<=1} onClick={() => fetch_(pagination.page-1)}>Previous</button>
          <span style={{fontSize:13, color:'var(--text-muted)'}}>Page {pagination.page} of {pagination.totalPages}</span>
          <button disabled={pagination.page>=pagination.totalPages} onClick={() => fetch_(pagination.page+1)}>Next</button>
        </div>
      )}
    </div>
  );
}
