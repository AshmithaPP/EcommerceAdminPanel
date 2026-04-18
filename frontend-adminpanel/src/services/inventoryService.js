import { privateApi } from './api';

const inventoryService = {
    getFullInventory: async (page = 1, limit = 50) => {
        const response = await privateApi.get(`/inventory/variants?page=${page}&limit=${limit}`);
        return response.data;
    },

    restock: async (variantId, { quantity, reason }) => {
        const response = await privateApi.post(`/inventory/variants/${variantId}/restock`, { quantity, reason });
        return response.data;
    },

    setStock: async (variantId, { stock, reason }) => {
        const response = await privateApi.post(`/inventory/variants/${variantId}/set-stock`, { stock, reason });
        return response.data;
    },

    getStockHistory: async (variantId, page = 1, limit = 50) => {
        const response = await privateApi.get(`/inventory/variants/${variantId}/history?page=${page}&limit=${limit}`);
        return response.data;
    },

    getLowStockItems: async (page = 1, limit = 50) => {
        const response = await privateApi.get(`/inventory/low-stock?page=${page}&limit=${limit}`);
        return response.data;
    },

    updateThreshold: async (variantId, threshold) => {
        const response = await privateApi.patch(`/inventory/variants/${variantId}/threshold`, { threshold });
        return response.data;
    }
};

export default inventoryService;
