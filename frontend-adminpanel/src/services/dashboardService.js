import { privateApi } from './api';

const dashboardService = {
    // MAIN API - Loads overview data
    getOverview: async () => {
        try {
            const response = await privateApi.get('/admin/dashboard/overview');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Chart API - Sales trends
    getSalesTrend: async (range = '30days') => {
        try {
            const response = await privateApi.get(`/admin/dashboard/sales-trend?range=${range}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Top Products API
    getTopProducts: async (limit = 5) => {
        try {
            const response = await privateApi.get(`/admin/dashboard/top-products?limit=${limit}`);
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
