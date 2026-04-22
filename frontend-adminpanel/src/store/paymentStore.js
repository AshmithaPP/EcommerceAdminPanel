import { create } from 'zustand';
import paymentService from '../services/paymentService';
import { showToast } from '../utils/toast';

const initialState = {
  payments: [],
  filteredPayments: [], // Derived
  selectedTransaction: null,

  // Flat Pagination
  page: 1,
  limit: 10,
  total: 0,

  // Filters
  activeFilter: 'All',
  searchTerm: '',

  // States
  loading: false,
  listError: null,
};

const usePaymentStore = create((set, get) => ({
  ...initialState,

  // Helper to apply derived filtering
  _applyFilters: (payments) => {
    const { activeFilter, searchTerm } = get();
    let filtered = payments;

    // Filter by status
    if (activeFilter !== 'All') {
      filtered = filtered.filter(p => p.status?.toLowerCase() === activeFilter.toLowerCase());
    }

    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.order_number?.toLowerCase().includes(term) ||
        p.customer_name?.toLowerCase().includes(term) ||
        p.payment_id?.toLowerCase().includes(term)
      );
    }

    return filtered;
  },

  // ---------- Control Actions ----------
  setFilter: (filter) => {
    set({ activeFilter: filter, page: 1 });
    // Update derived state locally if data exists
    const filtered = get()._applyFilters(get().payments);
    set({ filteredPayments: filtered });
  },

  setSearch: (term) => {
    set({ searchTerm: term, page: 1 });
    // Update derived state locally if data exists
    const filtered = get()._applyFilters(get().payments);
    set({ filteredPayments: filtered });
  },

  setPage: (page) => {
    set({ page });
  },

  setSelectedTransaction: (tx) => {
    set({ selectedTransaction: tx });
  },

  resetPaymentState: () => {
    set(initialState);
  },

  // ---------- API Actions ----------

  fetchPayments: async () => {
    const { page, limit, selectedTransaction } = get();
    set({ loading: true, listError: null });

    try {
      const offset = (page - 1) * limit;
      const response = await paymentService.getPayments({ limit, offset });

      if (response.success) {
        const data = response.data;
        const total = response.total;

        // Apply filtering to the new dataset
        const filtered = get()._applyFilters(data);

        // Smart Selection Logic
        let nextSelected = selectedTransaction;
        const exists = data.find(d => d.payment_id === selectedTransaction?.payment_id);
        
        if (!exists) {
          nextSelected = data[0] || null;
        }

        set({
          payments: data,
          filteredPayments: filtered,
          total: total,
          selectedTransaction: nextSelected
        });
      } else {
        const msg = response.message || 'Failed to fetch payments';
        set({ listError: msg });
        showToast.error(msg);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Error fetching payments';
      set({ listError: msg });
      showToast.error(msg);
    } finally {
      set({ loading: false });
    }
  },
}));

export default usePaymentStore;
