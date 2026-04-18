import React from 'react';
import styles from './InputBox.module.css';

/**
 * Reusable InputBox component with floating label design.
 * 
 * @param {string} label - The label text to display on the border.
 * @param {string} error - Error message to display.
 * @param {boolean} required - Whether to show the required asterisk.
 * @param {string} containerClassName - Custom class for the container.
 * @param {string} className - Custom class for the input element.
 */
const InputBox = ({ 
  label, 
  error, 
  required, 
  Icon,
  containerClassName = '', 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`${styles.container} ${containerClassName}`}>
      <div className={styles.inputWrapper}>
        <input
          className={`${styles.input} ${error ? styles.error : ''} ${props.disabled ? styles.disabled : ''} ${Icon ? styles.withIcon : ''} ${className}`}
          {...props}
        />
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

export default InputBox;
