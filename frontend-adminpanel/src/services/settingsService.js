import { privateApi } from './api';

export const settingsService = {
  getAllSettings: async () => {
    const response = await privateApi.get('/settings');
    return response.data;
  },

  updateSettings: async (settingsData) => {
    // Current backend supports both PUT and POST
    const response = await privateApi.post('/settings', settingsData);
    return response.data;
  }
};
