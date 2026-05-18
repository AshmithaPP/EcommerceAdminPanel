import React, { useState, useEffect } from 'react';
import styles from '../../pages/Admins/AdminManagement.module.css';
import useAdminStore from '../../store/adminStore';
import { Eye, EyeOff } from 'lucide-react';
import { modulesRegistry, getPermissionKey } from '../../config/modulesRegistry';

const AddAdminModal = ({ isOpen, onClose, editAdmin = null }) => {
  const { createAdmin, updateAdmin, loading } = useAdminStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('subadmin');
  const [showPassword, setShowPassword] = useState(false);

  // Grouped Permissions
  const [permissions, setPermissions] = useState({});

  // Filter modules that are subadmin-manageable (exclude superadminOnly)
  const subAdminModules = modulesRegistry.filter(m => !m.superAdminOnly);

  useEffect(() => {
    if (isOpen) {
      if (editAdmin) {
        setName(editAdmin.name || '');
        setEmail(editAdmin.email || '');
        setPassword(''); // Always empty on edit unless user fills it
        setRole(editAdmin.role || 'subadmin');
        
        // Load default permissions dynamically
        const loadedPerms = {};
        subAdminModules.forEach(m => {
          const key = getPermissionKey(m.name);
          loadedPerms[key] = editAdmin.permissions?.[key] || [];
        });
        setPermissions(loadedPerms);
      } else {
        // Clear state for new onboarding
        setName('');
        setEmail('');
        setPassword('');
        setRole('subadmin');
        
        const defaultPerms = {};
        subAdminModules.forEach(m => {
          const key = getPermissionKey(m.name);
          defaultPerms[key] = [];
        });
        setPermissions(defaultPerms);
      }
    }
  }, [isOpen, editAdmin]);

  if (!isOpen) return null;

  const handlePermissionChange = (modulePermKey, action) => {
    setPermissions(prev => {
      const currentActions = prev[modulePermKey] || [];
      const updatedActions = currentActions.includes(action)
        ? currentActions.filter(a => a !== action)
        : [...currentActions, action];
      return {
        ...prev,
        [modulePermKey]: updatedActions
      };
    });
  };

  const handleSelectAllModule = (modulePermKey, allowedActions) => {
    const currentActions = permissions[modulePermKey] || [];
    const isAllSelected = currentActions.length === allowedActions.length;
    
    setPermissions(prev => ({
      ...prev,
      [modulePermKey]: isAllSelected ? [] : [...allowedActions]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email) return;
    if (!editAdmin && !password) return;

    const payload = {
      name,
      email,
      role,
      permissions: role === 'superadmin' ? null : permissions
    };

    if (password) {
      payload.password = password;
    }

    let success;
    if (editAdmin) {
      success = await updateAdmin(editAdmin.user_id, payload);
    } else {
      success = await createAdmin(payload);
    }

    if (success) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.addModal} onClick={e => e.stopPropagation()} style={{ maxWidth: '780px', width: '90%' }}>
        <div className={styles.modalHeader}>
          <div>
            <h3>{editAdmin ? 'Edit Admin Credentials' : 'Initialize Curator Onboarding'}</h3>
            <p className={styles.modalTagline}>Role-Based Access Management</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className={styles.modalBody} style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '10px' }}>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Full Name</label>
                <input 
                  type="text" 
                  className={styles.modalInput} 
                  placeholder="e.g. Julian Varma" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Email Address</label>
                <input 
                  type="email" 
                  className={styles.modalInput} 
                  placeholder="julian@silkcurator.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.formGrid} style={{ marginTop: '15px' }}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Role Privilege</label>
                <select 
                  className={styles.modalInput}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="superadmin">Super Admin (Full Unrestricted Access)</option>
                  <option value="subadmin">Sub Admin (Restricted Access Profile)</option>
                </select>
              </div>
              
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  {editAdmin ? 'Change Password (Optional)' : 'Access Password'}
                </label>
                <div className={styles.passwordWrapper} style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    className={styles.modalInput} 
                    placeholder={editAdmin ? 'Leave blank to keep current' : 'Enter login password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!editAdmin}
                    style={{ width: '100%' }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.eyeBtn}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {role === 'subadmin' && (
              <div className={styles.permissionsContainer} style={{ marginTop: '25px' }}>
                <h4 style={{ marginBottom: '15px', fontSize: '15px', color: 'var(--text-primary)', fontWeight: '600' }}>
                  Assign Module Permissions
                </h4>
                
                <div className={styles.permissionsGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
                  {subAdminModules.map((m) => {
                    const modulePermKey = getPermissionKey(m.name);
                    const currentActions = permissions[modulePermKey] || [];
                    const isAllSelected = currentActions.length === m.actions.length;

                    return (
                      <div 
                        key={m.name} 
                        className={styles.modulePermCard}
                        style={{
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '12px',
                          background: 'var(--bg-card-secondary)'
                        }}
                      >
                        <div 
                          className={styles.modulePermHeader}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid var(--border-color)',
                            paddingBottom: '8px',
                            marginBottom: '10px'
                          }}
                        >
                          <span style={{ fontWeight: '600', fontSize: '13.5px', textTransform: 'capitalize', color: 'var(--accent-color)' }}>
                            {m.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSelectAllModule(modulePermKey, m.actions)}
                            style={{
                              fontSize: '11px',
                              background: 'none',
                              border: 'none',
                              color: 'var(--primary-color)',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                          >
                            {isAllSelected ? 'None' : 'All'}
                          </button>
                        </div>

                        <div className={styles.checkboxList} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {m.actions.map((action) => {
                            const isChecked = currentActions.includes(action);
                            return (
                              <label 
                                key={action} 
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  fontSize: '12.5px',
                                  color: 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  textTransform: 'capitalize'
                                }}
                              >
                                <input 
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handlePermissionChange(modulePermKey, action)}
                                />
                                {action}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={loading} style={{ marginTop: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span>{loading ? 'Processing...' : editAdmin ? 'Update Administrator' : 'Create Administrator'}</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAdminModal;
