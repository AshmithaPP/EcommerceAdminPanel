import { publicApi, privateApi } from './api';

const authService = {
    login: async (credentials) => {
        const response = await publicApi.post('/auth/login', credentials);
        return response.data.data;
    },

    signup: async (userData) => {
        const response = await publicApi.post('/auth/signup', userData);
        return response.data.data;
    },

    logout: async (userId = null) => {
        // If userId is provided, it's often a forced logout from the login page (no current access token).
        // Otherwise, it's a standard logout from the sidebar.
        const api = userId ? publicApi : privateApi;
        const response = await api.post('/auth/logout', { user_id: userId });
        return response.data;
    },

    getMe: async () => {
        const response = await privateApi.get('/auth/me');
        return response.data.data;
    },

    refresh: async () => {
        const response = await publicApi.post('/auth/refresh');
        return response.data.data;
    }
};

export default authService;
