import { privateApi } from './api';

const orderService = {
    getAllOrders: async (params) => {
        const response = await privateApi.get('/admin/orders', { params });
        return response.data;
    },

    getOrderById: async (orderId) => {
        const response = await privateApi.get(`/admin/orders/${orderId}`);
        return response.data.data;
    },

    updateOrderStatus: async (orderId, statusData) => {
        const response = await privateApi.put(`/admin/orders/${orderId}/status`, statusData);
        return response.data;
    },

    updatePaymentStatus: async (orderId, paymentData) => {
        const response = await privateApi.put(`/admin/orders/${orderId}/payment-status`, paymentData);
        return response.data;
    },

    updateShippingDetails: async (orderId, shippingData) => {
        const response = await privateApi.put(`/admin/orders/${orderId}/shipping`, shippingData);
        return response.data;
    }
};

export default orderService;
