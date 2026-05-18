import { create } from 'zustand';
import adminService from '../services/adminService';
import { showToast } from '../utils/toast';

const useAdminStore = create((set, get) => ({
    admins: [],
    loading: false,
    error: null,

    fetchAdmins: async () => {
        set({ loading: true, error: null });
        try {
            const data = await adminService.listAdmins();
            set({ admins: data, loading: false });
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to fetch admins';
            set({ error: msg, loading: false });
            showToast.error(msg);
        }
    },

    createAdmin: async (adminData) => {
        set({ loading: true });
        try {
            const newAdmin = await adminService.createAdmin(adminData);
            set((state) => ({
                admins: [newAdmin, ...state.admins],
                loading: false
            }));
            showToast.success('Admin user onboarding initialized successfully');
            return true;
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to create admin';
            set({ loading: false });
            showToast.error(msg);
            return false;
        }
    },

    updateAdmin: async (id, adminData) => {
        set({ loading: true });
        try {
            await adminService.updateAdmin(id, adminData);
            await get().fetchAdmins(); // Refresh admin list
            showToast.success('Admin credentials and permissions updated successfully');
            return true;
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to update admin';
            set({ loading: false });
            showToast.error(msg);
            return false;
        }
    },

    toggleStatus: async (id, currentStatus) => {
        const nextStatus = currentStatus === 1 ? 0 : 1;
        try {
            await adminService.toggleStatus(id, nextStatus);
            set((state) => ({
                admins: state.admins.map((admin) =>
                    admin.user_id === id ? { ...admin, status: nextStatus } : admin
                )
            }));
            showToast.success(`Admin user has been successfully ${nextStatus === 1 ? 'activated' : 'suspended'}`);
            return true;
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to change admin status';
            showToast.error(msg);
            return false;
        }
    },

    deleteAdmin: async (id) => {
        try {
            await adminService.deleteAdmin(id);
            set((state) => ({
                admins: state.admins.filter((admin) => admin.user_id !== id)
            }));
            showToast.success('Admin user account successfully deleted');
            return true;
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to delete admin';
            showToast.error(msg);
            return false;
        }
    }
}));

export default useAdminStore;
