import React from 'react';
import styles from './Button.module.css';

const Button = ({ children, onClick, type = 'button', variant = 'primary', size = 'md', className = '', style = {}, isLoading, ...props }) => {
  return (
    <button
      className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className} ${isLoading ? styles.loading : ''}`}
      type={type}
      onClick={isLoading ? null : onClick}
      style={style}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <span className={styles.spinner}></span> : children}
    </button>
  );
};

export default Button;
