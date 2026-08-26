import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../../api/client';
import { useNavigate } from 'react-router-dom';
import './NotificationPopover.css';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  link?: string;
  createdAt: string;
}

export const NotificationPopover: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const markAsRead = async (id: string, link?: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      if (link) {
        setIsOpen(false);
        navigate(link);
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="header-dropdown-container">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-outline theme-toggle-btn"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notif-popover-menu">
          <div className="notif-popover-header">
            <h4>Notifications</h4>
            <span className="pro-widget-desc">{unreadCount} unread</span>
          </div>

          <div className="notif-popover-list">
            {notifications.length === 0 ? (
              <div className="recorder-subtitle">No notifications right now</div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markAsRead(item.id, item.link)}
                  className={`notif-item ${!item.read ? 'notif-item-unread' : ''}`}
                >
                  <div className="kpi-card-header">
                    <span className="speaker-name-title">{item.title}</span>
                    <span className="meeting-card-date">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="meeting-card-desc">{item.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
