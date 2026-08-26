import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NotificationPopover } from './NotificationPopover';
import { Sun, Moon, Search, ChevronDown, Building2, User, LogOut, Sparkles, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

export const Header: React.FC = () => {
  const { user, workspace, workspaces, setWorkspace, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showWsMenu, setShowWsMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowMobileMenu(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="header-wrapper">
      <div className="header-container">
        {/* Mobile Brand Logo */}
        <div className="header-mobile-brand" onClick={() => navigate('/dashboard')}>
          <div className="sidebar-logo-icon" style={{ width: '28px', height: '28px' }}>
            <Sparkles size={16} />
          </div>
          <span className="sidebar-brand-title" style={{ fontSize: '1.05rem' }}>
            Pulse<span className="sidebar-brand-accent">AI</span>
          </span>
        </div>

        {/* Desktop Search Bar */}
        <form onSubmit={handleSearchSubmit} className="header-search-form">
          <Search size={18} className="header-search-icon" />
          <input
            type="text"
            placeholder="Search meetings, transcripts, action items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="header-search-input"
          />
        </form>

        {/* Desktop Actions & Mobile Controls */}
        <div className="header-actions">
          {/* Workspace Switcher (Desktop) */}
          <div className="header-dropdown-container desktop-only-inline">
            <button
              onClick={() => setShowWsMenu(!showWsMenu)}
              className="btn btn-outline header-ws-btn"
            >
              <Building2 size={16} color="var(--color-primary)" />
              <span className="header-ws-label">
                {workspace ? workspace.name : 'Workspace'}
              </span>
              <ChevronDown size={14} />
            </button>

            {showWsMenu && (
              <div className="dropdown-menu">
                <div className="dropdown-header">WORKSPACES</div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setWorkspace(ws);
                      setShowWsMenu(false);
                    }}
                    className={`dropdown-item ${workspace?.id === ws.id ? 'active' : ''}`}
                  >
                    <span>{ws.name}</span>
                    {workspace?.id === ws.id && <Sparkles size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Toggle Button (Desktop) */}
          <button
            onClick={toggleTheme}
            className="btn btn-outline theme-toggle-btn desktop-only-inline"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={18} color="#f2ae30" /> : <Moon size={18} color="#804BF2" />}
          </button>

          {/* Notifications Popover */}
          <NotificationPopover />

          {/* User Profile Avatar Dropdown (Desktop) */}
          <div className="header-dropdown-container desktop-only-inline">
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="avatar-btn">
              <img
                src={user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                alt={user?.name || 'User'}
                className="avatar-img"
              />
            </button>

            {showUserMenu && (
              <div className="user-dropdown-menu">
                <div className="user-dropdown-header">
                  <div className="user-dropdown-name">{user?.name}</div>
                  <div className="user-dropdown-email">{user?.email}</div>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/profile');
                  }}
                  className="user-dropdown-btn"
                >
                  <User size={16} /> Profile & Settings
                </button>
                <button
                  onClick={logout}
                  className="user-dropdown-btn user-dropdown-btn-danger"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Column Menu Toggle Button (Visible only on mobile < 768px) */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="btn btn-outline mobile-menu-toggle-btn"
            title="Toggle Mobile Header Menu"
          >
            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Expandable Mobile Column Dropdown Panel */}
      {showMobileMenu && (
        <div className="mobile-header-dropdown-panel">
          {/* Section 1: Mobile Search Input */}
          <form onSubmit={handleSearchSubmit} className="mobile-panel-search-form">
            <div className="input-with-icon-wrapper">
              <Search size={18} className="input-left-icon" />
              <input
                type="text"
                placeholder="Search meetings, transcripts, action items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input-full"
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </form>

          {/* Section 2: Workspace Switcher */}
          <div className="mobile-panel-item">
            <label className="form-label">Active Workspace</label>
            <select
              value={workspace?.id || ''}
              onChange={(e) => {
                const found = workspaces.find((w) => w.id === e.target.value);
                if (found) setWorkspace(found);
              }}
              className="form-input-full"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section 3: Theme Switcher */}
          <div className="mobile-panel-item-row">
            <span className="speaker-name-title">Appearance Mode</span>
            <button onClick={toggleTheme} className="btn btn-outline" style={{ gap: '6px' }}>
              {theme === 'dark' ? <Sun size={16} color="#f2ae30" /> : <Moon size={16} color="#804BF2" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>

          {/* Section 4: User Profile & Actions */}
          <div className="mobile-panel-user-box">
            <div className="speaker-label-row">
              <img
                src={user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                alt={user?.name || 'User'}
                className="avatar-img"
              />
              <div>
                <div className="user-dropdown-name">{user?.name}</div>
                <div className="user-dropdown-email">{user?.email}</div>
              </div>
            </div>

            <div className="speaker-label-row" style={{ marginTop: '0.75rem', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate('/profile');
                }}
                className="btn btn-outline"
                style={{ flex: 1, fontSize: '0.8rem' }}
              >
                <User size={14} /> Profile & Settings
              </button>
              <button
                onClick={logout}
                className="btn btn-outline"
                style={{ color: '#EF4444', borderColor: '#EF4444', fontSize: '0.8rem' }}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
