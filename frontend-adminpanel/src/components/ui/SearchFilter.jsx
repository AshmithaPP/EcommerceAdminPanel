// SearchFilter.jsx
import React from "react";
import styles from "./SearchFilter.module.css";

const SearchFilter = ({
  placeholder = "Search...",
  searchValue,
  onSearchChange,
  children,
  label,
  className,
}) => {
  return (
    <div className={`${styles.filterSection} ${className || ""}`}>
      <div className={styles.searchContainer}>
        {label && <div className={styles.searchLabel}>{label}</div>}
        <div className={styles.searchWrapper}>
          <svg
            className={styles.searchIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder={placeholder}
            className={styles.searchInput}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            aria-label={label || placeholder}
          />
        </div>
      </div>

      <div className={styles.extraFilters}>{children}</div>
    </div>
  );
};

export default SearchFilter;