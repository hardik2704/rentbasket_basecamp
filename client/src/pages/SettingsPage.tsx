import { useState } from 'react';
import {
    User,
    Shield,
    Mail,
    Lock,
    Save,
    Camera,
    Trash2,
    UserPlus,
    Edit2,
    X,
    Check,
    Flame,
    AlertCircle
} from 'lucide-react';
import { Header } from '../components/layout';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { usersAPI, authAPI } from '../services/api';
import './SettingsPage.css';

export function SettingsPage() {
    const { user, isAdmin } = useAuth();
    const { users, refreshData } = useApp();
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'users'>('profile');

    return (
        <div className="settings-page">
            <Header
                title="Settings"
                subtitle="Manage your account and preferences"
            />

            <div className="settings-content">
                {/* Tabs */}
                <div className="settings-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <User size={18} />
                        Profile
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                        onClick={() => setActiveTab('security')}
                    >
                        <Lock size={18} />
                        Security
                    </button>
                    {isAdmin && (
                        <button
                            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                            onClick={() => setActiveTab('users')}
                        >
                            <Shield size={18} />
                            User Management
                        </button>
                    )}
                </div>

                {/* Tab Content */}
                <div className="settings-panel">
                    {activeTab === 'profile' && <ProfileSettings user={user} />}
                    {activeTab === 'security' && <SecuritySettings />}
                    {activeTab === 'users' && isAdmin && <UserManagement users={users} refreshData={refreshData} />}
                </div>
            </div>
        </div>
    );
}

// Profile Settings Component
function ProfileSettings({ user }: { user: any }) {
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await authAPI.updateProfile({ name, email });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error('Failed to save profile:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="profile-settings">
            <h2>Profile Information</h2>
            <p className="section-description">Update your personal information and how others see you.</p>

            {/* Avatar Section */}
            <div className="avatar-section">
                <div className="avatar-large">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="avatar-actions">
                    <button className="btn btn-secondary">
                        <Camera size={16} />
                        Change Photo
                    </button>
                    <p className="avatar-hint">JPG, PNG or GIF. Max 2MB.</p>
                </div>
            </div>

            {/* Profile Form */}
            <div className="settings-form">
                <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                        type="text"
                        className="form-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <div className="input-with-icon">
                        <Mail size={18} className="input-icon" />
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Role</label>
                    <div className="role-badge">
                        <Shield size={16} />
                        <span>{user?.role === 'admin' ? 'Administrator' : 'Editor'}</span>
                    </div>
                    <p className="form-hint">Contact an administrator to change your role.</p>
                </div>

                <div className="form-group">
                    <label className="form-label">Login Streak</label>
                    <div className="streak-display">
                        <Flame size={20} className="streak-icon" />
                        <span className="streak-count">{user?.loginStreak || 0}</span>
                        <span className="streak-label">day streak</span>
                    </div>
                </div>
            </div>

            <div className="form-actions">
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {saved ? (
                        <>
                            <Check size={18} />
                            Saved!
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

// Security Settings Component
function SecuritySettings() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleChangePassword = async () => {
        setError('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        try {
            await authAPI.changePassword({ currentPassword, newPassword });
            setSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to change password');
        }
    };

    return (
        <div className="security-settings">
            <h2>Security Settings</h2>
            <p className="section-description">Manage your password and account security.</p>

            <div className="settings-form">
                <h3>Change Password</h3>

                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">Password updated successfully!</div>}

                <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <input
                        type="password"
                        className="form-input"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input
                        type="password"
                        className="form-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input
                        type="password"
                        className="form-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                    />
                </div>
            </div>

            <div className="form-actions">
                <button className="btn btn-primary" onClick={handleChangePassword}>
                    <Lock size={18} />
                    Update Password
                </button>
            </div>

            <div className="danger-zone">
                <h3>Danger Zone</h3>
                <div className="danger-card">
                    <div className="danger-info">
                        <h4>Delete Account</h4>
                        <p>Once you delete your account, there is no going back. Please be certain.</p>
                    </div>
                    <button className="btn btn-danger">
                        <Trash2 size={16} />
                        Delete Account
                    </button>
                </div>
            </div>
        </div>
    );
}

// User Management Component (Admin Only)
function UserManagement({ users, refreshData }: { users: any[]; refreshData: () => Promise<void> }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreateUser = async (data: any) => {
        setIsLoading(true);
        setError('');
        try {
            await usersAPI.create(data);
            setShowCreateModal(false);
            await refreshData();
        } catch (err: any) {
            setError(err.message || 'Failed to create user');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateUser = async (data: any) => {
        if (!editingUser) return;
        setIsLoading(true);
        setError('');
        try {
            await usersAPI.update(editingUser.id, data);
            setEditingUser(null);
            await refreshData();
        } catch (err: any) {
            setError(err.message || 'Failed to update user');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to deactivate this user?')) return;
        setIsLoading(true);
        try {
            await usersAPI.delete(userId);
            await refreshData();
        } catch (err: any) {
            setError(err.message || 'Failed to deactivate user');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="user-management">
            <div className="management-header">
                <div>
                    <h2>User Management</h2>
                    <p className="section-description">Manage team members and their access levels.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} disabled={isLoading}>
                    <UserPlus size={18} />
                    Add User
                </button>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Login Streak</th>
                            <th>Last Login</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <div className="user-cell">
                                        <div className="user-avatar-small">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="user-name">{user.name}</span>
                                    </div>
                                </td>
                                <td>{user.email}</td>
                                <td>
                                    <span className={`role-tag ${user.role}`}>
                                        {user.role === 'admin' ? 'Admin' : 'Editor'}
                                    </span>
                                </td>
                                <td>
                                    <div className="streak-cell">
                                        <Flame size={14} />
                                        {user.loginStreak || 0}
                                    </div>
                                </td>
                                <td className="text-muted">
                                    {user.lastLogin
                                        ? new Date(user.lastLogin).toLocaleDateString()
                                        : 'Never'
                                    }
                                </td>
                                <td>
                                    <div className="table-actions">
                                        <button
                                            className="action-btn"
                                            onClick={() => setEditingUser(user)}
                                            title="Edit"
                                            disabled={isLoading}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            className="action-btn danger"
                                            title="Deactivate"
                                            onClick={() => handleDeleteUser(user.id)}
                                            disabled={isLoading}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <UserFormModal
                    title="Add New User"
                    onClose={() => setShowCreateModal(false)}
                    onSave={handleCreateUser}
                    isLoading={isLoading}
                />
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <UserFormModal
                    title="Edit User"
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={handleUpdateUser}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
}

// User Form Modal
interface UserFormModalProps {
    title: string;
    user?: any;
    onClose: () => void;
    onSave: (data: any) => void;
    isLoading?: boolean;
}

function UserFormModal({ title, user, onClose, onSave, isLoading }: UserFormModalProps) {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        role: user?.role || 'editor',
        password: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal user-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <select
                                className="form-input"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="editor">Editor</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        {!user && (
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Minimum 6 characters"
                                    required
                                />
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? 'Saving...' : (user ? 'Save Changes' : 'Create User')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
