import React, { useState, useContext, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import authService from '../../services/authService';
import Button from '../../components/ui/Button';
import styles from './Login.module.css';

const Login = () => {
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [blockedUserId, setBlockedUserId] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForceLogout = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const response = await authService.logout(blockedUserId);
      setSuccess('Sessions cleared successfully. You can now login.');
      setBlockedUserId(null);
    } catch (err) {
      setError('Failed to clear sessions. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.data?.user_id) {
        setBlockedUserId(err.response.data.data.user_id);
        setError(err.response.data.message);
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Login failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.loginWrapper}>
      <main className={styles.mainContainer}>
        {/* Top Branding Anchor */}
        <div className={styles.brandingHeader}>
          <h1 className={styles.brandTitle}>The Silk Curator</h1>
        </div>

        {/* Login Card */}
        <div className={styles.loginCard}>
          {/* Brand Logo/Icon */}
          <div className={styles.iconWrapper}>
            <div className={styles.logoCircle}>
              <span className={styles.logoText}>SC</span>
            </div>
          </div>

          <div className={styles.headerText}>
            <h2 className={styles.headline}>Log In to your account</h2>
            {error && (
              <div style={{ marginTop: '10px' }}>
                <p style={{ color: '#ff4d4f', textAlign: 'center', marginBottom: '5px' }}>{error}</p>
                {blockedUserId && (
                  <button 
                    onClick={handleForceLogout}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#c9a84c', 
                      textDecoration: 'underline', 
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Logout?
                  </button>
                )}
              </div>
            )}
            {success && <p style={{ color: '#52c41a', textAlign: 'center', marginTop: '10px' }}>{success}</p>}
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className={styles.fieldContainer}>
              <label className={styles.fieldLabel} htmlFor="email">Email</label>
              <input 
                className={styles.input} 
                id="email" 
                name="email" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Password Field */}
            <div className={styles.fieldContainer}>
              <label className={styles.fieldLabel} htmlFor="password">Password</label>
              <div className={styles.passwordWrapper}>
                <input 
                  className={styles.input} 
                  id="password" 
                  name="password" 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button 
                  className={styles.visibilityBtn} 
                  type="button"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>
              <div className={styles.forgotPassWrapper}>
                <Link className={styles.forgotLink} to="/reset-password">Forgot password?</Link>
              </div>
            </div>

            {/* CTA Button */}
            <div className={styles.actionRow}>
              <Button 
                type="submit" 
                className={styles.submitBtn}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Logging in..." : "Log In"}
              </Button>
            </div>
          </form>
        </div>
      </main>

      {/* Global Footer */}
      <footer className={styles.globalFooter}>
        <span className={styles.copyright}>© 2024 The Silk Curator. All rights reserved.</span>
      </footer>
    </div>
  );
};

export default Login;
