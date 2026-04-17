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
};

const Breadcrumbs = () => {
  const location = useLocation();
  
  // Custom logic for dynamic order IDs
  let pathData;
  if (location.pathname.startsWith('/orders/') && location.pathname !== '/orders') {
    pathData = { parent: 'INVENTORY', current: 'ORDER DETAILS' };
  } else if (location.pathname.startsWith('/customers/') && location.pathname !== '/customers') {
    pathData = { parent: 'CUSTOMERS', current: 'PROFILE' };
  } else {
    pathData = routeMap[location.pathname] || { parent: 'ADMIN', current: 'PANEL' };
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
