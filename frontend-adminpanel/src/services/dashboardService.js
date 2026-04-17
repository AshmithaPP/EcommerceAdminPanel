import { privateApi } from './api';

const dashboardService = {
    getSummary: async () => {
        try {
            const response = await privateApi.get('/admin/dashboard/summary');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getSalesTrend: async () => {
        try {
            const response = await privateApi.get('/admin/dashboard/sales-trend');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getTopProducts: async (limit = 5) => {
        try {
            const response = await privateApi.get(`/admin/dashboard/top-products?limit=${limit}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getAlerts: async () => {
        try {
            const response = await privateApi.get('/admin/dashboard/alerts');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getRecentOrders: async () => {
        try {
            const response = await privateApi.get('/admin/dashboard/recent-orders');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

export default dashboardService;
