import { create } from 'zustand';
import customerService from '../services/customerService';
import { showToast } from '../utils/toast';

const initialState = {
  customers: [],
  selectedCustomer: null,

  // Flat Pagination
  page: 1,
  limit: 10,
  total: 0,

  // Filters
  searchTerm: '',
  statusFilter: 'All', // 'All' | 'Active' | 'Blocked'

  // Granular Loading States
  loading: false,         // List
  detailsLoading: false,  // Single customer
  actionLoading: false,   // Status updates

  // Granular Error States
  listError: null,
  detailsError: null,
  actionError: null,
};

const useCustomerStore = create((set, get) => ({
  ...initialState,

  // ---------- Control Actions (Pure State Updates) ----------
  setSearch: (term) => {
    set({ searchTerm: term, page: 1 });
  },

  setStatusFilter: (filter) => {
    set({ statusFilter: filter, page: 1 });
  },

  setPage: (page) => {
    set({ page });
  },

  resetCustomerState: () => {
    set(initialState);
  },

  // ---------- API Actions ----------

  // Fetch Customer List
  fetchCustomers: async () => {
    const { page, limit, searchTerm, statusFilter } = get();
    set({ loading: true, listError: null });

    try {
      const params = {
        page,
        limit,
        search: searchTerm || undefined,
        status: statusFilter === 'All' ? undefined : (statusFilter === 'Active' ? 1 : 0),
      };

      const response = await customerService.getAllCustomers(params);

      if (response.success) {
        set({
          customers: response.data,
          total: response.total
        });
      } else {
        const msg = response.message || 'Failed to fetch customers';
        set({ listError: msg });
        showToast.error(msg);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Error fetching customers';
      set({ listError: msg });
      showToast.error(msg);
    } finally {
      set({ loading: false });
    }
  },

  // Fetch Customer Details
  fetchCustomerDetails: async (id) => {
    set({ detailsLoading: true, detailsError: null });

    try {
      const data = await customerService.getCustomerById(id);
      set({ selectedCustomer: data });
    } catch (error) {
      const msg = error.response?.data?.message || 'Error fetching customer details';
      set({ detailsError: msg });
      showToast.error(msg);
    } finally {
      set({ detailsLoading: false });
    }
  },

  // Update Customer Status (Optimistic + Local Update)
  updateCustomerStatus: async (id, nextStatus) => {
    set({ actionLoading: true, actionError: null });

    try {
      const result = await customerService.updateStatus(id, nextStatus);

      if (result.success) {
        showToast.success(`Customer ${nextStatus === 1 ? 'activated' : 'blocked'} successfully`);

        set((state) => ({
          // Local update for details view
          selectedCustomer: state.selectedCustomer?.user_id === id 
            ? { ...state.selectedCustomer, status: nextStatus } 
            : state.selectedCustomer,
          
          // Local update for list view
          customers: state.customers.map((c) =>
            c.user_id === id ? { ...c, status: nextStatus } : c
          ),
        }));

        return true;
      }
      return false;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update status';
      set({ actionError: msg });
      showToast.error(msg);
      return false;
    } finally {
      set({ actionLoading: false });
    }
  },
}));

export default useCustomerStore;
