import { privateApi } from './api';

const analyticsService = {
  getSummary: async (params = {}) => {
    const response = await privateApi.get('/analytics/summary', { params });
    return response.data;
  },

  getTrends: async (params = {}) => {
    const response = await privateApi.get('/analytics/trends', { params });
    return response.data;
  },

  getProducts: async () => {
    const response = await privateApi.get('/analytics/products');
    return response.data;
  },

  getCustomers: async (params = {}) => {
    const response = await privateApi.get('/analytics/customers', { params });
    return response.data;
  },

  getInventory: async () => {
    const response = await privateApi.get('/analytics/inventory');
    return response.data;
  }
};

export default analyticsService;
