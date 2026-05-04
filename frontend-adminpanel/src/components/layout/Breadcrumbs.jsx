import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import styles from './Breadcrumbs.module.css';

const routeMap = {
  '/dashboard': { parent: 'OVERVIEW', current: 'DASHBOARD' },
  '/inventory': { parent: 'INVENTORY', current: 'MANAGEMENT' },
  '/products': { parent: 'INVENTORY', current: 'PRODUCTS' },
  '/products/add': { parent: 'INVENTORY', current: 'ADD PRODUCT' },
  '/products/edit': { parent: 'INVENTORY', current: 'EDIT PRODUCT' },
  '/categories': { parent: 'INVENTORY', current: 'CATEGORY & ATTRIBUTE MANAGEMENT' },
  '/orders': { parent: 'INVENTORY', current: 'ORDER MANAGEMENT' },
  '/customers': { parent: 'CUSTOMERS', current: 'LIST' },
  '/payments': { parent: 'PAYMENTS', current: 'OVERVIEW' },
  '/shipping': { parent: 'SHIPPING', current: 'SHIPPING & DELIVERY' },
  '/admins': { parent: 'ADMINS', current: 'MANAGEMENT' },
  '/homepage-management': { parent: 'HOME', current: 'MANAGEMENT' },
  '/blogs': { parent: 'CMS', current: 'BLOG MANAGEMENT' },
};

const Breadcrumbs = () => {
  const location = useLocation();
  
  // Enhanced logic for dynamic routes
  let pathData;
  const path = location.pathname;

  if (path.startsWith('/products/edit/')) {
    pathData = { parent: 'INVENTORY', current: 'EDIT PRODUCT' };
  } else if (path.startsWith('/products/add')) {
    pathData = { parent: 'INVENTORY', current: 'ADD PRODUCT' };
  } else if (path.startsWith('/orders/') && path !== '/orders') {
    pathData = { parent: 'INVENTORY', current: 'ORDER DETAILS' };
  } else if (path.startsWith('/customers/') && path !== '/customers') {
    pathData = { parent: 'CUSTOMERS', current: 'PROFILE' };
  } else {
    // Exact match from map or default
    pathData = routeMap[path] || { parent: 'ADMIN', current: 'PANEL' };
  }

  return (
    <div className={styles.breadcrumbContainer}>
      <nav className={styles.breadcrumb}>
        <span className={styles.breadcrumbParent}>{pathData.parent}</span>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>{pathData.current}</span>
      </nav>
    </div>
  );
};

export default Breadcrumbs;
