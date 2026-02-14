import { NavLink, useNavigate } from 'react-router-dom';
import {
    Home,
    FolderKanban,
    Calendar,
    MessageSquare,
    Settings,
    LogOut,
    Flame,
    FolderOpen,
    FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/RentBasket-Logo.png';
import './Sidebar.css';

export function Sidebar() {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { to: '/', icon: Home, label: 'Home' },
        { to: '/projects', icon: FolderKanban, label: 'Projects' },
        { to: '/calendar', icon: Calendar, label: 'Calendar' },
        { to: '/chat', icon: MessageSquare, label: 'Team Chat' },
        { to: '/files', icon: FolderOpen, label: 'Files' },
        { to: '/documents', icon: FileText, label: 'Documents' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <img src={logo} alt="RentBasket" className="logo-img" />
                    <span className="logo-text">RentBasket</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <ul className="nav-list">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <li key={to}>
                            <NavLink
                                to={to}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                end={to === '/'}
                            >
                                <Icon size={20} />
                                <span>{label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>

                {isAdmin && (
                    <>
                        <div className="nav-divider"></div>
                        <ul className="nav-list">
                            <li>
                                <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                    <Settings size={20} />
                                    <span>Settings</span>
                                </NavLink>
                            </li>
                        </ul>
                    </>
                )}
            </nav>

            <div className="sidebar-footer">
                {user && (
                    <div className="user-section">
                        <div className="user-info">
                            <div className="avatar">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="user-details">
                                <span className="user-name">{user.name}</span>
                                <span className="user-role">{user.role}</span>
                            </div>
                        </div>

                        {user.loginStreak > 0 && (
                            <div className="streak-badge" title={`${user.loginStreak} day streak!`}>
                                <Flame size={14} />
                                <span>{user.loginStreak}</span>
                            </div>
                        )}

                        <button className="logout-btn" onClick={handleLogout} title="Logout">
                            <LogOut size={18} />
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}
