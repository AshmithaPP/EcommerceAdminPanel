import React from 'react';
import styles from './Badge.module.css';

const Badge = ({ children, variant = 'in-stock', className = '' }) => {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
