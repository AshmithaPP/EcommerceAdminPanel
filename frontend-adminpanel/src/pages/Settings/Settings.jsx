import React, { useState, useEffect, useMemo } from 'react';
import { 
  Save, 
  Store, 
  Upload, 
  Loader2,
  Percent,
  Package,
  Edit2
} from 'lucide-react';
import useSettingsStore from '../../store/settingsStore';
import InputBox from '../../components/ui/InputBox';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import styles from './Settings.module.css';

const STORAGE_URL = 'http://localhost:5000';

const SITE_INFO_FIELDS = [
  { key: 'site_url', name: 'Site URL', type: 'url' },
  { key: 'site_title', name: 'Website Title', type: 'text' },
  { key: 'site_logo', name: 'Website Logo', type: 'image' },
  { key: 'email', name: 'Contact Email', type: 'email' },
  { key: 'phone', name: 'Phone Number', type: 'phone' },
  { key: 'address', name: 'Office Address', type: 'textarea' }
];

const Settings = () => {
  const {
    siteInfo,
    storeSettings,
    initialLoading,
    saving,
    uploading,
    hasChanges,
    fetchSettings,
    saveAllSettings,
    uploadAsset,
    updateStoreSettings,
    setSiteInfo,
    resetStore
  } = useSettingsStore();

  // Modal State (Ephemeral - local only)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempSiteInfo, setTempSiteInfo] = useState({});
  const [tempStoreSettings, setTempStoreSettings] = useState({});

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Transform flat object to array for DataTable using metadata
  const siteInfoArray = useMemo(() => {
    return SITE_INFO_FIELDS.map(field => ({
      ...field,
      value: siteInfo[field.key] || ''
    }));
  }, [siteInfo]);

  const handleEditAllSettings = () => {
    setTempSiteInfo({ ...siteInfo });
    setTempStoreSettings({ ...storeSettings });
    setIsModalOpen(true);
  };

  const handleModalSave = () => {
    setSiteInfo(tempSiteInfo);
    updateStoreSettings(tempStoreSettings);
    setIsModalOpen(false);
  };

  const handleTempSiteInfoChange = (key, newValue) => {
    setTempSiteInfo(prev => ({
      ...prev,
      [key]: newValue
    }));
  };

  const handleModalImageUpload = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = await uploadAsset(file, 'modal');
    if (url) {
      handleTempSiteInfoChange(key, url);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => resetStore();
  }, [resetStore]);

  const getImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/800x450?text=Upload+Image';
    if (url.startsWith('http')) return url;
    return `${STORAGE_URL}${url}`;
  };

  if (initialLoading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={40} color="#5e35b0" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className={styles.headerSection}>
        <h1 className={styles.headerTitle}>Module Settings</h1>
        <Button 
          onClick={saveAllSettings} 
          isLoading={saving}
          disabled={!hasChanges || saving}
          className={styles.saveBtn}
        >
          <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className={styles.settingsGrid}>
        
        {/* 1. General Site Settings (DataTable) */}
        <section className={styles.settingsCard} style={{ gridColumn: 'span 12' }}>
           <DataTable 
              title="End-User Website Settings"
              data={siteInfoArray}
              actions={
                <button className={styles.editAllBtn} onClick={handleEditAllSettings}>
                  <Edit2 size={14} /> Edit
                </button>
              }
              columns={[
                {
                  label: 'Setting Name',
                  key: 'name',
                  width: '300px',
                  render: (row) => (
                    <div className={styles.settingInfo}>
                      <span style={{ fontWeight: 600 }}>{row.name}</span>
                    </div>
                  )
                },
                {
                  label: 'Current Value',
                  key: 'value',
                  render: (row) => {
                    if (row.type === 'image') {
                      return <img src={getImageUrl(row.value)} alt="logo" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain', border: '1px solid #ddd' }} />;
                    }
                    return <span style={{ fontSize: '0.9rem', color: '#666' }}>{row.value}</span>;
                  }
                }
              ]}
           />
        </section>

        {/* 2. Store Settings */}
        <section className={styles.settingsCard} style={{ gridColumn: 'span 12' }}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Store size={14} /> Store Defaults
            </h2>
            <button className={styles.editAllBtn} onClick={handleEditAllSettings}>
              <Edit2 size={12} /> Edit
            </button>
          </header>
          <div className={styles.sectionContent}>
            <div className={styles.inputGroup} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              <InputBox 
                label="Common GST (%)" 
                type="number" 
                value={storeSettings.gst} 
                onChange={(e) => updateStoreSettings({ gst: e.target.value })}
                Icon={Percent}
              />
              <InputBox 
                label="Default Stock Count" 
                type="number" 
                value={storeSettings.default_stock} 
                onChange={(e) => updateStoreSettings({ default_stock: e.target.value })}
                Icon={Package}
              />
            </div>
          </div>
        </section>

      </div>

      {/* Edit All Settings Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit Website Information"
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>Cancel</button>
            <button onClick={handleModalSave} className={styles.modalSaveBtn}>Done</button>
          </>
        }
      >
        <div className={styles.modalScrollArea}>
          <div className={styles.modalGrid}>
            {/* --- Site Info Section --- */}
            <div className={styles.modalSectionTitle}>Website Identity</div>
            {SITE_INFO_FIELDS.map((field) => (
              <div key={field.key} className={styles.modalField}>
                {field.type === 'image' ? (
                  <div className={styles.modalImageField}>
                    <label className={styles.fieldLabel}>{field.name}</label>
                    <div className={styles.modalImageRow}>
                      <img src={getImageUrl(tempSiteInfo[field.key])} alt="Preview" className={styles.modalImgMini} />
                      <label className={styles.modalUploadIcon}>
                        {uploading.modal ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                        Change
                        <input type="file" hidden onChange={(e) => handleModalImageUpload(e, field.key)} accept="image/*" />
                      </label>
                    </div>
                  </div>
                ) : field.type === 'textarea' ? (
                  <div className={styles.modalFullField}>
                    <label className={styles.fieldLabel}>{field.name}</label>
                    <textarea 
                      className={styles.modalTextarea}
                      value={tempSiteInfo[field.key] || ''}
                      onChange={(e) => handleTempSiteInfoChange(field.key, e.target.value)}
                      placeholder={`Enter ${field.name}...`}
                      rows={3}
                    />
                  </div>
                ) : (
                  <div className={styles.modalHalfField}>
                    <InputBox 
                      label={field.name}
                      type={field.type || 'text'}
                      value={tempSiteInfo[field.key] || ''}
                      onChange={(e) => handleTempSiteInfoChange(field.key, e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* --- Store Defaults Section --- */}
            <div className={styles.modalSectionDivider}></div>
            <div className={styles.modalSectionTitle}>Store Defaults</div>
            <div className={styles.modalHalfField}>
              <InputBox 
                label="Common GST (%)" 
                type="number" 
                value={tempStoreSettings.gst} 
                onChange={(e) => setTempStoreSettings(prev => ({ ...prev, gst: e.target.value }))}
                Icon={Percent}
              />
            </div>
            <div className={styles.modalHalfField}>
              <InputBox 
                label="Default Stock Count" 
                type="number" 
                value={tempStoreSettings.default_stock} 
                onChange={(e) => setTempStoreSettings(prev => ({ ...prev, default_stock: e.target.value }))}
                Icon={Package}
              />
            </div>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default Settings;
