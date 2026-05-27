import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Target, BarChart3,
  Bell, User, LogOut, Menu, X, Building2
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/budgets', label: 'Budgets', icon: Wallet },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/accounts', label: 'Accounts', icon: Building2 },
  { path: '/notifications', label: 'Notifications', icon: Bell },
];

const pageTitles = {
  '/dashboard': { title: 'Dashboard', sub: 'Your financial overview' },
  '/transactions': { title: 'Transactions', sub: 'Manage your income & expenses' },
  '/budgets': { title: 'Budgets', sub: 'Track your monthly budgets' },
  '/goals': { title: 'Savings Goals', sub: 'Track progress toward your goals' },
  '/reports': { title: 'Reports', sub: 'Financial analytics & insights' },
  '/accounts': { title: 'Accounts', sub: 'Manage your bank accounts & wallets' },
  '/notifications': { title: 'Notifications', sub: 'Stay updated on your finances' },
  '/profile': { title: 'Profile', sub: 'Manage your account settings' },
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { unreadCount, refreshUnread } = useNotifications();

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    refreshUnread();
  }, [location.pathname, refreshUnread]);

  const currentRouteInfo = pageTitles[location.pathname] || { title: 'MoneyMap', sub: 'Welcome back' };
  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <div className={`app-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {isMobileOpen && <div className="sidebar-overlay" onClick={() => setIsMobileOpen(false)} />}

      <aside className={`sidebar ${isMobileOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">M</div>
          {!isCollapsed && <h1>MoneyMap</h1>}
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setIsMobileOpen(false)}>
              <item.icon size={20} />
              {!isCollapsed && <span>{item.label}</span>}
              {item.label === 'Notifications' && unreadCount > 0 && (
                <span className="badge">{unreadCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <NavLink to="/profile" className={({ isActive }) => `user-info ${isActive ? 'active' : ''}`}
            onClick={() => setIsMobileOpen(false)}>
            <div className="user-avatar">{initials}</div>
            {!isCollapsed && (
              <div>
                <div className="user-name">{user?.fullName}</div>
                <div className="user-email">{user?.email}</div>
              </div>
            )}
          </NavLink>
          <button className="sidebar-link" onClick={logout} style={{ marginTop: 8, width: '100%', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
            <LogOut size={20} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="main-wrapper">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Mobile Toggle */}
            <button className="menu-toggle mobile-only btn btn-ghost" onClick={() => setIsMobileOpen(true)}>
              <Menu size={20} />
            </button>
            {/* Desktop Toggle */}
            <button className="menu-toggle desktop-only btn btn-ghost" onClick={() => setIsCollapsed(!isCollapsed)}>
              {isCollapsed ? <Menu size={20} /> : <X size={20} />}
            </button>
            <div className="topbar-title">
              <h2>{currentRouteInfo.title}</h2>
              <p>{currentRouteInfo.sub}</p>
            </div>
          </div>
        </div>
        <main className="main-content fade-in">{children}</main>
      </div>
    </div>
  );
}
