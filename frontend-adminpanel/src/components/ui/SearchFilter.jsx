import React from 'react';
import styles from './SearchFilter.module.css';

const SearchFilter = ({ 
  placeholder = "Search...", 
  searchValue, 
  onSearchChange, 
  children,
  label,
  className
}) => {
  return (
    <div className={`${styles.filterSection} ${className || ''}`}>
      <div className={styles.searchContainer}>
        <div className={styles.searchWrapper}>
          <input 
            type="text" 
            placeholder={placeholder} 
            className={styles.searchInput}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
      </div>
      <div className={styles.extraFilters}>
        {children}
      </div>
    </div>
  );
};

export default SearchFilter;
