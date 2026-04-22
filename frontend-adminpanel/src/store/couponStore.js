import { create } from 'zustand';
import couponService from '../services/couponService';
import { showToast } from '../utils/toast';

const initialState = {
  coupons: [],
  filteredCoupons: [], // Derived
  usageHistory: [],
  selectedCoupon: null,

  // Flat Pagination
  page: 1,
  limit: 15,
  total: 0,

  // Filters
  activeTab: 'All', // 'All' | 'Active' | 'Inactive' | 'Expired'
  searchTerm: '',

  // States
  loading: false,
  historyLoading: false,
  actionLoading: false,
  listError: null,
};

const useCouponStore = create((set, get) => ({
  ...initialState,

  // Helper to apply derived filtering
  _applyFilters: (coupons) => {
    const { activeTab } = get();
    const now = new Date();

    return coupons.filter(c => {
      const expiry = c.expiry_date ? new Date(c.expiry_date) : null;
      const isActive = Number(c.is_active) === 1;
      
      if (activeTab === 'All') return true;
      if (activeTab === 'Expired') return expiry && expiry < now;
      if (activeTab === 'Active') return isActive && (!expiry || expiry >= now);
      if (activeTab === 'Inactive') return !isActive && (!expiry || expiry >= now);
      return true;
    });
  },

  // ---------- Control Actions ----------
  setTab: (tab) => {
    set({ activeTab: tab, page: 1 });
    const filtered = get()._applyFilters(get().coupons);
    set({ filteredCoupons: filtered });
  },

  setSearch: (term) => {
    set({ searchTerm: term, page: 1 });
    // Search is handled server-side via fetch, but we update the state here
  },

  setPage: (page) => {
    set({ page });
  },

  setSelectedCoupon: (coupon) => {
    set({ selectedCoupon: coupon });
  },

  resetCouponState: () => {
    set(initialState);
  },

  // ---------- API Actions ----------

  fetchCoupons: async () => {
    const { page, limit, searchTerm } = get();
    set({ loading: true, listError: null });

    try {
      const response = await couponService.listCoupons({ 
        search: searchTerm,
        page,
        limit
      });

      if (response.success) {
        const data = response.data || [];
        const total = response.pagination?.total || data.length;
        const filtered = get()._applyFilters(data);

        set({
          coupons: data,
          filteredCoupons: filtered,
          total: total
        });
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Error fetching coupons';
      set({ listError: msg });
      showToast.error(msg);
    } finally {
      set({ loading: false });
    }
  },

  fetchUsageHistory: async (couponId) => {
    set({ historyLoading: true, usageHistory: [] });
    try {
      const response = await couponService.getUsageHistory(couponId);
      if (response.success) {
        set({ usageHistory: response.data || [] });
      }
    } catch (error) {
      console.error('Failed to fetch usage history:', error);
    } finally {
      set({ historyLoading: false });
    }
  },

  createCoupon: async (payload) => {
    set({ actionLoading: true });
    try {
      const response = await couponService.createCoupon(payload);
      if (response.success) {
        showToast.success('Coupon created successfully');
        await get().fetchCoupons(); // Refresh list
        return true;
      }
      return false;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to create coupon';
      showToast.error(msg);
      return false;
    } finally {
      set({ actionLoading: false });
    }
  },

  updateCoupon: async (id, payload) => {
    set({ actionLoading: true });
    try {
      const response = await couponService.updateCoupon(id, payload);
      if (response.success) {
        showToast.success('Coupon updated successfully');
        await get().fetchCoupons(); // Refresh list
        return true;
      }
      return false;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update coupon';
      showToast.error(msg);
      return false;
    } finally {
      set({ actionLoading: false });
    }
  },

  deleteCoupon: async (id) => {
    set({ actionLoading: true });
    try {
      const response = await couponService.deleteCoupon(id);
      if (response.success) {
        showToast.success('Coupon deleted successfully');
        await get().fetchCoupons(); // Refresh list
        return true;
      }
      return false;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to delete coupon';
      showToast.error(msg);
      return false;
    } finally {
      set({ actionLoading: false });
    }
  },

  toggleCouponActive: async (coupon) => {
    const newStatus = Number(coupon.is_active) === 1 ? 0 : 1;
    try {
      await couponService.updateCoupon(coupon.coupon_id, { is_active: newStatus });
      
      // Update local state optimistically
      const updatedCoupons = get().coupons.map(c => 
        c.coupon_id === coupon.coupon_id ? { ...c, is_active: newStatus } : c
      );
      
      set({ 
        coupons: updatedCoupons,
        filteredCoupons: get()._applyFilters(updatedCoupons)
      });
      
      showToast.success(`Coupon marked as ${newStatus ? 'Active' : 'Inactive'}`);
      return true;
    } catch (error) {
      showToast.error('Status override failed');
      return false;
    }
  }
}));

export default useCouponStore;
