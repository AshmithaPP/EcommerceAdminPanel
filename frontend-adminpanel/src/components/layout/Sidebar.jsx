import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

const menuItems = [
  { name: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
  { name: 'Products', icon: 'inventory_2', path: '/products' },
  { name: 'Categories', icon: 'category', path: '/categories' },
  { name: 'Orders', icon: 'shopping_bag', path: '/orders' },
  { name: 'Customers', icon: 'group', path: '/customers' },
  { name: 'Payments', icon: 'payments', path: '/payments' },
  { name: 'Inventory', icon: 'inventory_2', path: '/inventory' },
  { name: 'Shipping', icon: 'local_shipping', path: '/shipping' },
  { name: 'Coupons', icon: 'auto_awesome', path: '/marketing' },
  { name: 'Admins', icon: 'admin_panel_settings', path: '/admins' },
];

const Sidebar = ({ isCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const { logout, user } = useContext(AuthContext);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const closeMobile = () => setIsMobileOpen(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      closeMobile();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className={styles.overlay}
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          styles.sidebar,
          isCollapsed ? styles.isCollapsed : '',
          isMobileOpen ? styles.isMobileOpen : '',
        ].filter(Boolean).join(' ')}
      >
        {/* Logo */}
        <div className={styles.logoContainer}>
          {isCollapsed && !isMobileOpen ? (
            <h1 className={styles.brandTitleMini}>SC</h1>
          ) : (
            <>
              <h1 className={styles.brandTitle}>Silk Curator</h1>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className={styles.navMenu}>
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                [styles.navLink, isActive ? styles.activeLink : ''].filter(Boolean).join(' ')
              }
              title={isCollapsed && !isMobileOpen ? item.name : ''}
              onClick={closeMobile}
            >
              <span className={`material-symbols-outlined ${styles.icon}`}>
                {item.icon}
              </span>
              {(!isCollapsed || isMobileOpen) && (
                <span className={styles.linkText}>{item.name}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className={styles.bottomActions}>
          <div className={styles.profileSection}>
            <div className={styles.avatarWrapper}>
              <img 
                src={user?.profile_image || "https://lh3.googleusercontent.com/aida-public/AB6AXuBf0USon3Os1b4D2Zqmsiz4iPwuxWl6zCgsnsFDMpDKDNg5JYUZlFnsx176RghHg5LcQJGeMbqcjJA0x82TBMXdUC2uxl-sJeJ3JIK3gMZ9KVUe_GCRuOybzSMdOSPbib2Add7udK6wwK4H7-s97Liadn-YE_EYiSze05uG-r0VVpff4u-mioVgeOimZ6R3RlChKwOELtq_2v90einIhx7r2sQFCMmOPZXSh5b1KUvB23Ka4xhIT_YJgzjhrLQloh053y2enP-q3uI"} 
                alt={user?.name || "User"} 
              />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user?.name || "Admin Curator"}</span>
                <span className={styles.userRole}>{user?.role || "Administrator"}</span>
              </div>
            )}
          </div>

          <NavLink
            to="/settings"
            className={styles.bottomLink}
            onClick={closeMobile}
          >
            <span className="material-symbols-outlined">settings</span>
            {(!isCollapsed || isMobileOpen) && <span>Settings</span>}
          </NavLink>
          <button 
            className={`${styles.bottomLink} ${styles.logout}`}
            onClick={handleLogout}
            disabled={isLoggingOut}
            style={{ opacity: isLoggingOut ? 0.5 : 1, cursor: isLoggingOut ? 'not-allowed' : 'pointer' }}
          >
            <span className="material-symbols-outlined">
              {isLoggingOut ? 'sync' : 'logout'}
            </span>
            {(!isCollapsed || isMobileOpen) && (
              <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;