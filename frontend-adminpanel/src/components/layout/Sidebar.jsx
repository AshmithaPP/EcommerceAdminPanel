import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

import { modulesRegistry, getPermissionKey } from '../../config/modulesRegistry';

const Sidebar = ({ isCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const closeMobile = () => setIsMobileOpen(false);
  const { user } = useContext(AuthContext);

  const filteredMenuItems = modulesRegistry.filter(item => {
    if (!user) return false;
    
    // Super Admin has unrestricted access to everything
    if (user.role === 'superadmin' || user.role === 'admin') {
      return true;
    }

    // Sub Admin filtering
    if (user.role === 'subadmin') {
      // If the module is flagged as Super Admin only, sub-admins cannot see it
      if (item.superAdminOnly) {
        return false;
      }

      // Dynamically resolve permission key
      const permKey = getPermissionKey(item.name);
      const perms = user.permissions || {};
      const actions = perms[permKey] || [];

      // Render if the sub-admin has 'view' access for this module
      return actions.includes('view') || actions.includes('update');
    }

    return false;
  });

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
          {filteredMenuItems.map((item) => (
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

      </aside>
    </>
  );
};

export default Sidebar;