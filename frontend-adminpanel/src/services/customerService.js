import { privateApi } from './api';

const customerService = {
    getAllCustomers: async (params) => {
        const response = await privateApi.get('/customers', { params });
        return response.data;
    },

    getCustomerById: async (userId) => {
        const response = await privateApi.get(`/customers/${userId}`);
        return response.data.data;
    },

    updateCustomer: async (userId, data) => {
        const response = await privateApi.put(`/customers/${userId}`, data);
        return response.data;
    },

    updateStatus: async (userId, status) => {
        const response = await privateApi.put(`/customers/${userId}`, { status });
        return response.data;
    }
};

export default customerService;
