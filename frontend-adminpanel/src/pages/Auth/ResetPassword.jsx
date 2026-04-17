import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import styles from './ResetPassword.module.css';

const ResetPassword = () => {
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate email sending
    setEmailSent(true);
  };

  return (
    <div className={styles.pageWrapper}>
      <main className={styles.mainContainer}>
        {/* Top Branding Anchor */}
        <div className={styles.brandingHeader}>
          <h1 className={styles.brandTitle}>The Silk Curator</h1>
        </div>

        {/* Card Container */}
        <div className={styles.card}>
          {/* Brand Logo/Icon */}
          <div className={styles.iconWrapper}>
            <div className={styles.logoCircle}>
              <span className={styles.logoText}>SC</span>
            </div>
          </div>

          {!emailSent ? (
            /* Reset Form State */
            <div className={styles.contentSection}>
              <div className={styles.headerText}>
                <h2 className={styles.headline}>Reset Password</h2>
                <p className={styles.subtext}>Enter your email to receive a reset link</p>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.fieldContainer}>
                  <label className={styles.fieldLabel} htmlFor="email">Email Address</label>
                  <input 
                    className={styles.input} 
                    id="email" 
                    name="email" 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="atelier@silkcurator.com"
                    required 
                  />
                </div>

                <div className={styles.actionRow}>
                  <Button 
                    type="submit" 
                    className={styles.submitBtn}
                  >
                    Send Reset Link
                  </Button>
                </div>
              </form>

              <div className={styles.footerLinkWrapper}>
                <Link className={styles.backLink} to="/login">
                  <ArrowLeft size={14} />
                  <span>Back to Login</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Success State */
            <div className={styles.successSection}>
              <div className={styles.successIconWrapper}>
                <CheckCircle size={48} className={styles.successCheck} />
              </div>
              <h2 className={styles.headline}>Email Sent!</h2>
              <p className={styles.subtext}>
                Please check your inbox for reset instructions.
              </p>
              
              <div className={styles.footerLinkWrapper}>
                <Link className={styles.backLink} to="/login">
                  <ArrowLeft size={14} />
                  <span>Back to Login</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Global Footer */}
      <footer className={styles.globalFooter}>
        <span className={styles.copyright}>© 2024 The Silk Curator. All rights reserved.</span>
      </footer>
    </div>
  );
};

export default ResetPassword;
