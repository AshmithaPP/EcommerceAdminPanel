import React from 'react';
import styles from './StatCard.module.css';

/**
 * StatCard Component
 * 
 * @param {string} label - The descriptive title of the statistic
 * @param {string|number} value - The actual data value
 * @param {React.ReactNode} badge - Optional badge element (e.g., % growth or status)
 * @param {React.ReactNode} icon - Optional icon element to display in the header
 */
const StatCard = ({ label, value, badge, icon }) => {
  return (
    <div className={styles.statCard}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        {icon && <div className={styles.iconWrapper}>{icon}</div>}
      </div>
      <div className={styles.body}>
        <div className={styles.valueRow}>
          <h3 className={styles.value}>{value}</h3>
          {badge && <div className={styles.badgeWrapper}>{badge}</div>}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
