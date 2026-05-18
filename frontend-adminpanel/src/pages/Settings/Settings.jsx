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

import { STORAGE_URL } from '../../config/api';

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
    blogHero,
    initialLoading,
    saving,
    uploading,
    hasChanges,
    fetchSettings,
    saveAllSettings,
    uploadAsset,
    updateStoreSettings,
    updateBlogHero,
    setSiteInfo,
    resetStore
  } = useSettingsStore();

  // Modal State (Ephemeral - local only)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempSiteInfo, setTempSiteInfo] = useState({});
  const [tempStoreSettings, setTempStoreSettings] = useState({});
  const [tempBlogHero, setTempBlogHero] = useState({});

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
    setTempBlogHero({ ...blogHero });
    setIsModalOpen(true);
  };

  const handleModalSave = () => {
    console.log('Saving Modal Data to Store:', tempSiteInfo);
    setSiteInfo(tempSiteInfo);
    updateStoreSettings(tempStoreSettings);
    updateBlogHero(tempBlogHero);
    setIsModalOpen(false);
  };

  const handleTempSiteInfoChange = (key, newValue) => {
    console.log(`Updating Temp Site Info: ${key} = ${newValue}`);
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
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
    const baseUrl = STORAGE_URL.endsWith('/') ? STORAGE_URL.slice(0, -1) : STORAGE_URL;
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${cleanPath}`;
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
                      const imgUrl = getImageUrl(row.value);
                      return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {imgUrl ? (
                                <img 
                                  key={imgUrl}
                                  src={imgUrl} 
                                  alt="logo" 
                                  style={{ 
                                    height: 40, 
                                    maxWidth: 150,
                                    width: 'auto',
                                    borderRadius: 6, 
                                    objectFit: 'contain', 
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc',
                                    padding: '4px'
                                  }} 
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div style={{ 
                                display: imgUrl ? 'none' : 'flex', 
                                height: 40, 
                                width: 40, 
                                borderRadius: 6, 
                                background: '#f1f5f9', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                fontSize: '10px',
                                color: '#94a3b8',
                                border: '1px dashed #cbd5e1'
                              }}>
                                No Logo
                              </div>
                            </div>
                            {row.value && (
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {row.value}
                              </span>
                            )}
                          </div>
                      );
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

        {/* 3. Blog Hero Settings */}
        <section className={styles.settingsCard} style={{ gridColumn: 'span 12' }}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Store size={14} /> Blog Page Hero settings
            </h2>
            <button className={styles.editAllBtn} onClick={handleEditAllSettings}>
              <Edit2 size={12} /> Edit
            </button>
          </header>
          <div className={styles.sectionContent}>
            <div className={styles.inputGroup} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Over Title</span>
                <span style={{ fontSize: '0.9rem', color: '#1e293b' }}>{blogHero.over_title || 'LEGACY OF THE LOOM'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Title</span>
                <span style={{ fontSize: '0.9rem', color: '#1e293b' }}>{blogHero.title || 'Timeless Tradition Woven in Silk'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Subtitle</span>
                <span style={{ fontSize: '0.9rem', color: '#1e293b' }}>{blogHero.subtitle}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Button Text</span>
                <span style={{ fontSize: '0.9rem', color: '#1e293b' }}>{blogHero.button_text || 'Explore Collections'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Hero Image</span>
                {blogHero.image_url ? (
                  <img src={getImageUrl(blogHero.image_url)} alt="Hero Preview" style={{ height: 40, width: 'auto', borderRadius: 4, objectFit: 'contain', border: '1px solid #cbd5e1', background: '#f8fafc' }} />
                ) : (
                  <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>No Image</span>
                )}
              </div>
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
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        {tempSiteInfo[field.key] ? (
                          <img 
                            src={getImageUrl(tempSiteInfo[field.key])} 
                            alt="Preview" 
                            className={styles.modalImgMini} 
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div style={{ 
                          display: tempSiteInfo[field.key] ? 'none' : 'flex', 
                          height: 50, 
                          width: 50, 
                          borderRadius: 6, 
                          background: '#f8fafc', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: '8px',
                          color: '#94a3b8',
                          border: '1px solid #D8DCF0'
                        }}>
                          No Logo
                        </div>
                      </div>
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

            {/* --- Blog Hero Section Divider --- */}
            <div className={styles.modalSectionDivider}></div>
            <div className={styles.modalSectionTitle}>Blog Page Hero Banner</div>
            <div className={styles.modalHalfField}>
              <InputBox 
                label="Over Title" 
                value={tempBlogHero.over_title || ''} 
                onChange={(e) => setTempBlogHero(prev => ({ ...prev, over_title: e.target.value }))}
              />
            </div>
            <div className={styles.modalHalfField}>
              <InputBox 
                label="Title" 
                value={tempBlogHero.title || ''} 
                onChange={(e) => setTempBlogHero(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className={styles.modalFullField}>
              <label className={styles.fieldLabel}>Subtitle</label>
              <textarea 
                className={styles.modalTextarea}
                value={tempBlogHero.subtitle || ''} 
                onChange={(e) => setTempBlogHero(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Enter subtitle..."
                rows={2}
              />
            </div>
            <div className={styles.modalHalfField}>
              <InputBox 
                label="Button Text" 
                value={tempBlogHero.button_text || ''} 
                onChange={(e) => setTempBlogHero(prev => ({ ...prev, button_text: e.target.value }))}
              />
            </div>
            <div className={styles.modalHalfField}>
              <div className={styles.modalImageField}>
                <label className={styles.fieldLabel}>Hero Image</label>
                <div className={styles.modalImageRow}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    {tempBlogHero.image_url ? (
                      <img 
                        src={getImageUrl(tempBlogHero.image_url)} 
                        alt="Preview" 
                        className={styles.modalImgMini} 
                      />
                    ) : (
                      <div style={{ height: 50, width: 50, borderRadius: 6, background: '#f8fafc', border: '1px solid #D8DCF0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#94a3b8' }}>
                        No Image
                      </div>
                    )}
                  </div>
                  <label className={styles.modalUploadIcon}>
                    {uploading.modal ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                    Change
                    <input type="file" hidden onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const url = await uploadAsset(file, 'modal');
                      if (url) {
                        setTempBlogHero(prev => ({ ...prev, image_url: url }));
                      }
                    }} accept="image/*" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default Settings;
