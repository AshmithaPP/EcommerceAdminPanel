import React from 'react';
import styles from './InfoCard.module.css';

/**
 * InfoCard Component
 * 
 * A reusable container for dashboard sections with a StatCard-style header.
 * 
 * @param {string} title - Card title
 * @param {React.ReactNode} children - Main content
 * @param {React.ReactNode} icon - Optional icon for header
 * @param {React.ReactNode} actions - Optional header actions
 */
const InfoCard = ({ title, children, icon, actions }) => {
  return (
    <div className={styles.cardContainer}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.label}>{title}</span>
        </div>
        <div className={styles.headerActions}>
          {actions}
          {icon && <div className={styles.iconWrapper}>{icon}</div>}
        </div>
      </div>
      <div className={styles.body}>
        {children}
      </div>
    </div>
  );
};

export default InfoCard;
