import React, { useState } from 'react';
import { Edit2, ExternalLink } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import styles from './Settings.module.css';

const Settings = () => {
  // Mock data for settings - in future this will come from an API
  const [settings, setSettings] = useState([
    {
      id: 1,
      name: 'Site URL',
      key: 'site_url',
      value: 'https://silkcurator.com',
      type: 'url'
    },
    {
      id: 2,
      name: 'Website Title',
      key: 'site_title',
      value: 'Silk Curator - Handcrafted Sarees',
      type: 'text'
    },
    {
      id: 3,
      name: 'Website Logo',
      key: 'site_logo',
      value: 'https://silkcurator.com/logo.png',
      type: 'image'
    },
    {
      id: 4,
      name: 'Contact Email',
      key: 'email_id',
      value: 'support@silkcurator.com',
      type: 'email'
    },
    {
      id: 5,
      name: 'Phone Number',
      key: 'phone_number',
      value: '+91 98765 43210',
      type: 'phone'
    },
    {
      id: 6,
      name: 'Office Address',
      key: 'address',
      value: '123, Silk Bazaar, Kanchipuram, Tamil Nadu - 631501',
      type: 'textarea'
    }
  ]);

  const handleEdit = (setting) => {
    // Placeholder for edit functionality
    const newValue = window.prompt(`Edit ${setting.name}:`, setting.value);
    if (newValue !== null) {
      setSettings(prev => prev.map(s => 
        s.id === setting.id ? { ...s, value: newValue } : s
      ));
    }
  };

  return (
    <div className="page-container">
      <div className={styles.settingsContainer}>
        <div className={styles.tableCard}>
          <DataTable
            title="End-User Website Settings"
            data={settings}
            columns={[
              {
                label: 'Setting Name',
                key: 'name',
                width: '250px',
                render: (row) => (
                  <div className={styles.settingInfo}>
                    <span className={styles.settingLabel}>{row.name}</span>
                    <span className={styles.settingKey}>{row.key}</span>
                  </div>
                )
              },
              {
                label: 'Value',
                key: 'value',
                render: (row) => {
                  if (row.type === 'image') {
                    return (
                      <img 
                        src={row.value} 
                        alt="Logo" 
                        className={styles.logoPreview}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/40?text=Logo';
                        }}
                      />
                    );
                  }
                  if (row.type === 'url') {
                    return (
                      <div className={styles.valueCell}>
                        <a href={row.value} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'inherit' }}>
                          {row.value} <ExternalLink size={12} />
                        </a>
                      </div>
                    );
                  }
                  return <div className={styles.valueCell}>{row.value}</div>;
                }
              },
              {
                label: 'Actions',
                key: 'actions',
                align: 'right',
                width: '100px',
                render: (row) => (
                  <div className={styles.actions}>
                    <button 
                      className={styles.actionBtn}
                      onClick={() => handleEdit(row)}
                      title="Edit Setting"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )
              }
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default Settings;
