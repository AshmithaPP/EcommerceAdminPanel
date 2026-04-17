import { privateApi } from './api';

const orderService = {
    getAllOrders: async (params) => {
        const response = await privateApi.get('/orders', { params });
        return response.data;
    },

    getOrderById: async (orderId) => {
        const response = await privateApi.get(`/orders/${orderId}`);
        return response.data.data;
    },

    updateOrderStatus: async (orderId, statusData) => {
        const response = await privateApi.patch(`/orders/${orderId}/status`, statusData);
        return response.data;
    },

    updatePaymentStatus: async (orderId, paymentData) => {
        const response = await privateApi.patch(`/orders/${orderId}/payment-status`, paymentData);
        return response.data;
    }
};

export default orderService;
