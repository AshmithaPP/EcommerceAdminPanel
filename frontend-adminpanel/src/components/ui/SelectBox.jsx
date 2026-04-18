import React from 'react';
import styles from './SelectBox.module.css';

/**
 * Reusable SelectBox component with floating label design.
 * 
 * @param {string} label - The label text to display on the border.
 * @param {Array} options - Optional array of { value, label } to render.
 * @param {string} error - Error message to display.
 * @param {boolean} required - Whether to show the required asterisk.
 * @param {string} containerClassName - Custom class for the container.
 * @param {string} className - Custom class for the select element.
 * @param {React.ReactNode} children - Optional manual options.
 */
const SelectBox = ({ 
  label, 
  options = [], 
  error, 
  required, 
  Icon,
  containerClassName = '', 
  className = '', 
  children,
  ...props 
}) => {
  return (
    <div className={`${styles.container} ${containerClassName}`}>
      <div className={styles.selectWrapper}>
        <select
          className={`${styles.select} ${error ? styles.error : ''} ${props.disabled ? styles.disabled : ''} ${Icon ? styles.withIcon : ''} ${className}`}
          {...props}
        >
          {children ? children : (
            <>
              <option value="" disabled hidden>Select {label}</option>
              {options.map((opt, idx) => (
                <option key={idx} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </>
          )}
        </select>
        {Icon && (
          <div className={styles.iconWrapper}>
            <Icon size={18} className={styles.fieldIcon} />
          </div>
        )}
      </div>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
};

export default SelectBox;
