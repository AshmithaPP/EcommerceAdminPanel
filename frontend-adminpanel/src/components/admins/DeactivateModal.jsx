import React from 'react';
import styles from '../../pages/Admins/AdminManagement.module.css';
import useAdminStore from '../../store/adminStore';

const DeactivateModal = ({ isOpen, onClose, adminName, adminId, currentStatus }) => {
  const { toggleStatus, loading } = useAdminStore();

  if (!isOpen) return null;

  const handleConfirm = async () => {
    const success = await toggleStatus(adminId, currentStatus);
    if (success) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.deactivateModal} onClick={e => e.stopPropagation()}>
        <div className={styles.warnBody}>
          <div className={styles.warnIconContainer}>
            <span className={`material-symbols-outlined ${styles.warnIcon}`} style={{ fontVariationSettings: "'FILL' 1" }}>
              warning
            </span>
          </div>
          <h3>{currentStatus === 1 ? 'Suspend' : 'Reactivate'} {adminName}?</h3>
          <p className={styles.warnDesc}>
            {currentStatus === 1
              ? 'This will immediately revoke their access to the curator panel, blocking all actions. This action is fully reversible.'
              : 'This will restore their access to the curator panel with all their previously assigned permissions.'}
          </p>
          <div className={styles.warnActions}>
            <button 
              className={styles.revokeBtn} 
              onClick={handleConfirm}
              disabled={loading}
              style={{ background: currentStatus === 1 ? 'var(--danger-color, #ef4444)' : 'var(--success-color, #10b981)' }}
            >
              {loading ? 'Processing...' : currentStatus === 1 ? 'Suspend Access' : 'Restore Access'}
            </button>
            <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Return to Registry
            </button>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <p className={styles.footerId}>Curator ID: {adminId}</p>
        </div>
      </div>
    </div>
  );
};

export default DeactivateModal;
