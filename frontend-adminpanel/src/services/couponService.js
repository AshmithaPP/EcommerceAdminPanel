import { privateApi } from './api';

const couponService = {
    listCoupons: async (params = {}) => {
        const response = await privateApi.get('/coupons', { params });
        return response.data;
    },

    createCoupon: async (couponData) => {
        const response = await privateApi.post('/coupons', couponData);
        return response.data;
    },

    updateCoupon: async (couponId, couponData) => {
        const response = await privateApi.put(`/coupons/${couponId}`, couponData);
        return response.data;
    },

    deleteCoupon: async (couponId) => {
        const response = await privateApi.delete(`/coupons/${couponId}`);
        return response.data;
    },

    getUsageHistory: async (couponId) => {
        const response = await privateApi.get(`/coupons/${couponId}/usage`);
        return response.data;
    }
};

export default couponService;
