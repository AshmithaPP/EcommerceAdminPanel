import { create } from 'zustand';
import { settingsService } from '../services/settingsService';
import { privateApi } from '../services/api';
import toast from 'react-hot-toast';

const initialState = {
  // Settings Blocks
  siteInfo: {}, // Normalized: { [id]: { name, value, type } }
  storeSettings: { gst: 5, default_stock: 10 },
  heroSettings: { image: '', title: '', subtitle: '', buttonText: '', buttonLink: '' },
  bannerSettings: { enabled: false, title: '', description: '', image: '', startDate: '', endDate: '' },

  // Tracking
  initialLoading: true,
  saving: false,
  uploading: { hero: false, banner: false, modal: false },
  hasChanges: false,

  // Errors
  fetchError: null,
  saveError: null,
  uploadError: null,
};

const useSettingsStore = create((set, get) => ({
  ...initialState,

  // ---------- API Actions ----------

  fetchSettings: async () => {
    set({ initialLoading: true, fetchError: null });
    try {
      const res = await settingsService.getAllSettings();
      if (res.success) {
        const data = res.data;

        // Normalize site_info: Array to Object
        const normalizedSiteInfo = {};
        if (data.site_info && Array.isArray(data.site_info)) {
          data.site_info.forEach(item => {
            normalizedSiteInfo[item.id] = {
              name: item.name,
              value: item.value,
              type: item.type
            };
          });
        }

        set({
          siteInfo: normalizedSiteInfo,
          storeSettings: data.store_settings || initialState.storeSettings,
          heroSettings: data.hero_settings || initialState.heroSettings,
          bannerSettings: data.banner_settings || initialState.bannerSettings,
          hasChanges: false
        });
      }
    } catch (error) {
      const msg = 'Failed to load settings';
      set({ fetchError: msg });
      toast.error(msg);
    } finally {
      set({ initialLoading: false });
    }
  },

  saveAllSettings: async () => {
    set({ saving: true, saveError: null });
    const state = get();

    try {
      // Map normalized siteInfo back to expected array format
      const siteInfoArray = Object.entries(state.siteInfo).map(([id, details]) => ({
        id,
        ...details
      }));

      const payload = {
        site_info: siteInfoArray,
        store_settings: state.storeSettings,
        hero_settings: state.heroSettings,
        banner_settings: state.bannerSettings
      };

      const res = await settingsService.updateSettings(payload);
      if (res.success) {
        toast.success('All settings saved successfully');
        set({ hasChanges: false });
      }
    } catch (error) {
      const msg = 'Failed to save settings';
      set({ saveError: msg });
      toast.error(msg);
    } finally {
      set({ saving: false });
    }
  },

  uploadAsset: async (file, section) => {
    // Only handle the API call
    set({ uploading: { ...get().uploading, [section]: true }, uploadError: null });
    
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await privateApi.post('/upload/single', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (res.data.success) {
        return res.data.data.url;
      }
      throw new Error('Upload unsuccessful');
    } catch (error) {
      const msg = error.response?.data?.message || 'Upload failed';
      set({ uploadError: msg });
      toast.error(msg);
      return null;
    } finally {
      set({ uploading: { ...get().uploading, [section]: false } });
    }
  },

  // ---------- Granular Setters (Partial Updates) ----------

  updateStoreSettings: (partial) => {
    set(state => ({
      storeSettings: { ...state.storeSettings, ...partial },
      hasChanges: true
    }));
  },

  updateHeroSettings: (partial) => {
    set(state => ({
      heroSettings: { ...state.heroSettings, ...partial },
      hasChanges: true
    }));
  },

  updateBannerSettings: (partial) => {
    set(state => ({
      bannerSettings: { ...state.bannerSettings, ...partial },
      hasChanges: true
    }));
  },

  updateSiteInfoValue: (id, value) => {
    set(state => {
      if (!state.siteInfo[id]) return state;
      return {
        siteInfo: {
          ...state.siteInfo,
          [id]: { ...state.siteInfo[id], value }
        },
        hasChanges: true
      };
    });
  },

  // Helper only for modal batch updates
  setSiteInfo: (newSiteInfo) => {
    set({ siteInfo: newSiteInfo, hasChanges: true });
  },

  // ---------- Utility ----------

  resetStore: () => {
    set(initialState);
  },
}));

export default useSettingsStore;
