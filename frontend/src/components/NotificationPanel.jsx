import React, { useRef, useEffect } from 'react';

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  
  if (diffMs < 60000) return 'Just now';
  
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function NotificationPanel({ 
  notifications, 
  onMarkRead, 
  onMarkAllRead, 
  onClose 
}) {
  const panelRef = useRef(null);

  // Click outside to close panel
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        // Only close if we didn't click the bell button (which has its own toggle click)
        if (!event.target.closest('.bell-btn')) {
          onClose();
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="notification-panel" ref={panelRef}>
      {/* Panel Header */}
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Notifications</span>
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="unread-dot-badge"></span>
          )}
        </div>
        {notifications.some(n => !n.read) && (
          <button className="mark-all-btn" onClick={onMarkAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="notifications-list-container">
        {notifications.length === 0 ? (
          <div className="panel-empty-state">
            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <p>All caught up!</p>
            <span>You have no system notifications.</span>
          </div>
        ) : (
          notifications.map(notif => {
            const isSuccess = notif.type === 'success';
            const isFailed = notif.type === 'failed' || notif.type === 'error';
            
            return (
              <div 
                key={notif.id} 
                className={`notification-item ${!notif.read ? 'unread' : ''}`}
              >
                {/* Status Indicator Icon */}
                <div className={`notif-indicator ${notif.type === 'error' ? 'failed' : notif.type}`}>
                  {isSuccess && (
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {isFailed && (
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {!isSuccess && !isFailed && (
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>

                {/* Message Content */}
                <div className="notif-content-wrapper">
                  <div className="notif-message">{notif.message}</div>
                  <div className="notif-time">{formatTimeAgo(notif.createdAt)}</div>
                </div>

                {/* Mark individual read button */}
                {!notif.read && (
                  <button 
                    className="notif-read-check" 
                    onClick={() => onMarkRead(notif.id)}
                    title="Mark as read"
                  >
                    <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
