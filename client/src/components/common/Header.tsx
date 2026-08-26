import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NotificationPopover } from './NotificationPopover';
import { Sun, Moon, Search, ChevronDown, Building2, User, LogOut, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

export const Header: React.FC = () => {
  const { user, workspace, workspaces, setWorkspace, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showWsMenu, setShowWsMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="header-container">
      {/* Search Input on Desktop */}
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

      {/* Right Action Icons & Profile */}
      <div className="header-actions">
        {/* Workspace Switcher */}
        <div className="header-dropdown-container">
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

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="btn btn-outline theme-toggle-btn"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={20} color="#f2ae30" /> : <Moon size={20} color="#804BF2" />}
        </button>

        {/* Notifications Popover */}
        <NotificationPopover />

        {/* User Profile Avatar Dropdown */}
        <div className="header-dropdown-container">
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
      </div>
    </header>
  );
};
