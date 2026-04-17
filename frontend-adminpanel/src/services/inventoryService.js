import { privateApi } from './api';

const inventoryService = {
    getFullInventory: async (page = 1, limit = 50) => {
        const response = await privateApi.get(`/inventory/variants?page=${page}&limit=${limit}`);
        return response.data;
    },

    manualStockAdjustment: async (variantId, adjustmentData) => {
        const response = await privateApi.post(`/inventory/variants/${variantId}/adjust`, adjustmentData);
        return response.data;
    },

    getInventoryLogs: async (page = 1, limit = 100) => {
        const response = await privateApi.get(`/inventory/logs?page=${page}&limit=${limit}`);
        return response.data;
    },

    getLowStockItems: async (page = 1, limit = 50) => {
        const response = await privateApi.get(`/inventory/low-stock?page=${page}&limit=${limit}`);
        return response.data;
    }
};

export default inventoryService;
