import React, { useState, useEffect, useMemo } from 'react';
import { 
  Save, 
  Store, 
  Image as ImageIcon, 
  Flag, 
  Upload, 
  Loader2,
  Percent,
  Package,
  Calendar,
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
    heroSettings,
    bannerSettings,
    initialLoading,
    saving,
    uploading,
    hasChanges,
    fetchSettings,
    saveAllSettings,
    uploadAsset,
    updateStoreSettings,
    updateHeroSettings,
    updateBannerSettings,
    setSiteInfo,
    resetStore
  } = useSettingsStore();

  // Modal State (Ephemeral - local only)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempSiteInfo, setTempSiteInfo] = useState({});
  const [tempStoreSettings, setTempStoreSettings] = useState({});
  const [tempHeroSettings, setTempHeroSettings] = useState({});
  const [tempBannerSettings, setTempBannerSettings] = useState({});

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
    setTempHeroSettings({ ...heroSettings });
    setTempBannerSettings({ ...bannerSettings });
    setIsModalOpen(true);
  };

  const handleModalSave = () => {
    setSiteInfo(tempSiteInfo);
    updateStoreSettings(tempStoreSettings);
    updateHeroSettings(tempHeroSettings);
    updateBannerSettings(tempBannerSettings);
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

  const handleImageUpload = async (e, section) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      return; // Error toast handled in store via standard if needed, or component if custom
    }

    const url = await uploadAsset(file, section);
    if (url) {
      if (section === 'hero') {
        updateHeroSettings({ image: url });
      } else {
        updateBannerSettings({ image: url });
      }
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
        <section className={`${styles.settingsCard} ${styles.bannerSettings}`} style={{ gridColumn: 'span 12' }}>
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
        <section className={`${styles.settingsCard} ${styles.storeSettings}`}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Store size={14} /> Store Defaults
            </h2>
            <button className={styles.editAllBtn} onClick={handleEditAllSettings}>
              <Edit2 size={12} /> Edit
            </button>
          </header>
          <div className={styles.sectionContent}>
            <div className={styles.inputGroup}>
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

        {/* 3. Homepage Hero */}
        <section className={`${styles.settingsCard} ${styles.heroSettings}`}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <ImageIcon size={14} /> Homepage Hero Section
            </h2>
            <button className={styles.editAllBtn} onClick={handleEditAllSettings}>
              <Edit2 size={12} /> Edit
            </button>
          </header>
          <div className={styles.sectionContent}>
            <div className={styles.heroLayout}>
              <div className={styles.formControls}>
                <InputBox 
                  label="Hero Title" 
                  value={heroSettings?.title || ''} 
                  onChange={(e) => updateHeroSettings({ title: e.target.value })}
                />
                <InputBox 
                  label="Hero Subtitle" 
                  value={heroSettings?.subtitle || ''} 
                  onChange={(e) => updateHeroSettings({ subtitle: e.target.value })}
                />
                <div className={styles.rowInputs}>
                  <InputBox 
                    label="Button Text" 
                    value={heroSettings?.buttonText || ''} 
                    onChange={(e) => updateHeroSettings({ buttonText: e.target.value })}
                  />
                  <InputBox 
                    label="Button Link" 
                    value={heroSettings?.buttonLink || ''} 
                    onChange={(e) => updateHeroSettings({ buttonLink: e.target.value })}
                  />
                </div>
                <div className={styles.imageUploadWrap}>
                  <label className={styles.uploadTrigger}>
                    {uploading.hero ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                    {heroSettings.image ? 'Change Hero Image' : 'Upload Hero Image'}
                    <input type="file" hidden onChange={(e) => handleImageUpload(e, 'hero')} accept="image/*" />
                  </label>
                </div>
              </div>

              <div className={styles.previewContainer}>
                <span className={styles.previewLabel}>Live Preview</span>
                <div className={styles.heroPreview}>
                  <img src={getImageUrl(heroSettings.image)} alt="Hero" />
                  <div className={styles.heroOverlay}>
                    <div className={styles.heroPreviewTitle}>{heroSettings.title || 'Collection Title'}</div>
                    <div className={styles.heroPreviewSubtitle}>{heroSettings.subtitle || 'Subtitle goes here'}</div>
                    <div className={styles.heroPreviewBtn}>{heroSettings.buttonText || 'Shop Now'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Seasonal Banner */}
        <section className={`${styles.settingsCard} ${styles.bannerSettings}`}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Flag size={14} /> Seasonal Campaign Banner
            </h2>
            <button className={styles.editAllBtn} onClick={handleEditAllSettings}>
              <Edit2 size={12} /> Edit
            </button>
          </header>
          <div className={styles.sectionContent}>
            <div className={styles.bannerLayout}>
              <div className={styles.formControls}>
                <label className={styles.toggleLabel}>
                  <span>Enable Banner</span>
                  <input 
                    type="checkbox" 
                    checked={bannerSettings.enabled} 
                    onChange={(e) => updateBannerSettings({ enabled: e.target.checked })} 
                  />
                </label>
                <div className={`${styles.formControls} ${!bannerSettings.enabled ? styles.disabled : ''}`}>
                  <InputBox 
                    label="Banner Title" 
                    value={bannerSettings.title} 
                    onChange={(e) => updateBannerSettings({ title: e.target.value })}
                  />
                  <InputBox 
                    label="Banner Description" 
                    value={bannerSettings.description} 
                    onChange={(e) => updateBannerSettings({ description: e.target.value })}
                  />
                  <div className={styles.rowInputs}>
                    <InputBox label="Start Date" type="date" value={bannerSettings.startDate} onChange={(e) => updateBannerSettings({ startDate: e.target.value })} Icon={Calendar} />
                    <InputBox label="End Date" type="date" value={bannerSettings.endDate} onChange={(e) => updateBannerSettings({ endDate: e.target.value })} Icon={Calendar} />
                  </div>
                  <div className={styles.imageUploadWrap}>
                    <label className={styles.uploadTrigger}>
                      {uploading.banner ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                      {bannerSettings.image ? 'Change Banner Image' : 'Upload Banner Image'}
                      <input type="file" hidden onChange={(e) => handleImageUpload(e, 'banner')} accept="image/*" />
                    </label>
                  </div>
                </div>
              </div>

              <div className={styles.previewContainer}>
                <span className={styles.previewLabel}>Live Preview</span>
                <div className={`${styles.bannerPreview} ${!bannerSettings.enabled ? styles.bannerPreviewDisabled : ''}`}>
                  <div className={styles.bannerInfo}>
                    <div className={styles.bannerPreviewTitle}>{bannerSettings.title || 'Campaign Name'}</div>
                    <div className={styles.bannerPreviewDesc}>{bannerSettings.description || 'Campaign details...'}</div>
                  </div>
                  <img src={getImageUrl(bannerSettings.image)} className={styles.bannerPreviewImg} alt="Banner" />
                </div>
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

            {/* --- Hero Section --- */}
            <div className={styles.modalSectionDivider}></div>
            <div className={styles.modalSectionTitle}>Homepage Hero</div>
            <div className={styles.modalFullField}>
              <InputBox 
                label="Hero Title" 
                value={tempHeroSettings.title || ''} 
                onChange={(e) => setTempHeroSettings(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className={styles.modalFullField}>
              <InputBox 
                label="Hero Subtitle" 
                value={tempHeroSettings.subtitle || ''} 
                onChange={(e) => setTempHeroSettings(prev => ({ ...prev, subtitle: e.target.value }))}
              />
            </div>
            <div className={styles.modalHalfField}>
              <InputBox 
                label="Button Text" 
                value={tempHeroSettings.buttonText || ''} 
                onChange={(e) => setTempHeroSettings(prev => ({ ...prev, buttonText: e.target.value }))}
              />
            </div>
            <div className={styles.modalHalfField}>
              <InputBox 
                label="Button Link" 
                value={tempHeroSettings.buttonLink || ''} 
                onChange={(e) => setTempHeroSettings(prev => ({ ...prev, buttonLink: e.target.value }))}
              />
            </div>
            <div className={styles.modalFullField}>
               <div className={styles.modalImageField}>
                  <label className={styles.fieldLabel}>Hero Image</label>
                  <div className={styles.modalImageRow}>
                    <img src={getImageUrl(tempHeroSettings.image)} alt="Hero" className={styles.modalImgMini} />
                    <label className={styles.modalUploadIcon}>
                      {uploading.hero ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                      Change Hero Image
                      <input type="file" hidden onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const url = await uploadAsset(file, 'hero');
                          if (url) setTempHeroSettings(prev => ({ ...prev, image: url }));
                        }
                      }} accept="image/*" />
                    </label>
                  </div>
               </div>
            </div>

            {/* --- Banner Section --- */}
            <div className={styles.modalSectionDivider}></div>
            <div className={styles.modalSectionTitle}>Campaign Banner</div>
            <div className={styles.modalFullField}>
              <label className={styles.toggleLabel}>
                <span>Enable Banner</span>
                <input 
                  type="checkbox" 
                  checked={tempBannerSettings.enabled} 
                  onChange={(e) => setTempBannerSettings(prev => ({ ...prev, enabled: e.target.checked }))} 
                />
              </label>
            </div>
            <div className={styles.modalFullField}>
              <InputBox 
                label="Banner Title" 
                value={tempBannerSettings.title || ''} 
                onChange={(e) => setTempBannerSettings(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className={styles.modalFullField}>
              <InputBox 
                label="Banner Description" 
                value={tempBannerSettings.description || ''} 
                onChange={(e) => setTempBannerSettings(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className={styles.modalHalfField}>
              <InputBox label="Start Date" type="date" value={tempBannerSettings.startDate || ''} onChange={(e) => setTempBannerSettings(prev => ({ ...prev, startDate: e.target.value }))} Icon={Calendar} />
            </div>
            <div className={styles.modalHalfField}>
              <InputBox label="End Date" type="date" value={tempBannerSettings.endDate || ''} onChange={(e) => setTempBannerSettings(prev => ({ ...prev, endDate: e.target.value }))} Icon={Calendar} />
            </div>
            <div className={styles.modalFullField}>
               <div className={styles.modalImageField}>
                  <label className={styles.fieldLabel}>Banner Image</label>
                  <div className={styles.modalImageRow}>
                    <img src={getImageUrl(tempBannerSettings.image)} alt="Banner" className={styles.modalImgMini} />
                    <label className={styles.modalUploadIcon}>
                      {uploading.banner ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                      Change Banner Image
                      <input type="file" hidden onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const url = await uploadAsset(file, 'banner');
                          if (url) setTempBannerSettings(prev => ({ ...prev, image: url }));
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
