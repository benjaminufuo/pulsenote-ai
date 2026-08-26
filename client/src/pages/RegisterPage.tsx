import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, AlertCircle, KeyRound, Mail, User, Building2, ArrowRight } from 'lucide-react';
import { getErrorMessage } from '../utils/error';
import './RegisterPage.css';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      await register(name, email, password, workspaceName);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(getErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="card auth-card register-card-wide">
        <div className="recorder-card" style={{ padding: 0, marginBottom: '2rem' }}>
          <div className="auth-logo-box">
            <Sparkles size={24} />
          </div>
          <h2 className="recorder-title">Create Your Workspace</h2>
          <p className="recorder-subtitle" style={{ marginBottom: 0 }}>
            Start capturing intelligent meeting notes with AI
          </p>
        </div>

        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="meetings-list-stack" style={{ gap: '1rem' }}>
          <div>
            <label className="form-label">Full Name</label>
            <div className="input-with-icon-wrapper">
              <User size={18} className="input-left-icon" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input-full"
                style={{ paddingLeft: '38px' }}
                placeholder="Sarah Connor"
                required
              />
            </div>
          </div>

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
                placeholder="sarah@company.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">Workspace Name</label>
            <div className="input-with-icon-wrapper">
              <Building2 size={18} className="input-left-icon" />
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="form-input-full"
                style={{ paddingLeft: '38px' }}
                placeholder="Acme Product Team"
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
            {isSubmitting ? 'Creating account...' : 'Create Account'} <ArrowRight size={18} />
          </button>
        </form>

        <div className="recorder-subtitle" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
          Already have an account?{' '}
          <Link to="/login" className="meeting-card-action-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
