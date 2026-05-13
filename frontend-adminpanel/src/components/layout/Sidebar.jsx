import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

const menuItems = [
  { name: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
  { name: 'Home Management', icon: 'home', path: '/homepage-management' },
  { name: 'Analytics', icon: 'bar_chart', path: '/analytics' },
  { name: 'Products', icon: 'inventory_2', path: '/products' },
  { name: 'Categories', icon: 'category', path: '/categories' },
  { name: 'Filters', icon: 'filter_alt', path: '/attributes' },
  { name: 'Orders', icon: 'shopping_bag', path: '/orders' },
  { name: 'Customers', icon: 'group', path: '/customers' },
  { name: 'Payments', icon: 'payments', path: '/payments' },
  { name: 'Inventory', icon: 'inventory_2', path: '/inventory' },
  { name: 'Shipping', icon: 'local_shipping', path: '/shipping' },
  { name: 'Coupons', icon: 'auto_awesome', path: '/marketing' },
  { name: 'Blogs', icon: 'article', path: '/blogs' },
  { name: 'Admins', icon: 'admin_panel_settings', path: '/admins' },
];

const Sidebar = ({ isCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const closeMobile = () => setIsMobileOpen(false);

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

      </aside>
    </>
  );
};

export default Sidebar;