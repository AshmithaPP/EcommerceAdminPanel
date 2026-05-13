import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import styles from './Navbar.module.css';

const Navbar = ({ toggleSidebar, isSidebarOpen }) => {
  const { logout, user } = useContext(AuthContext);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoggingOut(false);
      setIsProfileOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={styles.navbar}>
      <div className={styles.leftSection}>
        <button
          className={styles.hamburger}
          onClick={toggleSidebar}
          aria-label="Toggle menu"
          aria-expanded={isSidebarOpen}
        >
          <span className="material-symbols-outlined">
            {isSidebarOpen ? 'close' : 'menu'}
          </span>
        </button>
        <h1 className={styles.brandTitle}>The Silk Curator</h1>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.actionItems}>
          <div className={styles.notificationWrapper}>
            <span className="material-symbols-outlined">notifications</span>
            <span className={styles.notificationDot}></span>
          </div>

          <div className={styles.profileContainer} ref={dropdownRef}>
            <div 
              className={styles.profileTrigger} 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user?.name || "Admin"}</span>
                <span className={styles.userRole}>{user?.role || "Administrator"}</span>
              </div>
              <div className={styles.avatarWrapper}>
                <img
                  src={user?.profile_image || "https://lh3.googleusercontent.com/aida-public/AB6AXuBf0USon3Os1b4D2Zqmsiz4iPwuxWl6zCgsnsFDMpDKDNg5JYUZlFnsx176RghHg5LcQJGeMbqcjJA0x82TBMXdUC2uxl-sJeJ3JIK3gMZ9KVUe_GCRuOybzSMdOSPbib2Add7udK6wwK4H7-s97Liadn-YE_EYiSze05uG-r0VVpff4u-mioVgeOimZ6R3RlChKwOELtq_2v90einIhx7r2sQFCMmOPZXSh5b1KUvB23Ka4xhIT_YJgzjhrLQloh053y2enP-q3uI"}
                  alt={user?.name || "User"}
                />
              </div>
              <span className={`material-symbols-outlined ${styles.chevron}`}>
                {isProfileOpen ? 'expand_less' : 'expand_more'}
              </span>
            </div>

            {isProfileOpen && (
              <div className={styles.dropdownPopup}>
                <div className={styles.dropdownHeader}>
                  <p className={styles.dropdownName}>{user?.name}</p>
                  <p className={styles.dropdownEmail}>{user?.email}</p>
                </div>
                <div className={styles.dropdownDivider}></div>
                <button 
                  className={styles.logoutBtn} 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <span className="material-symbols-outlined">
                    {isLoggingOut ? 'sync' : 'logout'}
                  </span>
                  <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;