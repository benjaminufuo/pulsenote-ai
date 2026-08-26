import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, AlertCircle, KeyRound, Mail, ArrowRight } from 'lucide-react';
import { getErrorMessage } from '../utils/error';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('demo@pulsenote.ai');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(getErrorMessage(err, 'Invalid credentials. Please check your email and password.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('demo@pulsenote.ai');
    setPassword('password123');
  };

  return (
    <div className="auth-wrapper">
      <div className="card auth-card">
        {/* Brand Logo */}
        <div className="recorder-card" style={{ padding: 0, marginBottom: '2rem' }}>
          <div className="auth-logo-box">
            <Sparkles size={24} />
          </div>
          <h2 className="recorder-title">Sign in to PulseNote AI</h2>
          <p className="recorder-subtitle" style={{ marginBottom: 0 }}>
            AI-powered meeting workspace for high performance teams
          </p>
        </div>

        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="meetings-list-stack" style={{ gap: '1.25rem' }}>
          <div>
            <label className="form-label">Work Email</label>
            <div className="input-with-icon-wrapper">
              <Mail size={18} className="input-left-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input-full"
                style={{ paddingLeft: '38px' }}
                placeholder="name@company.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">Password</label>
            <div className="input-with-icon-wrapper">
              <KeyRound size={18} className="input-left-icon" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input-full"
                style={{ paddingLeft: '38px' }}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary form-input-full"
            style={{ padding: '0.75rem', marginTop: '0.5rem' }}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'} <ArrowRight size={18} />
          </button>
        </form>

        <div className="recorder-card" style={{ padding: 0, marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="demo-fill-button"
          >
            ✨ Click to Fill Demo Credentials (demo@pulsenote.ai)
          </button>
        </div>

        <div className="recorder-subtitle" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
          Don't have an account?{' '}
          <Link to="/register" className="meeting-card-action-link">
            Register Workspace
          </Link>
        </div>
      </div>
    </div>
  );
};
