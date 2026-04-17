import { privateApi } from './api';

const paymentService = {
    getPayments: async (params = {}) => {
        const { limit = 10, offset = 0 } = params;
        const response = await privateApi.get('/payments', {
            params: { limit, offset }
        });
        return response.data;
    },

    getPaymentById: async (id) => {
        const response = await privateApi.get(`/payments/${id}`);
        return response.data;
    }
};

export default paymentService;
