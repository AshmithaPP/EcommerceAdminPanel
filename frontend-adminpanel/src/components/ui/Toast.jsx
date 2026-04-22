import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import styles from './Toast.module.css';

const Toast = ({ t, message, type = 'success' }) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={20} />;
      case 'error':
        return <XCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'info':
        return <Info size={20} />;
      default:
        return <CheckCircle2 size={20} />;
    }
  };

  return (
    <div
      className={`${styles.toastContainer} ${styles[type]} ${
        t.visible ? styles.animateEnter : styles.animateLeave
      }`}
    >
      <div className={styles.iconContainer}>
        {getIcon()}
      </div>
      <div className={styles.content}>
        <p className={styles.message}>{message}</p>
      </div>
      <button 
        className={styles.closeButton}
        onClick={() => toast.dismiss(t.id)}
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
