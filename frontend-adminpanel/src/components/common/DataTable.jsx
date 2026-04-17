import React from 'react';
import styles from './DataTable.module.css';

const DataTable = ({ columns, data, rowRenderer }) => {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headerRow}>
            {columns.map((col, index) => (
              <th key={index} className={styles.th} style={{ textAlign: col.align || 'left' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className={styles.row}>
              {rowRenderer(item)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
