import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Target, BarChart3,
  Bell, User, LogOut, Menu, X
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/budgets', label: 'Budgets', icon: Wallet },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/notifications', label: 'Notifications', icon: Bell },
];

const pageTitles = {
  '/dashboard': { title: 'Dashboard', sub: 'Your financial overview' },
  '/transactions': { title: 'Transactions', sub: 'Manage your income & expenses' },
  '/budgets': { title: 'Budgets', sub: 'Track your monthly budgets' },
  '/goals': { title: 'Savings Goals', sub: 'Track progress toward your goals' },
  '/reports': { title: 'Reports', sub: 'Financial analytics & insights' },
  '/notifications': { title: 'Notifications', sub: 'Stay updated on your finances' },
  '/profile': { title: 'Profile', sub: 'Manage your account settings' },
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pageInfo = pageTitles[location.pathname] || { title: 'MoneyMap', sub: '' };

  useEffect(() => {
    api.get('/notifications/unread').then(r => setUnreadCount(r.data.unreadCount)).catch(() => {});
  }, [location.pathname]);

  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">M</div>
          <h1>MoneyMap</h1>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}>
              <item.icon size={20} />
              <span>{item.label}</span>
              {item.label === 'Notifications' && unreadCount > 0 && (
                <span className="badge">{unreadCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <NavLink to="/profile" className={({ isActive }) => `user-info ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}>
            <div className="user-avatar">{initials}</div>
            <div>
              <div className="user-name">{user?.fullName}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </NavLink>
          <button className="sidebar-link" onClick={logout} style={{ marginTop: 8, width: '100%' }}>
            <LogOut size={20} /><span>Logout</span>
          </button>
        </div>
      </aside>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="menu-toggle btn btn-ghost" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="topbar-title">
            <h2>{pageInfo.title}</h2>
            <p>{pageInfo.sub}</p>
          </div>
        </div>
      </div>
      <main className="main-content fade-in">{children}</main>
    </div>
  );
}
