import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Pagination.module.css';

const Pagination = ({ totalItems, itemsPerPage, currentPage, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  return (
    <div className={styles.paginationContainer}>
      <div className={styles.info}>
        SHOWING 1 TO {itemsPerPage} OF {totalItems} ENTRIES
      </div>
      <div className={styles.pages}>
        <button className={styles.navBtn} disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
          <ChevronLeft size={16} />
        </button>
        <button className={`${styles.pageBtn} ${styles.active}`}>1</button>
        <button className={styles.pageBtn}>2</button>
        <button className={styles.pageBtn}>3</button>
        <span className={styles.dots}>...</span>
        <button className={styles.pageBtn}>12</button>
        <button className={styles.navBtn} onClick={() => onPageChange(currentPage + 1)}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
