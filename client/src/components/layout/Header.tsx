import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, X, Check, CheckCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDistanceToNow } from 'date-fns';
import './Header.css';

interface HeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
    const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useApp();
    const [showNotifications, setShowNotifications] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="header">
            <div className="header-left">
                <div className="header-title-section">
                    <h1 className="header-title">{title}</h1>
                    {subtitle && <p className="header-subtitle">{subtitle}</p>}
                </div>
            </div>

            <div className="header-right">
                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    {searchQuery && (
                        <button className="search-clear" onClick={() => setSearchQuery('')}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="notifications-wrapper" ref={dropdownRef}>
                    <button
                        className={`notification-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="notification-badge">{unreadCount}</span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="notifications-dropdown">
                            <div className="notifications-header">
                                <h3>Notifications</h3>
                                {unreadCount > 0 && (
                                    <button
                                        className="mark-all-read"
                                        onClick={markAllNotificationsRead}
                                    >
                                        <CheckCheck size={14} />
                                        Mark all read
                                    </button>
                                )}
                            </div>

                            <div className="notifications-list">
                                {notifications.length === 0 ? (
                                    <div className="no-notifications">
                                        No notifications yet
                                    </div>
                                ) : (
                                    notifications.map(notification => (
                                        <div
                                            key={notification.id}
                                            className={`notification-item ${!notification.read ? 'unread' : ''}`}
                                            onClick={() => markNotificationRead(notification.id)}
                                        >
                                            <div className="notification-content">
                                                <span className="notification-title">{notification.title}</span>
                                                <span className="notification-message">{notification.message}</span>
                                                <span className="notification-time">
                                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                            {!notification.read && (
                                                <button
                                                    className="mark-read-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markNotificationRead(notification.id);
                                                    }}
                                                >
                                                    <Check size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {actions && <div className="header-actions">{actions}</div>}
            </div>
        </header>
    );
}
