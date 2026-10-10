import React, { useState } from 'react';
import { getErrorMessage } from '../api';
import { useAuth } from '../AuthContext';

const AuthForm = () => {
    const { login, register } = useAuth();
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({ username: '', email: '', password: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const isLogin = mode === 'login';
    const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            if (isLogin) await login(form.email, form.password);
            else await register(form.username, form.email, form.password);
        } catch (err) {
            setError(getErrorMessage(err, isLogin ? 'Login failed.' : 'Sign up failed.'));
            setSubmitting(false);
        }
    };

    const switchMode = () => {
        setMode(isLogin ? 'register' : 'login');
        setError('');
    };

    return (
        <div className="auth-page">
            <form className="card auth-card" onSubmit={handleSubmit}>
                <h1 className="brand">SocialApp</h1>
                <p className="muted">{isLogin ? 'Welcome back! Log in to continue.' : 'Create an account to get started.'}</p>

                {!isLogin && (
                    <input
                        className="input"
                        placeholder="Username"
                        value={form.username}
                        onChange={update('username')}
                        maxLength={50}
                        autoComplete="username"
                        required
                    />
                )}
                <input
                    className="input"
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={update('email')}
                    autoComplete="email"
                    required
                />
                <input
                    className="input"
                    type="password"
                    placeholder={isLogin ? 'Password' : 'Password (min. 8 characters)'}
                    value={form.password}
                    onChange={update('password')}
                    minLength={isLogin ? undefined : 8}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    required
                />

                {error && <p className="error">{error}</p>}

                <button className="button full" type="submit" disabled={submitting}>
                    {submitting ? 'Please wait...' : isLogin ? 'Log in' : 'Sign up'}
                </button>
                <p className="muted center">
                    {isLogin ? "Don't have an account? " : 'Already have an account? '}
                    <button type="button" className="link-button" onClick={switchMode}>
                        {isLogin ? 'Sign up' : 'Log in'}
                    </button>
                </p>
            </form>
        </div>
    );
};

export default AuthForm;
