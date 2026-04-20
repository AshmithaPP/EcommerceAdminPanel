import React from 'react';
import { Plus } from 'lucide-react';
import styles from './DataTable.module.css';

/**
 * DataTable Component
 * 
 * A reusable, high-fidelity table component with zebra-striping and header sections.
 * 
 * @param {string} title - Table title for the header
 * @param {Array} columns - Column definitions: { label, key, align, width, render }
 * @param {Array} data - Data array
 * @param {React.ReactNode} actions - Optional header actions (like "View All" button)
 * @param {Function} onAdd - Optional callback for an "Add" action (shows '+' icon)
 * @param {string} emptyMessage - Message to show if no data
 */
const DataTable = ({ 
  title, 
  columns, 
  data, 
  actions, 
  onAdd,
  emptyMessage = "No data available" 
}) => {
  return (
    <div className={styles.tableContainer}>
      {/* Header matching StatCard and TrendChart style */}
      <div className={styles.header}>
        <span className={styles.label}>{title}</span>
        <div className={styles.actions}>
          {actions}
          {onAdd && (
            <button 
              className={styles.addIconBtn} 
              onClick={onAdd}
              type="button"
              title="Add New"
            >
              <Plus size={14} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          {/* colgroup: enforces explicit column widths so header & body stay in sync */}
          <colgroup>
            {columns.map((col, idx) => (
              <col key={idx} style={col.width ? { width: col.width, minWidth: col.width } : {}} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className={col.align === 'center' ? styles.thCenter : col.align === 'right' ? styles.thRight : ''}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((row, rowIdx) => (
                <tr key={rowIdx} className={rowIdx % 2 === 1 ? styles.stripedRow : ''}>
                  {columns.map((col, colIdx) => (
                    <td 
                      key={colIdx} 
                      className={col.align === 'center' ? styles.tdCenter : col.align === 'right' ? styles.tdRight : ''}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className={styles.emptyTable}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
