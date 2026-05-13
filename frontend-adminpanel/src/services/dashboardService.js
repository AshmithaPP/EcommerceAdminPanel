import { privateApi } from './api';

const dashboardService = {
    // MAIN API - Loads overview data
    getOverview: async (params = {}) => {
        try {
            const query = typeof params === 'object' ? new URLSearchParams(params).toString() : '';
            const response = await privateApi.get(`/admin/dashboard/overview?${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Chart API - Sales trends
    getSalesTrend: async (params = {}) => {
        try {
            const query = typeof params === 'string' ? `range=${params}` : new URLSearchParams(params).toString();
            const response = await privateApi.get(`/admin/dashboard/sales-trend?${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Top Products API
    getTopProducts: async (params = {}) => {
        try {
            const query = typeof params === 'object' ? new URLSearchParams(params).toString() : `limit=${params}`;
            const response = await privateApi.get(`/admin/dashboard/top-products?${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Advanced Analytics
    getRevenueBreakdown: async () => {
        try {
            const response = await privateApi.get('/admin/dashboard/revenue-breakdown');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getTopCategories: async () => {
        try {
            const response = await privateApi.get('/admin/dashboard/top-categories');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getCustomerInsights: async () => {
        try {
            const response = await privateApi.get('/admin/dashboard/customer-insights');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getPaymentAnalytics: async () => {
        try {
            const response = await privateApi.get('/admin/dashboard/payment-analytics');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getInventoryHealth: async () => {
        try {
            const response = await privateApi.get('/admin/dashboard/inventory-health');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

export default dashboardService;
