import React from 'react';
import styles from '../../pages/Admins/AdminManagement.module.css';

const DeactivateModal = ({ isOpen, onClose, adminName, adminId }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.deactivateModal} onClick={e => e.stopPropagation()}>
        <div className={styles.warnBody}>
          <div className={styles.warnIconContainer}>
            <span className={`material-symbols-outlined ${styles.warnIcon}`} style={{ fontVariationSettings: "'FILL' 1" }}>
              warning
            </span>
          </div>
          <h3>Deactivate {adminName}?</h3>
          <p className={styles.warnDesc}>
            This will immediately revoke their access to the curator panel and all pending curation assignments. This action will be logged in the atelier audit trails.
          </p>
          <div className={styles.warnActions}>
            <button className={styles.revokeBtn} onClick={onClose}>
              Revoke Access Now
            </button>
            <button className={styles.cancelBtn} onClick={onClose}>
              Return to Registry
            </button>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <p className={styles.footerId}>Curator ID: {adminId || 'SC-ADM-2940'}</p>
        </div>
      </div>
    </div>
  );
};

export default DeactivateModal;
