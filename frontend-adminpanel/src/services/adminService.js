import { privateApi } from './api';

const adminService = {
    listAdmins: async () => {
        const response = await privateApi.get('/admin/users');
        return response.data.data;
    },

    createAdmin: async (adminData) => {
        const response = await privateApi.post('/admin/users', adminData);
        return response.data.data;
    },

    updateAdmin: async (id, adminData) => {
        const response = await privateApi.put(`/admin/users/${id}`, adminData);
        return response.data;
    },

    toggleStatus: async (id, status) => {
        const response = await privateApi.put(`/admin/users/${id}/status`, { status });
        return response.data;
    },

    deleteAdmin: async (id) => {
        const response = await privateApi.delete(`/admin/users/${id}`);
        return response.data;
    }
};

export default adminService;
