import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { AlertCircle, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, isLoading, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        const success = await login({ email, password });

        if (success) {
            navigate('/');
        } else {
            setError('Invalid email or password');
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="login-logo">
                        <div className="logo-icon">R</div>
                        <span className="logo-text">RentBasket</span>
                    </div>
                    <h1>Welcome back</h1>
                    <p>Sign in to your internal dashboard</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    {error && (
                        <div className="error-message">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="form-input"
                            placeholder="you@rentbasket.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                        />
                    </div>

                    <button type="submit" className="btn btn-primary login-btn" disabled={isLoading}>
                        <LogIn size={18} />
                        {isLoading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>

                <div className="login-footer">
                    <p className="demo-info">
                        <strong>Demo accounts:</strong>
                    </p>
                    <div className="demo-credentials">
                        <code>admin@rentbasket.com / admin123</code>
                        <code>editor@rentbasket.com / editor123</code>
                    </div>
                </div>
            </div>
        </div>
    );
}
