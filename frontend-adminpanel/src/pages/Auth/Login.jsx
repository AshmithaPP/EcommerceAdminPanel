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
        {/* Top Branding */}
        <div className={styles.brandingHeader}>
          <h1 className={styles.brandTitle}>Silk Curator</h1>
        </div>

        {/* Login Card */}
        <div className={styles.loginCard}>
          {/* Brand Logo */}
          <div className={styles.iconWrapper}>
            <div className={styles.logoCircle}>
              <span className={styles.logoText}>SC</span>
            </div>
          </div>

          <div className={styles.headerText}>
            <h2 className={styles.headline}>Welcome Back</h2>
            <p className={styles.subHeadline}>Please enter your details to sign in</p>
            
            {error && (
              <div className={styles.errorText}>
                {error}
                {blockedUserId && (
                  <div style={{ marginTop: '4px' }}>
                    <button 
                      onClick={handleForceLogout}
                      className={styles.forceLogoutBtn}
                    >
                      Click here to clear other sessions
                    </button>
                  </div>
                )}
              </div>
            )}
            {success && <div className={styles.successText}>{success}</div>}
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className={styles.fieldContainer}>
              <label className={styles.fieldLabel} htmlFor="email">Email Address</label>
              <input 
                className={styles.input} 
                id="email" 
                name="email" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>

            {/* Password Field */}
            <div className={styles.fieldContainer}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.fieldLabel} htmlFor="password">Password</label>
                <Link className={styles.forgotLink} to="/reset-password">Forgot password?</Link>
              </div>
              <div className={styles.passwordWrapper}>
                <input 
                  className={styles.input} 
                  id="password" 
                  name="password" 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button 
                  className={styles.visibilityBtn} 
                  type="button"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* CTA Button */}
            <div className={styles.actionRow}>
              <Button 
                type="submit" 
                className={styles.submitBtn}
                isLoading={isSubmitting}
              >
                Sign In
              </Button>
            </div>
          </form>
        </div>
      </main>

      {/* Global Footer */}
      <footer className={styles.globalFooter}>
        <span className={styles.copyright}>© 2024 Silk Curator Dashboard. All rights reserved.</span>
      </footer>
    </div>
  );
};

export default Login;
