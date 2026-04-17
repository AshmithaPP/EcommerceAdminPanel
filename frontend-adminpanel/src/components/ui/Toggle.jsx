import React from 'react';
import styles from './Toggle.module.css';

const Toggle = ({ checked, onChange, disabled = false }) => {
  return (
    <label className={styles.switch}>
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={onChange} 
        disabled={disabled}
      />
      <span className={styles.slider}></span>
    </label>
  );
};

export default Toggle;
