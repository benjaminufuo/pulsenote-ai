import React from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../common/Header';
import './AppLayout.css';
import {
  Home,
  Mic,
  UploadCloud,
  FileText,
  CheckSquare,
  Search,
  Settings,
  Sparkles,
  Bot
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Invite Bot', path: '/invite-bot', icon: Bot },
    { label: 'Meetings', path: '/meetings', icon: FileText },
    { label: 'Record', path: '/record', icon: Mic },
    { label: 'Upload', path: '/upload', icon: UploadCloud },
    { label: 'Search', path: '/search', icon: Search },
    { label: 'Action Items', path: '/tasks', icon: CheckSquare },
    { label: 'Settings', path: '/settings', icon: Settings }
  ];

  return (
    <div className="app-container">
      {/* Desktop Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">
            <Sparkles size={20} />
          </div>
          <span className="sidebar-brand-title">
            PulseNote<span className="sidebar-brand-accent">.AI</span>
          </span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} color={isActive ? 'var(--color-primary)' : 'currentColor'} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Pro Plan Widget */}
        <div className="sidebar-pro-widget">
          <div className="pro-widget-title">PulseNote AI Startup Plan</div>
          <div className="pro-widget-desc">Unlimited AI meeting bot invites & transcriptions active.</div>
        </div>
      </aside>

      {/* Main View Shell */}
      <div className="main-content">
        <Header />
        <main className="main-content-inner">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
        >
          <Home size={22} />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/invite-bot"
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
        >
          <Bot size={22} />
          <span>Invite Bot</span>
        </NavLink>

        <button
          onClick={() => navigate('/record')}
          className="record-fab"
          title="Start Recording"
        >
          <Mic size={24} />
        </button>

        <NavLink
          to="/meetings"
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
        >
          <FileText size={22} />
          <span>Meetings</span>
        </NavLink>

        <NavLink
          to="/tasks"
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
        >
          <CheckSquare size={22} />
          <span>Tasks</span>
        </NavLink>
      </nav>
    </div>
  );
};
