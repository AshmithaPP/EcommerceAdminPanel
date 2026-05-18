import { create } from 'zustand';
import { settingsService } from '../services/settingsService';
import { privateApi } from '../services/api';
import toast from 'react-hot-toast';

const initialState = {
  // Settings Blocks
  siteInfo: {}, // Normalized: { [id]: { name, value, type } }
  storeSettings: { gst: 5, default_stock: 10 },
  blogHero: { over_title: '', title: '', subtitle: '', button_text: '', image_url: '' },

  // Tracking
  initialLoading: true,
  saving: false,
  uploading: { modal: false },
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

        set({
          siteInfo: data.site_info || {},
          storeSettings: { ...initialState.storeSettings, ...data.store_settings },
          blogHero: data.blog_hero || { over_title: '', title: '', subtitle: '', button_text: '', image_url: '' },
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
      const payload = {
        site_info: state.siteInfo,
        store_settings: state.storeSettings,
        blog_hero: state.blogHero
      };
      console.log('Sending Save Payload to API:', payload);

      const res = await settingsService.updateSettings(payload);
      if (res.success) {
        toast.success('All settings saved successfully');
        set({ hasChanges: false });
        await get().fetchSettings(); // Re-fetch to ensure sync with DB
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

  updateBlogHero: (partial) => {
    set(state => ({
      blogHero: { ...state.blogHero, ...partial },
      hasChanges: true
    }));
  },

  updateSiteInfoValue: (key, value) => {
    set(state => ({
      siteInfo: {
        ...state.siteInfo,
        [key]: value
      },
      hasChanges: true
    }));
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
