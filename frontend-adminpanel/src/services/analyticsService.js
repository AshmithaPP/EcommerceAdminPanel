import { privateApi } from './api';

const analyticsService = {
  getSummary: async () => {
    const response = await privateApi.get('/analytics/summary');
    return response.data;
  },

  getTrends: async (period = 30) => {
    const response = await privateApi.get(`/analytics/trends?period=${period}`);
    return response.data;
  },

  getProducts: async () => {
    const response = await privateApi.get('/analytics/products');
    return response.data;
  },

  getCustomers: async () => {
    const response = await privateApi.get('/analytics/customers');
    return response.data;
  },

  getInventory: async () => {
    const response = await privateApi.get('/analytics/inventory');
    return response.data;
  }
};

export default analyticsService;
