import { create } from 'zustand';
import orderService from '../services/orderService';
import { showToast } from '../utils/toast';

const initialState = {
  orders: [],
  selectedOrder: null,

  // Flat Pagination
  page: 1,
  limit: 10,
  total: 0,

  // Filters
  activeFilter: 'All',
  searchTerm: '',

  // Granular Loading States
  loading: false,       // List
  orderLoading: false,  // Details
  actionLoading: false, // Status updates

  // Granular Error States
  listError: null,
  detailsError: null,
  actionError: null,
};

const useOrderStore = create((set, get) => ({
  ...initialState,

  // ---------- Control Actions (Pure State Updates) ----------
  setFilter: (filter) => {
    set({ activeFilter: filter, page: 1 });
  },

  setSearch: (term) => {
    set({ searchTerm: term, page: 1 });
  },

  setPage: (page) => {
    set({ page });
  },

  resetOrderState: () => {
    set(initialState);
  },

  setSelectedOrder: (order) => {
    set({ selectedOrder: order });
  },

  // ---------- API Actions ----------
  
  // Fetch Order List
  fetchOrders: async () => {
    const { page, limit, activeFilter, searchTerm } = get();
    set({ loading: true, listError: null });

    try {
      const params = {
        page,
        limit,
        status: activeFilter === 'All' ? undefined : activeFilter,
        search: searchTerm || undefined,
      };

      const result = await orderService.getAllOrders(params);

      if (result.success) {
        set({ 
          orders: result.data, 
          total: result.total 
        });
      } else {
        const msg = result.message || 'Failed to fetch orders';
        set({ listError: msg });
        showToast.error(msg);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Error fetching orders';
      set({ listError: msg });
      showToast.error(msg);
    } finally {
      set({ loading: false });
    }
  },

  // Fetch Order Details
  fetchOrderDetails: async (id) => {
    set({ orderLoading: true, detailsError: null });

    try {
      const data = await orderService.getOrderById(id);
      set({ selectedOrder: data });
    } catch (error) {
      const msg = error.response?.data?.message || 'Error fetching order details';
      set({ detailsError: msg });
      showToast.error(msg);
    } finally {
      set({ orderLoading: false });
    }
  },

  // Update Order Status (Optimistic + Local Update)
  updateOrderStatus: async (id, payload) => {
    set({ actionLoading: true, actionError: null });

    try {
      const result = await orderService.updateOrderStatus(id, payload);

      if (result.success) {
        showToast.success(`Order status updated to ${payload.status}`);
        
        // Re-fetch details to get full updated object (including timeline)
        const updatedOrder = await orderService.getOrderById(id);

        set((state) => ({
          selectedOrder: updatedOrder,
          // Optimistically update the list if it exists in store
          orders: state.orders.map((o) =>
            o.order_id === id ? { ...o, status: payload.status } : o
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

export default useOrderStore;
