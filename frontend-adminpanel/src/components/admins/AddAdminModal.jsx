import React, { useState } from 'react';
import styles from '../../pages/Admins/AdminManagement.module.css';

const AddAdminModal = ({ isOpen, onClose }) => {
  const [selectedRole, setSelectedRole] = useState('manager');

  if (!isOpen) return null;

  const roles = [
    {
      id: 'super_admin',
      name: 'Super Admin',
      features: ['Full access', 'Manage roles', 'Financial logs']
    },
    {
      id: 'manager',
      name: 'Manager',
      features: ['Manage inventory', 'Sales reports', 'Curator approval']
    },
    {
      id: 'support',
      name: 'Support',
      features: ['Customer support', 'Order tracking', 'Refund processing']
    }
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.addModal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h3>Initialize Sub-Admin</h3>
            <p className={styles.modalTagline}>Personnel Onboarding</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className={styles.modalBody}>
          <form onSubmit={e => e.preventDefault()}>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Full Name</label>
                <input 
                  type="text" 
                  className={styles.modalInput} 
                  placeholder="e.g. Julian Varma" 
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Email Address</label>
                <input 
                  type="email" 
                  className={styles.modalInput} 
                  placeholder="julian@thesilkcurator.com" 
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Initial Access Password</label>
              <div className={styles.passwordWrapper}>
                <input 
                  type="password" 
                  className={styles.modalInput} 
                  defaultValue="••••••••••••"
                  style={{ width: '100%' }}
                />
                <span className={`material-symbols-outlined ${styles.eyeIcon}`}>visibility</span>
              </div>
              <p className={styles.fieldHint}>Temporary password will be sent via encrypted internal mail.</p>
            </div>

            <div className={styles.privilegeSection}>
              <label className={styles.fieldLabel}>Privilege Assignment</label>
              <div className={styles.privilegeGrid}>
                {roles.map(role => (
                  <div 
                    key={role.id}
                    className={`${styles.privilegeCard} ${selectedRole === role.id ? styles.privilegeCardActive : ''}`}
                    onClick={() => setSelectedRole(role.id)}
                  >
                    <h4>
                      {role.name}
                      {selectedRole === role.id && (
                        <span className={`material-symbols-outlined ${styles.checkIcon}`}>check_circle</span>
                      )}
                    </h4>
                    <ul className={styles.privilegeList}>
                      {role.features.map((feature, idx) => (
                        <li key={idx} className={styles.privilegeItem}>
                          <span className={`material-symbols-outlined ${styles.itemCheck}`}>check_circle</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className={styles.submitBtn}>
              <span>Create Admin</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAdminModal;
